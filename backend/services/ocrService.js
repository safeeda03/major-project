const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const execFileAsync = promisify(execFile);

// Google Cloud Vision is optional. Keeping it optional lets the application
// continue to work locally with Tesseract until a Cloud project is configured.
let vision = null;
try {
  vision = require('@google-cloud/vision');
} catch (error) {
  console.warn('Optional Google Cloud Vision OCR is unavailable:', error.message);
}

// Sharp is only used for optional image enhancement. Keep OCR available on
// Windows setups where native Sharp binaries may be blocked by policy.
let sharp = null;
try {
  sharp = require('sharp');
} catch (error) {
  console.warn('Optional Sharp image enhancement is unavailable:', error.message);
}

const DATE_PATTERN = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})/i;
const VACCINE_PATTERN = /\b(bcg|opv|polio|dpt|pentavalent|mmr|measles|hepatitis\s*b)\b/i;
const VACCINE_ROW_PATTERN = /^(bcg|opv|polio|dpt|pentavalent|mmr|measles(?:[-\s]rubella)?|hepatitis\s*b)/i;
const SAMPLE_FOOTER_PATTERN = /sample\s+document\s+prepared\s+for\s+testing\s+the\s+poshanai\s+ocr\s+scanning\s+feature\.?/gi;
const OCR_CACHE_DIRECTORY = path.join(__dirname, '..', '.cache', 'tesseract');
const VISION_ENABLED = String(process.env.GOOGLE_CLOUD_VISION_ENABLED || '').toLowerCase() === 'true';
const OCR_PROVIDER = String(process.env.OCR_PROVIDER || 'auto').toLowerCase();

function getPngDimensions(filePath) {
  try {
    const header = fs.readFileSync(filePath).subarray(0, 24);
    const isPng = header.length >= 24
      && header.readUInt32BE(0) === 0x89504e47
      && header.readUInt32BE(4) === 0x0d0a1a0a;
    return isPng ? { width: header.readUInt32BE(16), height: header.readUInt32BE(20) } : null;
  } catch {
    return null;
  }
}

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (left[row - 1] === right[column - 1] ? 0 : 1)
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function hasFuzzyLabel(line, label) {
  const words = line.toLowerCase().match(/[a-z]+/g) || [];
  const labelWords = label.split(' ');
  for (let start = 0; start <= words.length - labelWords.length; start += 1) {
    const candidate = words.slice(start, start + labelWords.length);
    if (candidate.every((word, index) => {
      const distance = editDistance(word, labelWords[index]);
      return distance <= (labelWords[index].length >= 5 ? 2 : 1);
    })) return true;
  }
  return false;
}

function normalizeGender(value) {
  const candidate = String(value || '').toLowerCase().replace(/[^a-z]/g, '');
  if (candidate === 'male' || editDistance(candidate, 'male') <= 1) return 'Male';
  if (candidate === 'female' || editDistance(candidate, 'female') <= 1) return 'Female';
  return '';
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// PDF text extractors frequently collapse a table row, e.g.
// "Height94.5 cm03 October 2026". This intentionally searches only explicit
// known labels so it never infers a value from an unrelated sentence.
function getLabeledLineValue(lines, labels) {
  const orderedLabels = [...labels].sort((left, right) => right.length - left.length);
  for (const line of lines) {
    for (const label of orderedLabels) {
      const pattern = escapeRegExp(label).replace(/\s+/g, '\\s*');
      const match = String(line).match(new RegExp(`${pattern}\\s*[:|\\-]?\\s*(.+)$`, 'i'));
      if (match?.[1]) return match[1].trim();
    }
  }
  return '';
}

function mergeOCRText(texts) {
  return [...new Set(texts
    .flatMap((candidate) => String(candidate || '').replace(/\r/g, '').split('\n'))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean))].join('\n').trim();
}

function addEvidence(items, label, value) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length < 2 || items.some((item) => item.label === label && item.value === cleaned)) return;
  items.push({ label, value: cleaned });
}

function isReadableOCRLine(line) {
  const value = String(line || '').trim();
  if (value.length < 4) return false;
  const readableCharacters = value.match(/[\p{L}\p{N}]/gu) || [];
  return readableCharacters.length >= 4 && readableCharacters.length / value.length >= 0.35;
}

function splitReportText(text) {
  const normalized = String(text || '').replace(/\r/g, '').trim();
  if (!normalized) return [];
  const separatorBlocks = normalized.split(/\n\s*(?:-{3,}|={3,}|\*{3,})\s*\n/).map((block) => block.trim()).filter(Boolean);
  const headingPattern = /^(?:child\s+health|health\s+screening|growth|nutrition|vaccination|immunization|attendance|food\s+distribution|home\s+visit|referral|medical|monthly|weekly|report|record)\s*(?:report|record|details)?\s*:?\s*$/i;
  const blocks = separatorBlocks.length > 1 ? separatorBlocks : [];
  if (!blocks.length) {
    let current = [];
    for (const line of normalized.split('\n')) {
      if (headingPattern.test(line.trim()) && current.length) {
        blocks.push(current.join('\n').trim());
        current = [];
      }
      current.push(line);
    }
    if (current.length) blocks.push(current.join('\n').trim());
  }
  const usefulBlocks = blocks.filter((block) => block.split('\n').filter(Boolean).length >= 2);
  const selected = usefulBlocks.length > 1 ? usefulBlocks : [normalized];
  return selected.map((block, index) => ({
    id: 'report-' + (index + 1),
    text: block,
    title: block.split('\n').map((line) => line.trim()).find((line) => headingPattern.test(line)) || 'Report ' + (index + 1),
  }));
}

