const crypto = require('crypto');
const Beneficiary = require('../models/Beneficiary');
const HealthRecord = require('../models/HealthRecord');
const NutritionRecord = require('../models/NutritionRecord');
const Vaccination = require('../models/Vaccination');
const Attendance = require('../models/Attendance');
const OcrDocument = require('../models/OcrDocument');

const DOCUMENT_TYPES = {
  beneficiary_registration: { label: 'Beneficiary Registration', patterns: [/beneficiary\s*(?:registration|details|id)/i, /child\s*name/i, /date\s*of\s*birth|\bdob\b/i] },
  health_report: { label: 'Health Report', patterns: [/health\s*(?:report|screening|record|status)/i, /medical|clinical|diagnosis|symptom/i] },
  growth_monitoring: { label: 'Growth Monitoring Report', patterns: [/growth\s*(?:monitoring|chart|record)/i, /(?:height|length)\s*[:\-]?\s*\d/i, /weight\s*[:\-]?\s*\d/i] },
  nutrition_assessment: { label: 'Nutrition Assessment', patterns: [/nutrition\s*(?:assessment|status|report)/i, /underweight|overweight|stunted|wasted|malnutrition/i] },
  vaccination_record: { label: 'Vaccination Record', patterns: [/vaccin|immuni[sz]/i, /\b(?:bcg|opv|dpt|pentavalent|mmr|measles|polio|hepatitis)\b/i] },
  attendance_record: { label: 'Attendance Record', patterns: [/attendance/i, /\b(?:present|absent|half[ -]?day)\b/i] },
  medical_document: { label: 'Medical/Health Document', patterns: [/prescription|laboratory|lab\s*result|hemoglobin|haemoglobin|blood\s*test/i] },
};

const FIELD_LABELS = {
  beneficiaryId: 'Beneficiary ID', childName: 'Child name', dateOfBirth: 'Date of birth', age: 'Age', gender: 'Gender',
  parentName: 'Parent/Guardian name', parentId: 'Parent/Guardian ID', phone: 'Phone number', address: 'Address', anganwadiId: 'Anganwadi Centre ID',
  height: 'Height', weight: 'Weight', muac: 'MUAC', nutritionalStatus: 'Nutritional status', screeningDate: 'Screening date', healthObservations: 'Health observations',
  attendanceStatus: 'Attendance status',
};

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const field = (value, options = {}) => ({
  value: clean(value) || null,
  status: clean(value) ? (options.status || 'review_recommended') : 'not_found',
  source: clean(value) ? 'document' : null,
  warning: options.warning || null,
});

const labelValue = (text, labels) => {
  const labelPattern = labels.map((label) => label.replace(/\s+/g, '\\s*')).join('|');
  const expression = new RegExp(`(?:${labelPattern})\\s*[:\\-]\\s*([^\\n|]{1,120})`, 'i');
  return clean(text.match(expression)?.[1]);
};

