const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');

const DATE_PATTERN = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/;
const VACCINE_PATTERN = /\b(bcg|opv|polio|dpt|pentavalent|mmr|measles|hepatitis\s*b)\b/i;
const OCR_CACHE_DIRECTORY = path.join(__dirname, '..', '.cache', 'tesseract');

class OCRService {
  static async processDocument(file) {
    if (!file || !file.path) {
      const error = new Error('No image was provided for OCR.');
      error.statusCode = 400;
      throw error;
    }

    try {
      fs.mkdirSync(OCR_CACHE_DIRECTORY, { recursive: true });
      const result = await Tesseract.recognize(file.path, 'eng', { cachePath: OCR_CACHE_DIRECTORY });
      const rawText = result.data.text.replace(/\r/g, '').trim();

      return {
        success: true,
        data: {
          rawText,
          ...this.extractDataFromText(rawText),
          confidence: Number(result.data.confidence.toFixed(1)),
          needsVerification: true,
        },
        message: rawText
          ? 'Text was extracted. Please verify every field before saving it.'
          : 'No readable text was found. Try a sharper, well-lit image with the document filling the frame.',
      };
    } catch (cause) {
      console.error('OCR processing failed:', cause.message);
      const error = new Error('Could not read this image. Use a clear JPG, PNG, or WebP image and try again.');
      error.statusCode = 422;
      throw error;
    }
  }

  static extractDataFromText(text) {
    const extractedData = {
      childName: '',
      dateOfBirth: '',
      parentName: '',
      vaccinationRecords: [],
    };

    for (const line of text.split('\n').map((value) => value.trim()).filter(Boolean)) {
      const normalizedLine = line.replace(/\s+/g, ' ');
      const lowerLine = normalizedLine.toLowerCase();

      if (!extractedData.childName && /child\s*name|name\s*of\s*child/.test(lowerLine)) {
        const match = normalizedLine.match(/(?:child\s*name|name\s*of\s*child)\s*[:\-]?\s*(.+)$/i);
        if (match) extractedData.childName = match[1].trim();
      }

      if (!extractedData.parentName && /parent|mother|father|guardian/.test(lowerLine)) {
        const match = normalizedLine.match(/(?:parent|mother|father|guardian)(?:\s*name)?\s*[:\-]?\s*(.+)$/i);
        if (match) extractedData.parentName = match[1].trim();
      }

      if (!extractedData.dateOfBirth && /\b(dob|birth|date of birth)\b/.test(lowerLine)) {
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

    return extractedData;
  }
}

module.exports = OCRService;