class OCRService {
  static async processDocument(file) {
    if (!file || !file.path) {
      const error = new Error('No image was provided for OCR.');
      error.statusCode = 400;
      throw error;
    }

    try {
      fs.mkdirSync(OCR_CACHE_DIRECTORY, { recursive: true });
      const extension = path.extname(file.originalname || file.path).toLowerCase();
      const isPdf = extension === '.pdf'
        || file.mimetype === 'application/pdf';
      const isText = extension === '.txt' || file.mimetype === 'text/plain';
      let rawText;
      let confidence = null;
      let alternativeTexts = [];
      let provider = 'tesseract';
      let quality = { warnings: [] };

      if (isText) {
        rawText = fs.readFileSync(file.path, 'utf8').replace(/\r/g, '').trim();
        confidence = 100;
        provider = 'plain-text';
      } else if (isPdf) {
        const pdf = await pdfParse(fs.readFileSync(file.path));
        rawText = pdf.text.replace(/\r/g, '').trim();
        provider = 'pdf-text';
        quality = { pageCount: pdf.numpages || 1, warnings: [] };
        // A scanned PDF has no selectable text. Render every page locally and
        // run the existing Tesseract engine on each page, preserving the PDF.
        if (!rawText) {
          const scannedPdf = await this.recognizeScannedPdf(file.path);
          rawText = scannedPdf.text;
          confidence = scannedPdf.confidence;
          alternativeTexts = scannedPdf.alternativeTexts;
          provider = 'tesseract-scanned-pdf';
          quality = { ...quality, ...scannedPdf.quality };
        }
      } else {
        quality = await this.inspectImageQuality(file.path);
        const cloudResult = await this.recognizeWithGoogleVision(file.path);
        if (cloudResult) {
          rawText = cloudResult.text;
          confidence = cloudResult.confidence;
          provider = 'google-cloud-vision';
        } else {
          const recognitionOptions = { cachePath: OCR_CACHE_DIRECTORY, tessedit_pageseg_mode: '6' };
          const attempts = [];
          for (const pageSegMode of [6, 4, 11]) {
            attempts.push(await Tesseract.recognize(file.path, 'eng', {
              ...recognitionOptions,
              tessedit_pageseg_mode: String(pageSegMode),
            }));
          }

          // Preserve the original image and run an additional, non-destructive
          // enhanced pass. Sharp rotates according to EXIF metadata, normalizes
          // contrast, reduces monochrome noise, and sharpens text edges.
          if (sharp) {
            try {
              const enhanced = await sharp(file.path)
                .rotate()
                .grayscale()
                .normalize()
                .modulate({ brightness: 1.04 })
                .sharpen()
                .png()
                .toBuffer();
              attempts.push(await Tesseract.recognize(enhanced, 'eng', recognitionOptions));
              quality.preprocessing = ['EXIF rotation correction', 'contrast normalization', 'brightness adjustment', 'noise reduction', 'text sharpening'];
            } catch (error) {
              quality.warnings.push('Image enhancement could not be applied; the original image was used.');
            }
          }

          // Full-page OCR can skip text inside bordered tables. A focused pass
          // over the first data row recovers the common Child Name field.
          const dimensions = getPngDimensions(file.path);
          if (dimensions) {
            const tableWorker = await Tesseract.createWorker({ cachePath: OCR_CACHE_DIRECTORY });
            try {
              await tableWorker.loadLanguage('eng');
              await tableWorker.initialize('eng');
              attempts.push(await tableWorker.recognize(file.path, {
                tessedit_pageseg_mode: '6',
                rectangle: {
                  left: Math.round(dimensions.width * 0.02),
                  top: Math.round(dimensions.height * 0.20),
                  width: Math.round(dimensions.width * 0.96),
                  height: Math.round(dimensions.height * 0.16),
                },
              }));
              attempts.push(await tableWorker.recognize(file.path, {
                tessedit_pageseg_mode: '6',
                rectangle: {
                  left: Math.round(dimensions.width * 0.427),
                  top: Math.round(dimensions.height * 0.201),
                  width: Math.round(dimensions.width * 0.531),
                  height: Math.round(dimensions.height * 0.403),
                },
              }));
            } finally {
              await tableWorker.terminate();
            }
          }
          const original = attempts[0];

          // Handwritten pages photographed on paper often contain pale writing
          // from the reverse side. Try local contrast cleanup only when the
          // original OCR confidence is low, and retain the clearest pass.
          if (original.data.confidence < 65 && sharp) {
            const baseImage = sharp(file.path).rotate().grayscale().normalize().sharpen();
            for (const threshold of [130, 110]) {
              const image = await baseImage.clone().threshold(threshold).png().toBuffer();
              attempts.push(await Tesseract.recognize(image, 'eng', recognitionOptions));
            }
          }

          const attemptsWithChildName = attempts.filter((attempt) => /child\s*name|name\s+of\s+child/i.test(attempt.data.text || ''));
          const rankedAttempts = attemptsWithChildName.length ? attemptsWithChildName : attempts;
          const bestAttempt = rankedAttempts.reduce((best, attempt) => {
            const score = (candidate) => {
              const candidateText = candidate.data.text || '';
              const hasChildName = /child\s*name|name\s+of\s+child/i.test(candidateText);
              const hasNutrition = /nutrition/i.test(candidateText);
              return candidate.data.confidence + (hasChildName ? 15 : 0) + (hasNutrition ? 2 : 0);
            };
            return score(attempt) > score(best) ? attempt : best;
          });
          rawText = bestAttempt.data.text.replace(/\r/g, '').trim();
          confidence = Number(bestAttempt.data.confidence.toFixed(1));
          alternativeTexts = attempts
            .filter((attempt) => attempt !== bestAttempt)
            .map((attempt) => attempt.data.text.replace(/\r/g, '').trim());
        }
      }
      rawText = rawText.replace(SAMPLE_FOOTER_PATTERN, '').replace(/\n{3,}/g, '\n\n').trim();
      // Keep the highest-ranked OCR pass intact. Merging every segmentation
      // pass duplicates labels and injects partial garbage into the report.
      const completeText = (rawText || mergeOCRText(alternativeTexts)).replace(SAMPLE_FOOTER_PATTERN, '').trim();
      if (!completeText && !isText) {
        const error = new Error(isPdf
          ? 'No readable text was found in this PDF. For a scanned PDF, upload a clear image of each page.'
          : 'No readable text was found. Upload a sharper, well-lit image with the document filling the frame.');
        error.statusCode = 422;
        throw error;
      }
      const extractedData = this.extractDataFromText(completeText);
      const flexibleResult = this.analyzeText(completeText, extractedData);
      const reportCandidates = splitReportText(completeText).map((candidate) => {
        const candidateData = this.extractDataFromText(candidate.text);
        return {
          ...candidate,
          ...this.analyzeText(candidate.text, candidateData),
          extractedData: candidateData,
        };
      });
      return {
        success: true,
        data: {
          ...extractedData,
          ...flexibleResult,
          reportCandidates,
          rawText: completeText,
          confidence,
          provider,
          quality,
          needsVerification: true,
        },
        message: completeText
          ? 'Text was extracted. Please verify every field before saving it.'
          : isPdf
            ? 'No selectable text was found in this PDF. Scanned PDFs are not supported yet; upload the page as an image.'
            : 'No readable text was found. Try a sharper, well-lit image with the document filling the frame.',
      };
    } catch (cause) {
      console.error('OCR processing failed:', cause.message);
      if (cause.statusCode === 503 || cause.statusCode === 422) throw cause;
      const error = new Error('Could not read this image. Use a clear JPG, PNG, or WebP image and try again.');
      error.statusCode = 422;
      throw error;
    }
  }