const firstDate = (value) => clean(value).match(/\b(?:\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/)?.[0] || '';

function parseDate(value) {
  const raw = clean(value);
  if (!raw) return null;
  let year; let month; let day;
  let match = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (match) [, year, month, day] = match;
  else {
    match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (!match) return null;
    [, day, month, year] = match;
    year = Number(year) < 100 ? String(2000 + Number(year)) : year;
  }
  const result = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return result.getUTCFullYear() === Number(year) && result.getUTCMonth() === Number(month) - 1 && result.getUTCDate() === Number(day) ? result : null;
}

function parseMeasurement(value, unit) {
  const match = clean(value).match(new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*${unit}\\b`, 'i'));
  return match ? Number(match[1]) : null;
}

function isScopedBeneficiary(user, beneficiary) {
  return user.role === 'supervisor' || (user.role === 'worker' && beneficiary.anganwadi_id === user.centreId);
}

function classify(text) {
  const matches = Object.entries(DOCUMENT_TYPES).map(([key, type]) => ({
    key,
    label: type.label,
    matched: type.patterns.filter((pattern) => pattern.test(text)).length,
    total: type.patterns.length,
  })).filter((item) => item.matched);
  const best = matches.sort((left, right) => right.matched - left.matched || right.total - left.total)[0];
  if (!best) return { key: 'other_unknown', label: 'Other/Unknown', confidence: null, requiresReview: true, evidence: [] };
  // This is keyword-evidence coverage, not a claimed OCR-accuracy score.
  const confidence = Math.round((best.matched / best.total) * 100);
  return { key: best.key, label: best.label, confidence, requiresReview: confidence < 100, evidence: best.matched };
}

function extractTableRows(text) {
  const lines = String(text || '').split('\n').map(clean).filter(Boolean);
  const rows = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!lines[index].includes('|')) continue;
    const headers = lines[index].split('|').map(clean).filter(Boolean);
    if (headers.length < 2 || !headers.some((header) => /beneficiary|name|age|gender|weight|height/i.test(header))) continue;
    for (let rowIndex = index + 1; rowIndex < lines.length && lines[rowIndex].includes('|'); rowIndex += 1) {
      const values = lines[rowIndex].split('|').map(clean).filter(Boolean);
      if (values.length !== headers.length || values.every((value) => /^-+$/.test(value))) continue;
      rows.push(Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex] || null])));
    }
    break;
  }
  return rows;
}

class OcrWorkflowService {
  static hashFile(filePath) {
    return crypto.createHash('sha256').update(require('fs').readFileSync(filePath)).digest('hex');
  }

  static buildStructuredData(ocrData, quality = {}) {
    const rawText = String(ocrData.rawText || '');
    const fields = {
      beneficiaryId: field(ocrData.beneficiaryId || labelValue(rawText, ['beneficiary id', 'beneficiary no'])),
      childName: field(ocrData.childName || labelValue(rawText, ['child name', 'name of child'])),
      dateOfBirth: field(ocrData.dateOfBirth || firstDate(labelValue(rawText, ['date of birth', 'birth date', 'dob']))),
      age: field(ocrData.age || labelValue(rawText, ['age'])),
      gender: field(labelValue(rawText, ['gender', 'sex']) || rawText.match(/\b(?:male|female)\b/i)?.[0]),
      parentName: field(ocrData.parentName || labelValue(rawText, ['parent name', 'guardian name', 'parent', 'guardian', 'mother', 'father'])),
      parentId: field(labelValue(rawText, ['parent id', 'guardian id'])),
      phone: field(labelValue(rawText, ['phone number', 'contact number', 'mobile number', 'phone']) || rawText.match(/\b(?:\+91[- ]?)?[6-9]\d{9}\b/)?.[0]),
      address: field(labelValue(rawText, ['address'])),
      anganwadiId: field(ocrData.anganwadiId || labelValue(rawText, ['anganwadi centre id', 'anganwadi id', 'centre id', 'center id'])),
      height: field(ocrData.height || rawText.match(/\b(?:height|length)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*cm)\b/i)?.[1]),
      weight: field(ocrData.weight || rawText.match(/\bweight\s*[:\-]?\s*(\d+(?:\.\d+)?\s*kg)\b/i)?.[1]),
      muac: field(rawText.match(/\bmuac\s*[:\-]?\s*(\d+(?:\.\d+)?\s*cm)\b/i)?.[1]),
      nutritionalStatus: field(rawText.match(/\b(?:nutrition(?:al)?\s*status|status)\s*[:\-]?\s*(normal|underweight|overweight|stunted|wasted)\b/i)?.[1] || rawText.match(/\b(underweight|overweight|stunted|wasted)\b/i)?.[1]),
      screeningDate: field(ocrData.recordDate || firstDate(labelValue(rawText, ['screening date', 'record date', 'report date', 'date']))),
      healthObservations: field(ocrData.healthInformation || labelValue(rawText, ['health observations', 'observations', 'health information'])),
      attendanceStatus: field(labelValue(rawText, ['attendance status', 'attendance']) || rawText.match(/\b(?:present|absent|half[ -]?day)\b/i)?.[0]),
    };
    const vaccinations = (ocrData.vaccinationRecords || []).map((record) => ({
      vaccine: field(record.vaccine), date: field(record.date), nextDueDate: field(record.nextDue), status: field('completed', { status: 'review_recommended' }),
    })).filter((record) => record.vaccine.value);
    const classification = classify(rawText);
    const warnings = [];
    if (!rawText.trim()) warnings.push('No readable text was found. Upload a clearer document.');
    if (quality.warnings?.length) warnings.push(...quality.warnings);
    if (ocrData.confidence !== null && ocrData.confidence !== undefined && ocrData.confidence < 65) warnings.push('OCR confidence is low. Verify every extracted field against the original document.');
    for (const [key, item] of Object.entries(fields)) {
      if (!item.value) continue;
      if (key === 'beneficiaryId' && !/^BEN\d{3,}$/i.test(item.value)) item.warning = 'Beneficiary ID format requires verification.';
      if (key === 'phone' && !/^(?:\+91[- ]?)?[6-9]\d{9}$/.test(item.value.replace(/\s/g, ''))) item.warning = 'Phone number format requires verification.';
      if (key === 'dateOfBirth' || key === 'screeningDate') if (!parseDate(item.value)) item.warning = 'Date value requires verification.';
      if (key === 'height' && parseMeasurement(item.value, 'cm') === null) item.warning = 'Height must include a numeric cm value.';
      if (key === 'weight' && parseMeasurement(item.value, 'kg') === null) item.warning = 'Weight must include a numeric kg value.';
      if (key === 'muac' && parseMeasurement(item.value, 'cm') === null) item.warning = 'MUAC must include a numeric cm value.';
      if (item.warning) warnings.push(`${FIELD_LABELS[key]}: ${item.warning}`);
    }
    const summary = Object.values(fields).reduce((totals, item) => {
      if (!item.value) totals.missing += 1;
      else if (item.warning) totals.needsReview += 1;
      else totals.extracted += 1;
      return totals;
    }, { extracted: 0, needsReview: 0, missing: 0 });
    return { classification, fields, vaccinations, tableRows: extractTableRows(rawText), warnings: [...new Set(warnings)], summary, quality };
  }

  static async enrich(structured, user, fileHash, documentId = null) {
    const beneficiaryId = structured.fields.beneficiaryId.value;
    const beneficiary = beneficiaryId ? await Beneficiary.findOne({ beneficiary_id: beneficiaryId }).lean() : null;
    const beneficiaryMatch = beneficiary && isScopedBeneficiary(user, beneficiary)
      ? { found: true, beneficiary: { id: String(beneficiary._id), beneficiaryId: beneficiary.beneficiary_id, name: beneficiary.name, dob: beneficiary.dob, gender: beneficiary.gender, centreId: beneficiary.anganwadi_id } }
      : { found: false, message: beneficiaryId ? 'Beneficiary not found in your accessible centre records.' : 'Beneficiary ID was not found in the document.' };
    const duplicateFilter = { file_hash: fileHash, ...(documentId ? { _id: { $ne: documentId } } : {}) };
    const fileDuplicates = await OcrDocument.find(duplicateFilter).select('_id original_filename document_type createdAt review_status').limit(5).lean();
    const duplicates = fileDuplicates.map((item) => ({ type: 'same_file', id: String(item._id), documentName: item.original_filename, documentType: item.document_type, createdAt: item.createdAt, status: item.review_status }));
    if (beneficiaryMatch.found) {
      const screeningDate = parseDate(structured.fields.screeningDate.value);
      if (screeningDate && ['health_report', 'growth_monitoring'].includes(structured.classification.key)) {
        const nextDay = new Date(screeningDate); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        const existingHealth = await HealthRecord.findOne({ beneficiary_id: beneficiary.beneficiary_id, date: { $gte: screeningDate, $lt: nextDay } }).select('_id date').lean();
        if (existingHealth) duplicates.push({ type: 'health_record', id: String(existingHealth._id), documentName: 'Existing health record', documentType: 'Health / Growth record', createdAt: existingHealth.date, status: 'existing' });
      }
      for (const record of structured.vaccinations || []) {
        const vaccinationDate = parseDate(record.date.value);
        if (!vaccinationDate || !record.vaccine.value) continue;
        const nextDay = new Date(vaccinationDate); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        const existingVaccination = await Vaccination.findOne({ beneficiary_id: beneficiary.beneficiary_id, vaccine: record.vaccine.value, date: { $gte: vaccinationDate, $lt: nextDay } }).select('_id date vaccine').lean();
        if (existingVaccination) duplicates.push({ type: 'vaccination_record', id: String(existingVaccination._id), documentName: `Existing ${existingVaccination.vaccine} record`, documentType: 'Vaccination record', createdAt: existingVaccination.date, status: 'existing' });
      }
    }
    return { ...structured, beneficiaryMatch, duplicates };
  }

  static getSaveOptions(review) {
    const fields = review.fields || {};
    const options = [];
    if (fields.height?.value && fields.weight?.value && fields.screeningDate?.value) options.push({ id: 'health', label: 'Health / Growth record', ready: true });
    if (fields.nutritionalStatus?.value) options.push({ id: 'nutrition', label: 'Nutrition record', ready: true });
    if ((review.vaccinations || []).some((record) => record.vaccine?.value && record.date?.value)) options.push({ id: 'vaccination', label: 'Vaccination record', ready: true });
    if (review.classification?.key === 'attendance_record' && fields.screeningDate?.value) options.push({ id: 'attendance', label: 'Attendance record', ready: true });
    return options;
  }

  static validateReview(review, createBeneficiary) {
    const fields = review.fields || {};
    const errors = [];
    const value = (key) => clean(fields[key]?.value);
    if (value('gender') && !['male', 'female'].includes(value('gender').toLowerCase())) errors.push('Gender must be male or female.');
    if (value('dateOfBirth') && !parseDate(value('dateOfBirth'))) errors.push('Date of birth must be a valid date.');
    if (value('screeningDate') && !parseDate(value('screeningDate'))) errors.push('Screening date must be a valid date.');
    if (value('phone') && !/^(?:\+91[- ]?)?[6-9]\d{9}$/.test(value('phone').replace(/\s/g, ''))) errors.push('Phone number must be a valid Indian mobile number.');
    if (value('height') && parseMeasurement(value('height'), 'cm') === null) errors.push('Height must be a numeric value in cm.');
    if (value('weight') && parseMeasurement(value('weight'), 'kg') === null) errors.push('Weight must be a numeric value in kg.');
    if (value('muac') && parseMeasurement(value('muac'), 'cm') === null) errors.push('MUAC must be a numeric value in cm.');
    if (value('age') && !/^\d+\s*(?:years?|months?)(?:\s+\d+\s*months?)?$/i.test(value('age'))) errors.push('Age must be written as years or months.');
    if (createBeneficiary) {
      if (!value('childName')) errors.push('Child name is required to create a beneficiary.');
      if (!value('dateOfBirth')) errors.push('Date of birth is required to create a beneficiary.');
      if (!value('gender')) errors.push('Gender is required to create a beneficiary.');
    }
    return errors;
  }

  static async saveReview(document, review, user, options = {}) {
    if (user.role !== 'worker') {
      const error = new Error('Only Anganwadi workers can confirm and save OCR records.'); error.statusCode = 403; throw error;
    }
    const errors = this.validateReview(review, Boolean(options.createBeneficiary));
    if (errors.length) { const error = new Error(errors.join(' ')); error.statusCode = 400; throw error; }
    const fields = review.fields || {};
    let beneficiaryId = clean(fields.beneficiaryId?.value);
    let beneficiary = beneficiaryId ? await Beneficiary.findOne({ beneficiary_id: beneficiaryId }) : null;
    if (beneficiary && !isScopedBeneficiary(user, beneficiary)) { const error = new Error('This beneficiary belongs to another centre.'); error.statusCode = 403; throw error; }
    if (!beneficiary && options.createBeneficiary) {
      beneficiary = await Beneficiary.create({
        name: clean(fields.childName?.value), dob: parseDate(fields.dateOfBirth?.value), gender: clean(fields.gender?.value).toLowerCase(),
        parent_id: clean(fields.parentId?.value) || 'PENDING', anganwadi_id: user.centreId, beneficiary_type: 'child', contact_phone: clean(fields.phone?.value) || undefined,
        notes: clean(fields.parentName?.value) ? `Parent/Guardian from OCR document: ${clean(fields.parentName?.value)}` : undefined,
      });
      beneficiaryId = beneficiary.beneficiary_id;
      fields.beneficiaryId = field(beneficiaryId, { status: 'verified' });
    }
    if (!beneficiary) { const error = new Error('Select an existing beneficiary or complete the required fields to create one.'); error.statusCode = 400; throw error; }
    const selected = Array.isArray(options.saveModules) ? options.saveModules : this.getSaveOptions(review).map((item) => item.id);
    const saved = [];
    const date = parseDate(fields.screeningDate?.value);
    if (selected.includes('health')) {
      const height = parseMeasurement(fields.height?.value, 'cm'); const weight = parseMeasurement(fields.weight?.value, 'kg');
      if (height === null || weight === null || !date) { const error = new Error('Health saving requires valid height, weight, and screening date.'); error.statusCode = 400; throw error; }
      const bmi = Number((weight / ((height / 100) ** 2)).toFixed(2));
      const healthStatus = bmi < 18.5 ? 'underweight' : bmi >= 25 ? 'overweight' : 'normal';
      const record = await HealthRecord.create({ beneficiary_id: beneficiaryId, height, weight, bmi, health_status: healthStatus, date });
      saved.push({ module: 'health', id: String(record._id) });
    }
    if (selected.includes('nutrition')) {
      const status = clean(fields.nutritionalStatus?.value).toLowerCase();
      if (!['normal', 'underweight', 'overweight', 'stunted', 'wasted'].includes(status)) { const error = new Error('Nutrition status must be normal, underweight, overweight, stunted, or wasted.'); error.statusCode = 400; throw error; }
      const record = await NutritionRecord.create({ beneficiary_id: beneficiaryId, nutrition_status: status, meals: clean(fields.healthObservations?.value) || undefined, date: date || new Date() });
      saved.push({ module: 'nutrition', id: String(record._id) });
    }
    if (selected.includes('vaccination')) {
      for (const vaccine of review.vaccinations || []) {
        const vaccineName = clean(vaccine.vaccine?.value); const vaccinationDate = parseDate(vaccine.date?.value);
        if (!vaccineName || !vaccinationDate) continue;
        const nextDate = parseDate(vaccine.nextDueDate?.value);
        const record = await Vaccination.create({ beneficiary_id: beneficiaryId, vaccine: vaccineName, date: vaccinationDate, next_due_date: nextDate || undefined, completed: clean(vaccine.status?.value).toLowerCase() !== 'due' });
        saved.push({ module: 'vaccination', id: String(record._id) });
      }
      if (!saved.some((record) => record.module === 'vaccination')) { const error = new Error('Vaccination saving requires a vaccine name and valid vaccination date.'); error.statusCode = 400; throw error; }
    }
    if (selected.includes('attendance')) {
      const status = clean(fields.attendanceStatus?.value).toLowerCase();
      if (!['present', 'absent', 'half-day'].includes(status) || !date) { const error = new Error('Attendance saving requires a valid status and date.'); error.statusCode = 400; throw error; }
      const record = await Attendance.findOneAndUpdate({ beneficiary_id: beneficiaryId, date }, { $set: { beneficiary_id: beneficiaryId, date, status } }, { new: true, upsert: true, runValidators: true });
      saved.push({ module: 'attendance', id: String(record._id) });
    }
    document.analysis = { ...document.analysis, structured: review, beneficiaryMatch: { found: true, beneficiary: { id: String(beneficiary._id), beneficiaryId, name: beneficiary.name } }, savedRecords: saved };
    document.review_status = 'saved'; document.verified_at = new Date(); document.verified_by = user._id; await document.save();
    return { beneficiary: { id: String(beneficiary._id), beneficiaryId, name: beneficiary.name }, savedRecords: saved };
  }
}

module.exports = OcrWorkflowService;
