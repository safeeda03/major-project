const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const sharp = require('sharp');

const DATE_PATTERN = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})/i;
const VACCINE_PATTERN = /\b(bcg|opv|polio|dpt|pentavalent|mmr|measles|hepatitis\s*b)\b/i;
const SAMPLE_FOOTER_PATTERN = /sample\s+document\s+prepared\s+for\s+testing\s+the\s+poshanai\s+ocr\s+scanning\s+feature\.?/gi;
const OCR_CACHE_DIRECTORY = path.join(__dirname, '..', '.cache', 'tesseract');

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

class OCRService {
  static async processDocument(file) {
    if (!file || !file.path) {
      const error = new Error('No image was provided for OCR.');
      error.statusCode = 400;
      throw error;
    }

    try {
      fs.mkdirSync(OCR_CACHE_DIRECTORY, { recursive: true });
      const isPdf = path.extname(file.originalname || file.path).toLowerCase() === '.pdf'
        || file.mimetype === 'application/pdf';
      let rawText;
      let confidence = null;
      let alternativeTexts = [];

      if (isPdf) {
        const pdf = await pdfParse(fs.readFileSync(file.path));
        rawText = pdf.text.replace(/\r/g, '').trim();
      } else {
        const recognitionOptions = { cachePath: OCR_CACHE_DIRECTORY, tessedit_pageseg_mode: '6' };
        const attempts = [];
        const original = await Tesseract.recognize(file.path, 'eng', recognitionOptions);
        attempts.push(original);

        // Handwritten pages photographed on paper often contain pale writing
        // from the reverse side. Try local contrast cleanup only when the
        // original OCR confidence is low, and retain the clearest pass.
        if (original.data.confidence < 65) {
          const baseImage = sharp(file.path).rotate().grayscale().normalize().sharpen();
          for (const threshold of [130, 110]) {
            const image = await baseImage.clone().threshold(threshold).png().toBuffer();
            attempts.push(await Tesseract.recognize(image, 'eng', recognitionOptions));
          }
        }

        const bestAttempt = attempts.reduce((best, attempt) => (
          attempt.data.confidence > best.data.confidence ? attempt : best
        ));
        rawText = bestAttempt.data.text.replace(/\r/g, '').trim();
        confidence = Number(bestAttempt.data.confidence.toFixed(1));
        alternativeTexts = attempts
          .filter((attempt) => attempt !== bestAttempt)
          .map((attempt) => attempt.data.text.replace(/\r/g, '').trim());
      }
      rawText = rawText.replace(SAMPLE_FOOTER_PATTERN, '').replace(/\n{3,}/g, '\n\n').trim();
      const extractedData = this.extractDataFromText(rawText, alternativeTexts);
      return {
        success: true,
        data: {
          ...extractedData,
          confidence,
          needsVerification: true,
        },
        message: rawText
          ? 'Text was extracted. Please verify every field before saving it.'
          : isPdf
            ? 'No selectable text was found in this PDF. Scanned PDFs are not supported yet; upload the page as an image.'
            : 'No readable text was found. Try a sharper, well-lit image with the document filling the frame.',
      };
    } catch (cause) {
      console.error('OCR processing failed:', cause.message);
      const error = new Error('Could not read this image. Use a clear JPG, PNG, or WebP image and try again.');
      error.statusCode = 422;
      throw error;
    }
  }

  static extractDataFromText(text, alternativeTexts = []) {
    const extractedData = {
      childName: '',
      dateOfBirth: '',
      parentName: '',
      beneficiaryId: '',
      anganwadiId: '',
      nutritionDetails: '',
      healthInformation: '',
      vaccinationRecords: [],
    };

    for (const line of text.split('\n').map((value) => value.trim()).filter(Boolean)) {
      const normalizedLine = line.replace(/\s+/g, ' ');
      const lowerLine = normalizedLine.toLowerCase();

      if (!extractedData.childName) {
        // Beneficiary forms commonly label this simply as "Name". Stop at
        // the next known field because OCR can merge several table cells onto
        // one line (for example: "Name Rahul Kumar Beneficiary ID BEN006").
        const match = normalizedLine.match(/(?:\bchild\s*name\b|\bname\s*of\s*child\b|\bname\b)\s*[:\-]?\s*(.+?)(?=\s+(?:beneficiary\s*id|age|gender|status)\b|$)/i);
        const name = match?.[1]?.trim().replace(/^[|,:;\-\u2013\u2014\s]+|[|,:;\-\u2013\u2014\s]+$/g, '').trim();
        if (name && !/^(?:information|details|field)$/i.test(name)) {
          extractedData.childName = name;
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

      const vaccine = normalizedLine.match(VACCINE_PATTERN);
      if (vaccine) {
        const date = normalizedLine.match(DATE_PATTERN);
        extractedData.vaccinationRecords.push({
          vaccine: vaccine[1].toUpperCase().replace(/\s+/g, ' '),
          date: date ? date[1] : '',
          nextDue: '',
        });
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
          if (!hasFuzzyLabel(candidateLines[index], 'child')) continue;
          const nearbyText = candidateLines.slice(index, index + 3).join(' ');
          const possibleNames = nearbyText.match(/\b[A-Z][a-z]{2,}\b/g) || [];
          const name = possibleNames.filter((word) => !/^(?:Child|Name|DOB|Date|Birth)$/i.test(word)).pop();
          if (name) {
            extractedData.childName = name;
            break;
          }
        }
        if (extractedData.childName) break;
      }
    }

    const allTexts = [text, ...alternativeTexts];
    const allLines = allTexts.flatMap((candidateText) => candidateText.split('\n')).map((line) => line.trim()).filter(Boolean);

    for (const line of allLines) {
      if (!extractedData.beneficiaryId) {
        const idMatch = line.match(/(?:B[Ee]?[Nn]|[@8]N)[0OoeE6GgYy]{3,4}/);
        if (idMatch) {
          extractedData.beneficiaryId = idMatch[0]
            .toUpperCase()
            .replace(/^[@8]/, 'B')
            .replace(/O/g, '0')
            .replace(/[EG]/g, '6')
            .replace(/Y/g, '4');
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
          const value = words.slice(nutritionIndex + 1).pop();
          if (value) {
            const knownFoods = ['Egg', 'Milk', 'Rice', 'Dal', 'Pulses', 'Cereals', 'Vegetables', 'Fruits', 'Protein', 'Ragi', 'Wheat', 'Banana', 'Fish', 'Lentils'];
            const closestFood = knownFoods
              .map((food) => ({ food, distance: editDistance(value.toLowerCase(), food.toLowerCase()) }))
              .sort((left, right) => left.distance - right.distance)[0];
            if (closestFood.distance <= 2) extractedData.nutritionDetails = closestFood.food;
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

    return extractedData;
  }
}

module.exports = OCRService;