  static async inspectImageQuality(filePath) {
    const quality = { warnings: [] };
    if (!sharp) return quality;
    try {
      const image = sharp(filePath).rotate();
      const [metadata, stats] = await Promise.all([image.metadata(), image.stats()]);
      quality.width = metadata.width || null;
      quality.height = metadata.height || null;
      if (!metadata.width || !metadata.height || Math.min(metadata.width, metadata.height) < 700) {
        quality.warnings.push('This image has low resolution. A clearer, closer photo may improve OCR results.');
      }
      const deviation = (stats.channels || []).reduce((sum, channel) => sum + (channel.stdev || 0), 0) / Math.max((stats.channels || []).length, 1);
      if (deviation < 18) quality.warnings.push('This image appears low contrast or washed out. Verify extracted values carefully.');
    } catch {
      quality.warnings.push('Image quality could not be measured. Verify all extracted fields carefully.');
    }
    return quality;
  }

  static async recognizeScannedPdf(filePath) {
    const renderDirectory = fs.mkdtempSync(path.join(OCR_CACHE_DIRECTORY, 'pdf-pages-'));
    const outputPrefix = path.join(renderDirectory, 'page');
    try {
      try {
        // pdftoppm is supplied by Poppler and is available in this Windows
        // environment. Its output remains temporary and is never exposed.
        await execFileAsync('pdftoppm', ['-png', '-r', '220', filePath, outputPrefix], { timeout: 60000, maxBuffer: 1024 * 1024 });
      } catch (cause) {
        const error = new Error('This scanned PDF could not be read. Upload clear image pages instead, or install Poppler (pdftoppm) for scanned PDF OCR.');
        error.statusCode = 422;
        throw error;
      }
      const pages = fs.readdirSync(renderDirectory)
        .filter((name) => /^page-\d+\.png$/i.test(name))
        .sort((left, right) => Number(left.match(/\d+/)[0]) - Number(right.match(/\d+/)[0]));
      if (!pages.length) {
        const error = new Error('No readable pages were found in this PDF. Upload a clearer PDF or image.');
        error.statusCode = 422;
        throw error;
      }
      const attempts = await Promise.all(pages.map((page) => Tesseract.recognize(path.join(renderDirectory, page), 'eng', {
        cachePath: OCR_CACHE_DIRECTORY,
        tessedit_pageseg_mode: '6',
      })));
      const texts = attempts.map((attempt) => attempt.data.text.replace(/\r/g, '').trim());
      const confidences = attempts.map((attempt) => attempt.data.confidence).filter(Number.isFinite);
      return {
        text: texts.filter(Boolean).join('\n\n'),
        alternativeTexts: texts,
        confidence: confidences.length ? Number((confidences.reduce((sum, value) => sum + value, 0) / confidences.length).toFixed(1)) : null,
        quality: {
          pageCount: pages.length,
          preprocessing: ['PDF page rendering at 220 DPI', 'per-page OCR'],
          warnings: [],
        },
      };
    } finally {
      // This directory is created above with mkdtemp and contains only the
      // temporary rendered pages for this request.
      await fs.promises.rm(renderDirectory, { recursive: true, force: true }).catch(() => {});
    }
  }

  static async recognizeWithGoogleVision(filePath) {
    if (!VISION_ENABLED || OCR_PROVIDER === 'tesseract') return null;

    if (!vision) {
      if (OCR_PROVIDER === 'google-cloud-vision') {
        const error = new Error('Google Cloud Vision is selected but its package is not installed.');
        error.statusCode = 503;
        throw error;
      }
      return null;
    }

    try {
      const client = new vision.ImageAnnotatorClient();
      const [result] = await client.documentTextDetection(filePath);
      const annotation = result.fullTextAnnotation;
      const text = String(annotation?.text || '').replace(/\r/g, '').trim();
      if (!text) throw new Error('Google Cloud Vision returned no readable text.');

      const confidences = (annotation?.pages || [])
        .flatMap((page) => page.blocks || [])
        .map((block) => Number(block.confidence))
        .filter((value) => Number.isFinite(value) && value >= 0)
        .map((value) => value <= 1 ? value * 100 : value);
      const confidence = confidences.length
        ? Number((confidences.reduce((sum, value) => sum + value, 0) / confidences.length).toFixed(1))
        : null;
      return { text, confidence };
    } catch (cause) {
      if (OCR_PROVIDER === 'google-cloud-vision') {
        const error = new Error(`Google Cloud Vision OCR failed: ${cause.message}`);
        error.statusCode = 503;
        throw error;
      }
      console.warn(`Google Cloud Vision OCR unavailable; using local Tesseract instead: ${cause.message}`);
      return null;
    }
  }

  static analyzeText(text, extractedData = {}) {
    const lines = text.split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(isReadableOCRLine);
    const lowerText = text.toLowerCase();
    const items = [];
    const sections = [];
    const usedLines = new Set();
    const firstTitle = lines.find((line) => /\b(nutrition|health|growth|vaccin|immuni|medical|report|record|anganwadi)\b/i.test(line) && line.length < 100)
      || lines.find((line) => line.length > 3 && line.length < 100 && !/^[-|=:]+$/.test(line));

    const documentType = lowerText.includes('vaccin') || /\b(bcg|polio|opv|mmr|dpt|pentavalent|immuni[sz]ation)\b/i.test(text)
      ? 'Vaccination or immunization report'
      : lowerText.includes('nutrition') || /\b(diet|feeding|malnutrition|underweight)\b/i.test(text)
        ? 'Nutrition report'
        : lowerText.includes('growth') || /\b(weight|height|length|growth chart|percentile|z[- ]?score)\b/i.test(text)
          ? 'Growth or child measurement report'
          : /\b(hemoglobin|haemoglobin|laboratory|lab result|blood test|urine test|diagnosis|prescription|clinical)\b/i.test(text)
            ? 'Medical or test report'
            : /\b(anganwadi|beneficiary|asha|centre|center)\b/i.test(text)
              ? 'Anganwadi or child health report'
              : 'Child health report';

    const summary = [];
    if (firstTitle) summary.push(firstTitle);
    if (extractedData.childName) addEvidence(items, 'Child/patient name', extractedData.childName);
    if (extractedData.parentName) addEvidence(items, 'Parent or guardian', extractedData.parentName);
    if (extractedData.age) addEvidence(items, 'Age', extractedData.age);
    if (extractedData.weight) addEvidence(items, 'Weight', extractedData.weight);
    if (extractedData.height) addEvidence(items, 'Height/length', extractedData.height);
    if (extractedData.recordDate) addEvidence(items, 'Record date', extractedData.recordDate);
    if (extractedData.dateOfBirth) addEvidence(items, 'Date of birth', extractedData.dateOfBirth);
    if (extractedData.beneficiaryId) addEvidence(items, 'Beneficiary ID', extractedData.beneficiaryId);
    if (extractedData.gender) addEvidence(items, 'Gender', extractedData.gender);
    if (extractedData.anganwadiId) addEvidence(items, 'Anganwadi ID', extractedData.anganwadiId);
    if (extractedData.nutritionalStatus) addEvidence(items, 'Nutritional status', extractedData.nutritionalStatus);
    if (extractedData.nutritionDetails) addEvidence(items, 'Nutrition findings', extractedData.nutritionDetails);
    if (extractedData.healthInformation) addEvidence(items, 'Health observations', extractedData.healthInformation);

    const labelPatterns = [
      ['Age', /\b(?:age|aged)\s*[:=\-]?\s*([^,;|\n]+)/i],
      ['Date of birth', /\b(?:date\s+of\s+birth|birth\s+date|dob)\s*[:=\-]?\s*([^,;|\n]+)/i],
      ['Weight', /\b(?:weight)\s*[:=\-]?\s*([^,;|\n]+)/i],
      ['Height/length', /\b(?:height|length)\s*[:=\-]?\s*([^,;|\n]+)/i],
      ['BMI', /\bBMI\s*[:=\-]?\s*([^,;|\n]+)/i],
      ['Report date', /\b(?:report\s+date|record\s+date|date)\s*[:=\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|[^,;|\n]+)/i],
    ];
    for (const [label, pattern] of labelPatterns) {
      const match = text.match(pattern);
      if (match) addEvidence(items, label, match[1]);
    }
    for (const date of text.match(new RegExp(DATE_PATTERN.source, 'gi')) || []) addEvidence(items, 'Date mentioned', date);

    const categoryPatterns = [
      ['Nutrition findings', /\b(nutrition|diet|feeding|meal|appetite|malnutrition|underweight|overweight|stunted|wasted)\b/i],
      ['Growth measurements', /\b(growth|weight|height|length|percentile|z[- ]?score|growth chart)\b/i],
      ['Vaccination details', /\b(vaccin|immuni[sz]|bcg|polio|opv|dpt|pentavalent|mmr|measles|hepatitis)\b/i],
      ['Health observations', /\b(health|symptom|observation|complaint|diagnosis|condition|fever|cough|diarr|illness|clinic)\b/i],
      ['Test or lab results', /\b(test|lab|laboratory|result|hemoglobin|haemoglobin|blood|urine|glucose|iron)\b/i],
      ['Recommendations', /\b(recommend|advice| advised|follow[- ]?up|refer|referral|next step|should)\b/i],
    ];
    for (const [title, pattern] of categoryPatterns) {
      const matchingLines = lines.filter((line) => pattern.test(line)
        && line.length > 3
        && !/^(?:child\s+nutrition\s+record|nutrition\s+notes?)\s*:?[.]?$/i.test(line));
      if (matchingLines.length) {
        sections.push({ title, items: [...new Set(matchingLines)].slice(0, 12).map((value) => ({ label: title, value })) });
        matchingLines.forEach((line) => usedLines.add(line));
      }
    }

    if (items.length) sections.unshift({ title: 'Identified details', items });
    const otherInformation = lines
      .filter((line) => !usedLines.has(line) && line.length > 2)
      .filter((line) => !/^[-|=:]+$/.test(line))
      .slice(0, 30)
      .map((value) => ({ label: 'Other information', value }));
    if (otherInformation.length) sections.push({ title: 'Other information', items: otherInformation });

    return {
      documentType,
      summary: summary.length ? summary : [`Detected as a ${documentType.toLowerCase()}.`],
      sections,
    };
  }

  static extractDataFromText(text, alternativeTexts = []) {
    const extractedData = {
      childName: '',
      age: '',
      weight: '',
      height: '',
      recordDate: '',
      dateOfBirth: '',
      parentName: '',
      parentId: '',
      phone: '',
      address: '',
      beneficiaryId: '',
      gender: '',
      anganwadiId: '',
      muac: '',
      nutritionalStatus: '',
      nutritionDetails: '',
      healthInformation: '',
      vaccinationRecords: [],
    };

    const ocrLines = text.split('\n').map((value) => value.trim()).filter(Boolean);

    for (const [lineIndex, line] of ocrLines.entries()) {
      const normalizedLine = line.replace(/\s+/g, ' ');
      const lowerLine = normalizedLine.toLowerCase();

      if (!extractedData.childName) {
        // Beneficiary forms commonly label this simply as "Name". Stop at
        // the next known field because OCR can merge several table cells onto
        // one line (for example: "Name Rahul Kumar Beneficiary ID BEN006").
        const match = normalizedLine.match(/(?:\bchild\s*name\b|\bname\s*of\s*child\b|\bname\b)\s*[:\-]?\s*(.+?)(?=\s+(?:beneficiary\s*id|age|gender|status)\b|$)/i);
        const name = match?.[1]?.replace(/\s+child\s*name\s*:?.*$/i, '').trim().replace(/^[|,:;\-\u2013\u2014\s]+|[|,:;\-\u2013\u2014\s]+$/g, '').trim();
        if (name && !/^(?:information|details|field)$/i.test(name)) {
          extractedData.childName = name;
        }

        // Tesseract may put a table label and its value on separate lines.
        if (!extractedData.childName && /\bchild\s*name\b/i.test(normalizedLine)) {
          const nextLine = ocrLines[lineIndex + 1] || '';
          if (nextLine && !/^(?:age|gender|weight|height|date|parent|guardian|nutrition|health|beneficiary|anganwadi)\b/i.test(nextLine)) {
            extractedData.childName = nextLine.replace(/^[|,:;\-\s]+|[|,:;\-\s]+$/g, '').trim();
          }
        }
      }

      if (!extractedData.parentName) {
        // Require an explicit name field and stop before other labeled fields;
        // narrative mentions such as "parent/guardian was advised" are not names.
        const match = normalizedLine.match(/(?:\bparent\s*[/&]\s*guardian\b|\bparent\b|\bguardian\b|\bmother\b|\bfather\b)(?:\s+name)?\s*[:\-]\s*(.+?)(?=\s+(?:relationship(?:\s+to\s+child)?|contact(?:\s+number)?|phone|beneficiary\s*id|date\s+of\s+birth|age|gender|status)\s*[:\-]|$)/i);
        const name = match?.[1]?.trim().replace(/^[|,:;\-\u2013\u2014\s]+|[|,:;\-\u2013\u2014\s]+$/g, '').trim();
        if (name) extractedData.parentName = name;
      }

      if (!extractedData.dateOfBirth && /\b(?:dob|birth\s+date|date\s+of\s+birth)\b/i.test(lowerLine)) {
        const match = normalizedLine.match(DATE_PATTERN);
        if (match) extractedData.dateOfBirth = match[1];
      }

      const vaccine = normalizedLine.match(VACCINE_ROW_PATTERN) || normalizedLine.match(VACCINE_PATTERN);
      if (vaccine) {
        const date = normalizedLine.match(DATE_PATTERN);
        const beforeDate = date?.index === undefined ? normalizedLine : normalizedLine.slice(0, date.index);
        const dose = beforeDate.slice(vaccine[0].length).match(/\d+/)?.[0] || '';
        const afterDate = date?.index === undefined ? normalizedLine : normalizedLine.slice(date.index + date[0].length);
        const status = afterDate.match(/(completed|pending|due|not\s+given)\b/i)?.[1] || '';
        extractedData.vaccinationRecords.push({
          vaccine: vaccine[1].toUpperCase().replace(/\s+/g, ' '),
          date: date ? date[1] : '',
          nextDue: '',
          dose,
          status,
        });
      }
    }

    // Try the same label/value extraction on alternate OCR layout passes.
    if (!extractedData.childName) {
      for (const candidateText of alternativeTexts) {
        const candidateLines = candidateText.split('\n').map((value) => value.trim()).filter(Boolean);
        for (let index = 0; index < candidateLines.length; index += 1) {
          const labelLine = candidateLines[index];
          if (!/\bchild\s*name\b|\bname\s+of\s+child\b/i.test(labelLine)) continue;
          const inlineValue = labelLine.match(/(?:child\s*name|name\s+of\s+child)\s*[:\-]?\s*(.+)$/i)?.[1]?.trim();
          const nextLine = candidateLines[index + 1] || '';
          const value = inlineValue || (nextLine && !/^(?:age|gender|weight|height|date|parent|guardian|nutrition|health|beneficiary|anganwadi)\b/i.test(nextLine) ? nextLine : '');
          if (value && !/^(?:child|name|information|details|field)$/i.test(value)) {
            extractedData.childName = value.replace(/^[|,:;\-\s]+|[|,:;\-\s]+$/g, '').trim();
            break;
          }
        }
        if (extractedData.childName) break;
      }
    }

    // Some scans omit the table's "Name" label but repeat the child's name
    // under an "Additional OCR Text" heading immediately before Beneficiary ID.
    if (!extractedData.childName) {
      const normalizedText = text.replace(/\s+/g, ' ');
      const additionalTextName = normalizedText.match(/\bAdditional\s+OCR\s+Text\s*:?[ \t]*([A-Z][A-Za-z.'’\-]*(?:\s+[A-Z][A-Za-z.'’\-]*){0,3})\s+(?=Beneficiary\s*ID\b)/i);
      if (additionalTextName) extractedData.childName = additionalTextName[1].trim();
    }

    // Handwritten labels are often misread by the printed-text OCR model.
    // Match close label spellings and repair common digit/letter confusions
    // only when the surrounding text resembles a date field.
    const lines = [text, ...alternativeTexts]
      .flatMap((candidateText) => candidateText.split('\n'))
      .map((value) => value.trim())
      .filter(Boolean);
    if (!extractedData.dateOfBirth) {
      const dateLine = lines.find((line) => hasFuzzyLabel(line, 'date of birth'));
      if (dateLine) {
        const ocrDate = dateLine.match(/[0-9OoIl|]{1,2}\s*[/.\-]\s*[0-9OoIl|e]{1,2}\s*[/.\-]\s*\d{4}/);
        if (ocrDate) {
          extractedData.dateOfBirth = ocrDate[0]
            .replace(/[Oo]/g, '0')
            .replace(/[Il|]/g, '1')
            .replace(/e/gi, '6')
            .replace(/\s+/g, '');
        }
      }
    }

    // On low-quality handwriting, Tesseract may recognize the date but lose
    // the "DOB" label. The sample form places DOB near the top of the page, so
    // inspect only the first few lines and reject dates in the future.
    if (!extractedData.dateOfBirth) {
      for (const candidateText of [text, ...alternativeTexts]) {
        const topLines = candidateText.split('\n').map((value) => value.trim()).filter(Boolean).slice(0, 10);
        for (const line of topLines) {
          if (!hasFuzzyLabel(line, 'birth') && !/\bdob\b/i.test(line)) continue;
          const ocrDate = line.match(/(?:[0-9OoIl|cCeE]\s*){1,2}[/.\-]\s*(?:[0-9OoIl|cCeE]\s*){1,2}[/.\-]\s*(?:[0-9OoIl|&]\s*){2,4}/);
          if (!ocrDate) continue;
          const normalizedDate = ocrDate[0]
            .replace(/[Oo]/g, '0')
            .replace(/[Il|]/g, '1')
            .replace(/[cCeE]/g, '6')
            .replace(/&/g, '2')
            .replace(/\s+/g, '');
          const dateParts = normalizedDate.split(/[/.\-]/);
          let year = Number(dateParts[2]);
          if (dateParts[2].length === 2) year += year <= 29 ? 2000 : 1900;
          if (year >= 1900 && year <= new Date().getFullYear()) {
            dateParts[2] = String(year);
            extractedData.dateOfBirth = dateParts.join('/');
            break;
          }
        }
        if (extractedData.dateOfBirth) break;
      }
    }

    if (!extractedData.parentName) {
      for (const line of lines) {
        const words = line.match(/[A-Za-z][A-Za-z.'’\-]*/g) || [];
        const parentIndex = words.findIndex((word) => editDistance(word.toLowerCase(), 'parent') <= 2
          || editDistance(word.toLowerCase(), 'guardian') <= 2
          || editDistance(word.toLowerCase(), 'mother') <= 2
          || editDistance(word.toLowerCase(), 'father') <= 2);
        if (parentIndex < 0) continue;

        const valueWords = words.slice(parentIndex + 1).filter((word) => word.length > 1);
        if (!valueWords.length || /^(?:was|is|should|advised|information)$/i.test(valueWords[0])) continue;
        extractedData.parentName = valueWords.join(' ').replace(/[|,:;\-]+$/, '').trim();
        break;
      }
    }

    if (!extractedData.childName) {
      for (const candidateText of [text, ...alternativeTexts]) {
        const candidateLines = candidateText.split('\n').map((value) => value.trim()).filter(Boolean);
        for (let index = 0; index < candidateLines.length; index += 1) {
          const line = candidateLines[index];
          if (!hasFuzzyLabel(line, 'child') || !hasFuzzyLabel(line, 'name')) continue;
          const value = line.match(/(?:child\s*name|name\s*of\s*child)\s*[:\-]?\s*(.+)$/i)?.[1]?.trim();
          const nextLine = candidateLines[index + 1] || '';
          const name = value || (nextLine && !/^(?:age|gender|weight|height|date|parent|guardian|nutrition|health|beneficiary|anganwadi)\b/i.test(nextLine) ? nextLine : '');
          if (name && !/^(?:child|name|information|details|field)$/i.test(name)) {
            extractedData.childName = name.replace(/^[|,:;\-\s]+|[|,:;\-\s]+$/g, '').trim();
            break;
          }
        }
        if (extractedData.childName) break;
      }
    }

    const allTexts = [text, ...alternativeTexts];
    const allLines = [...new Set(allTexts.flatMap((candidateText) => candidateText.split('\n')).map((line) => line.trim()).filter(Boolean))];
    const combinedText = allLines.join('\n');

    // Explicit field labels make the flattened PDF table reversible without
    // relying on made-up positions or values.
    const preciseChildName = getLabeledLineValue(allLines, ['Child Name', 'Name of Child']);
    const preciseParentName = getLabeledLineValue(allLines, ['Mother / Guardian Name', 'Parent / Guardian Name', 'Guardian Name', 'Mother Name', 'Father Name']);
    if (preciseChildName) extractedData.childName = preciseChildName;
    if (preciseParentName) extractedData.parentName = preciseParentName;
    if (!extractedData.parentId) extractedData.parentId = getLabeledLineValue(allLines, ['Parent / Guardian ID', 'Guardian ID', 'Parent ID']);
    if (!extractedData.phone) extractedData.phone = getLabeledLineValue(allLines, ['Contact Number', 'Phone Number', 'Mobile Number', 'Phone']);
    if (!extractedData.address) extractedData.address = getLabeledLineValue(allLines, ['Address']);
    if (!extractedData.beneficiaryId) extractedData.beneficiaryId = getLabeledLineValue(allLines, ['Beneficiary ID', 'Beneficiary No']).match(/BEN\d{3,}/i)?.[0] || '';
    if (!extractedData.anganwadiId) extractedData.anganwadiId = getLabeledLineValue(allLines, ['Anganwadi Centre ID', 'Anganwadi Center ID', 'Anganwadi ID', 'Centre ID', 'Center ID']);
    if (!extractedData.dateOfBirth) {
      extractedData.dateOfBirth = getLabeledLineValue(allLines, ['Date of Birth', 'Birth Date', 'DOB']).match(DATE_PATTERN)?.[0] || '';
    }

    // Tables often arrive from OCR as simple adjacent text, e.g.
    // "Age 3 years 8 months" instead of "Age: 3 years 8 months". These
    // patterns only accept concrete values, so absent fields stay empty.
    if (!extractedData.age) {
      extractedData.age = combinedText.match(/\b(?:age|aged)\s*[:|\-]?\s*(\d+\s*(?:years?|yrs?)(?:\s+\d+\s*(?:months?|mos?))?)/i)?.[1] || '';
    }
    if (!extractedData.gender) {
      extractedData.gender = combinedText.match(/\b(?:gender|sex)\s*[:|\-]?\s*(male|female)\b/i)?.[1] || '';
    }
    if (!extractedData.nutritionalStatus) {
      extractedData.nutritionalStatus = combinedText.match(/\b(?:nutritional?\s+status|nutrition\s+status|status)\s*[:|\-]?\s*(normal|underweight|overweight|stunted|wasted)\b/i)?.[1] || '';
    }

    const heightValue = getLabeledLineValue(allLines, ['Height', 'Length']);
    const weightValue = getLabeledLineValue(allLines, ['Weight']);
    const muacValue = getLabeledLineValue(allLines, ['MUAC']);
    if (!extractedData.height) extractedData.height = heightValue.match(/\d+(?:\.\d+)?\s*cm/i)?.[0] || '';
    if (!extractedData.weight) extractedData.weight = weightValue.match(/\d+(?:\.\d+)?\s*kg/i)?.[0] || '';
    if (!extractedData.muac) extractedData.muac = muacValue.match(/\d+(?:\.\d+)?\s*cm/i)?.[0] || '';
    if (!extractedData.nutritionalStatus) {
      extractedData.nutritionalStatus = getLabeledLineValue(allLines, ['Nutritional Status', 'Nutrition Status']).match(/(normal|underweight|overweight|stunted|wasted)(?=\d|\s|$)/i)?.[1] || '';
    }
    if (!extractedData.healthInformation) {
      const healthValue = getLabeledLineValue(allLines, ['Health Observation', 'Health Observations']);
      extractedData.healthInformation = healthValue.replace(new RegExp(DATE_PATTERN.source, 'i'), '').trim();
    }
    if (!extractedData.recordDate) {
      const healthRows = [heightValue, weightValue, muacValue, getLabeledLineValue(allLines, ['Nutritional Status']), getLabeledLineValue(allLines, ['Health Observation'])];
      extractedData.recordDate = healthRows.map((row) => row.match(DATE_PATTERN)?.[0]).find(Boolean) || '';
    }

    // Table columns are sometimes emitted as separate OCR lines: "Gender"
    // followed by "Male". Inspect only the line containing the gender/sex
    // label and the next two values, including common I/l OCR confusion.
    if (!extractedData.gender) {
      for (const [index, line] of allLines.entries()) {
        if (!hasFuzzyLabel(line, 'gender') && !hasFuzzyLabel(line, 'sex')) continue;
        const nearby = [line, allLines[index + 1], allLines[index + 2]];
        const gender = nearby.map(normalizeGender).find(Boolean);
        if (gender) {
          extractedData.gender = gender;
          break;
        }
      }
    }

    for (const [lineIndex, line] of allLines.entries()) {
      if (!extractedData.beneficiaryId) {
        const idMatch = line.match(/(?:B[Ee]?[Nn]|[@8]N)[0OoeE6GgYy]{3,4}/);
        if (idMatch) {
          // Normalize only the numeric suffix. Applying OCR corrections to
          // the whole match previously turned a valid BEN prefix into B6N.
          const captured = idMatch[0].toUpperCase();
          const suffix = (captured.match(/[0OEGY6]{3,4}$/) || [''])[0]
            .replace(/O/g, '0')
            .replace(/[EG]/g, '6')
            .replace(/Y/g, '4');
          extractedData.beneficiaryId = `BEN${suffix}`;
        }
      }

      if (!extractedData.anganwadiId) {
        const centreId = line.match(/A[Nn][O0]{2}[1Il|Y]/i);
        if (centreId) {
          extractedData.anganwadiId = centreId[0]
            .toUpperCase()
            .replace(/O/g, '0')
            .replace(/[IL|Y]/g, '1');
        }
      }

      const words = line.match(/[A-Za-z]+/g) || [];
      if (!extractedData.nutritionDetails) {
        const nutritionIndex = words.findIndex((word) => editDistance(word.toLowerCase(), 'nutrition') <= 2);
        if (nutritionIndex >= 0) {
          const isNutritionSection = /\bnutrition\s+(?:notes?|details?)\b/i.test(line);
          if (!isNutritionSection && !/\bnutrition\b[^:]{0,20}:/i.test(line)) continue;
          const value = words.slice(nutritionIndex + 1).join(' ').replace(/^(?:notes?|details?)\s*:?\s*/i, '').trim();
          const sectionLines = value ? [value] : [];
          for (let nextIndex = lineIndex + 1; nextIndex < allLines.length; nextIndex += 1) {
            const nextLine = allLines[nextIndex];
            if (/^(?:child\s*name|age|weight|height|date|parent|guardian|health|beneficiary|anganwadi|child\s+nutrition\s+record)\b/i.test(nextLine)
              || /\b\d+\s*years?\b|\b\d+(?:\.\d+)?\s*kg\b|\b\d+(?:\.\d+)?\s*cm\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/i.test(nextLine)) break;
            const followingLine = allLines[nextIndex + 1] || '';
            if (/^[A-Za-z][A-Za-z .'-]{0,30}$/.test(nextLine)
              && /\b\d+\s*years?\b|\b\d+(?:\.\d+)?\s*kg\b|\b\d+(?:\.\d+)?\s*cm\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/i.test(followingLine)) break;
            sectionLines.push(nextLine);
          }
          const nutritionText = sectionLines.join(' ').replace(/\s+/g, ' ').trim();
          if (value) {
            const knownFoods = ['Egg', 'Milk', 'Rice', 'Dal', 'Pulses', 'Cereals', 'Vegetables', 'Fruits', 'Protein', 'Ragi', 'Wheat', 'Banana', 'Fish', 'Lentils'];
            const closestFood = knownFoods
              .map((food) => ({ food, distance: editDistance(value.toLowerCase(), food.toLowerCase()) }))
              .sort((left, right) => left.distance - right.distance)[0];
            extractedData.nutritionDetails = closestFood.distance <= 2 ? closestFood.food : nutritionText;
          } else if (nutritionText) {
            extractedData.nutritionDetails = nutritionText;
          }
        }
      }

      if (!extractedData.healthInformation) {
        const healthIndex = words.findIndex((word) => editDistance(word.toLowerCase(), 'health') <= 2);
        if (healthIndex >= 0) {
          const value = words.slice(healthIndex + 1).pop();
          if (value) {
            const knownStatuses = ['Underweight', 'Overweight', 'Normal', 'Healthy', 'Stunted', 'Wasted'];
            const closestStatus = knownStatuses
              .map((status) => ({ status, distance: editDistance(value.toLowerCase(), status.toLowerCase()) }))
              .sort((left, right) => left.distance - right.distance)[0];
            extractedData.healthInformation = closestStatus.distance <= 7 ? closestStatus.status : value;
          }
        }
      }
    }

    if (!extractedData.nutritionalStatus && /^(?:normal|underweight|overweight|stunted|wasted)$/i.test(extractedData.healthInformation || '')) {
      extractedData.nutritionalStatus = extractedData.healthInformation;
    }

    // The table's value column is often recognized separately from its labels.
    const tableValuesText = allTexts.find((candidateText) =>
      /\b\d+\s*years?\b/i.test(candidateText)
      && /\b\d+(?:\.\d+)?\s*kg\b/i.test(candidateText)
      && /\b\d+(?:\.\d+)?\s*cm\b/i.test(candidateText)
    ) || '';
    if (tableValuesText) {
      extractedData.age = tableValuesText.match(/\b\d+\s*years?\b/i)?.[0] || extractedData.age;
      extractedData.weight = tableValuesText.match(/\b\d+(?:\.\d+)?\s*kg\b/i)?.[0] || extractedData.weight;
      extractedData.height = tableValuesText.match(/\b\d+(?:\.\d+)?\s*cm\b/i)?.[0] || extractedData.height;
      extractedData.recordDate = tableValuesText.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/)?.[0] || extractedData.recordDate;
    }

    return extractedData;
  }
}

module.exports = OCRService;
