const Beneficiary = require('../models/Beneficiary');
const HealthRecord = require('../models/HealthRecord');
const NutritionRecord = require('../models/NutritionRecord');
const Vaccination = require('../models/Vaccination');
const Attendance = require('../models/Attendance');
const ActivityRecord = require('../models/ActivityRecord');

const today = () => new Date().toISOString().slice(0, 10);
const isMalayalam = (value) => /[\u0D00-\u0D7F]/.test(value || '');
const hasAny = (value, terms) => terms.some((term) => value.includes(term));
const isDeleteRequest = (message) => {
  const text = String(message || '').toLowerCase();
  return /\b(delete|remove|erase|discard)\b/.test(text)
    || hasAny(text, ['\u0d15\u0d33\u0d2f\u0d41\u0d15', '\u0d2e\u0d3e\u0d2f\u0d4d\u0d15\u0d4d\u0d15\u0d41\u0d15', '\u0d12\u0d34\u0d3f\u0d35\u0d3e\u0d15\u0d4d\u0d15\u0d41\u0d15', '\u0d07\u0d32\u0d4d\u0d32\u0d3e\u0d24\u0d3e\u0d15\u0d4d\u0d15', '\u0d2e\u0d3e\u0d2f\u0d4d\u0d1a\u0d4d\u0d1a\u0d4d']);
};
const isBeneficiaryRequest = (message) => {
  const text = String(message || '').toLowerCase();
  return /\b(?:new\s+students?|new\s+children|beneficiar(?:y|ies)|register|enrol|enroll)\b/.test(text)
    || /\b(?:add|include)\b[^.]{0,30}\b(?:student|child|children|beneficiar(?:y|ies))\b/.test(text)
    || /[\u0D00-\u0D7F]/.test(text) && /(\u0d2a\u0d41\u0d24\u0d3f\u0d2f \u0d15\u0d41\u0d1f\u0d4d\u0d1f\u0d3f|\u0d15\u0d41\u0d1f\u0d1f\u0d3f\u0d15\u0d33\u0d46 \u0d1a\u0d47\u0d7c\u0d15|\u0d30\u0d1c\u0d3f\u0d38\u0d4d\u0d31\u0d7c)/.test(text);
};

const parseBeneficiaryNames = (message, draft = {}) => {
  if (draft.fields?.beneficiaries?.length) return draft.fields.beneficiaries;
  const source = String(message || '');
  const studentMatch = source.match(/(?:students?|children|beneficiar(?:y|ies))\b(.*)/i);
  if (!studentMatch) return [];
  let names = studentMatch[1]
    .replace(/^\s*(?:to\s+)?(?:our\s+|the\s+)?list\s*/i, '')
    .replace(/\s+to\s+(?:our|the)\s+list.*$/i, '')
    .replace(/^\s*(?:named|called)\s*/i, '')
    .trim();
  if (!names) return [];
  return names.split(/\s*(?:,|\band\b|&)\s*/i)
    .map((name) => name.trim())
    .filter((name) => name && !/^(?:to|our|the|list|new|students?|children)$/i.test(name))
    .map((name) => ({ name }));
};

const parseBeneficiaryDetails = (message, fields) => {
  const next = { ...fields };
  const date = String(message || '').match(/\b(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/);
  if (date) next.dob = date[1].replace(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/, '$3-$2-$1');
  const gender = String(message || '').match(/\b(male|female|boy|girl)\b/i);
  if (gender) next.gender = /female|girl/i.test(gender[1]) ? 'female' : 'male';
  const parent = String(message || '').match(/(?:parent|guardian)(?:\s+id)?\s*[:#-]?\s*([A-Za-z0-9_-]+)/i);
  const genericId = String(message || '').match(/\bid\s*(?:is|:|=)\s*([A-Za-z0-9_-]+)/i);
  if (parent) next.parent_id = parent[1];
  else if (genericId) next.parent_id = genericId[1];
  return next;
};

const reportIntent = (message) => {
  const text = String(message || '').toLowerCase();
  const wantsAction = hasAny(text, ['add', 'create', 'record', 'update', 'save', 'submit', 'enter', 'log', 'generate', 'give', 'prepare', 'delete', 'remove', 'erase', '\u0d1a\u0d47\u0d7c', '\u0d30\u0d47\u0d16', '\u0d38\u0d47\u0d35', '\u0d05\u0d2a\u0d4d', '\u0d24\u0d2f\u0d4d\u0d2f\u0d3e']);
  if (!wantsAction) return null;
  if (hasAny(text, ['monthly report', 'monthly activity', 'weekly report', 'periodic report', '\u0d2e\u0d3e\u0d38', '\u0d2a\u0d4d\u0d30\u0d24\u0d3f\u0d2e\u0d3e\u0d38'])) return 'monthly';
  if (hasAny(text, ['attendance', 'present', 'absent', '\u0d39\u0d3e\u0d1c\u0d7c', '\u0d0e\u0d24\u0d4d\u0d24\u0d3f', '\u0d35\u0d28\u0d4d\u0d28\u0d3f\u0d30\u0d41\u0d28\u0d4d\u0d28\u0d41'])) return 'attendance';
  if (hasAny(text, ['vaccin', 'immuni', 'bcg', 'polio', 'opv', 'dpt', 'mmr', '\u0d35\u0d3e\u0d15\u0d4d\u0d38\u0d3f', '\u0d15\u0d41\u0d24\u0d4d\u0d24\u0d3f\u0d35\u0d2f\u0d4d\u0d2a\u0d4d\u0d2a\u0d4d'])) return 'vaccination';
  if (hasAny(text, ['food distribution', 'distributed', 'rice', 'egg', 'meal', 'supplementary', 'food stock', 'stock', '\u0d2d\u0d15\u0d4d\u0d37\u0d23\u0d02', '\u0d35\u0d3f\u0d24\u0d30\u0d23\u0d02', '\u0d05\u0d30\u0d3f', '\u0d2e\u0d41\u0d1f\u0d4d\u0d1f'])) return 'supplementary_nutrition';
  if (hasAny(text, ['home visit', 'visited home', 'house visit', '\u0d35\u0d40\u0d1f\u0d4d\u0d1f\u0d3f\u0d7d \u0d2a\u0d4b\u0d2f\u0d3f', '\u0d35\u0d40\u0d1f\u0d4d\u0d1f\u0d41\u0d38\u0d28\u0d4d\u0d26\u0d7c\u0d36\u0d28\u0d02'])) return 'home_visit';
  if (hasAny(text, ['counselling', 'counseling', 'advice', '\u0d15\u0d57\u0d7a\u0d38\u0d3f\u0d32\u0d3f\u0d02\u0d17\u0d4d', '\u0d09\u0d2a\u0d26\u0d47\u0d36\u0d02'])) return 'counselling';
  if (hasAny(text, ['referral', 'referred', '\u0d31\u0d2b\u0d7c\u0d32\u0d4d', '\u0d31\u0d2b\u0d7c'])) return 'referral';
  if (hasAny(text, ['preschool', 'activity', 'play', '\u0d2a\u0d4d\u0d30\u0d40\u0d38\u0d4d\u0d15\u0d42\u0d7e', '\u0d2a\u0d4d\u0d30\u0d35\u0d7c\u0d24\u0d4d\u0d24\u0d28\u0d02', '\u0d15\u0d33\u0d3f'])) return 'preschool_activity';
  if (hasAny(text, ['birth', 'death', 'event', '\u0d1c\u0d28\u0d28\u0d02', '\u0d2e\u0d30\u0d23\u0d02', '\u0d2a\u0d30\u0d3f\u0d2a\u0d3e\u0d1f\u0d3f'])) return 'event';
  if (hasAny(text, ['nutrition', 'meal', 'feeding', 'diet', '\u0d2d\u0d15\u0d4d\u0d37\u0d23\u0d02', '\u0d2a\u0d4b\u0d37\u0d15'])) return 'nutrition';
  if (hasAny(text, ['screening', 'symptom', 'fever', 'sick', '\u0d2a\u0d30\u0d3f\u0d36\u0d4b\u0d27\u0d28', '\u0d2a\u0d28\u0d3f'])) return 'health_screening';
  if (hasAny(text, ['health', '\u0d06\u0d30\u0d4b\u0d17\u0d4d\u0d2f\u0d02'])) return 'health';
  if (hasAny(text, ['growth', 'weight', 'height', 'kg', 'cm', '\u0d35\u0d33\u0d7c\u0d1a\u0d4d\u0d1a', '\u0d2d\u0d3e\u0d30\u0d02', '\u0d09\u0d2f\u0d30\u0d02'])) return 'health';
  return null;
};

const parseFields = (message, draft = {}) => {
  const text = String(message || '');
  const lower = text.toLowerCase();
  const fields = { ...(draft.fields || {}) };
  const weight = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilos|\u0d15\u0d3f\u0d32\u0d4b)/i);
  const height = text.match(/(\d+(?:\.\d+)?)\s*(?:cm|centimet(?:er|re)|\u0d38\u0d46\u0d2e\u0d3f|\u0d38\u0d46\u0d28\u0d4d\u0d31\u0d3f\u0d2e\u0d40\u0d31\u0d4d\u0d31\u0d7c)/i);
  const age = text.match(/(\d+(?:\.\d+)?)\s*(?:years?|\u0d35\u0d2f\u0d38\u0d4d|\u0d35\u0d2f\u0d38\u0d4d\u0d38)/i);
  const date = text.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/);
  if (weight) fields.weight = Number(weight[1]);
  if (height) fields.height = Number(height[1]);
  if (age) fields.age = age[1];
  if (date) fields.date = date[1].replace(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/, '$3-$2-$1');
  if (hasAny(lower, ['today', '\u0d07\u0d28\u0d4d\u0d28\u0d4d'])) fields.date = today();
  const vaccine = text.match(/\b(bcg|opv|polio|dpt|pentavalent|mmr|measles|hepatitis(?: b)?|rotavirus)\b/i);
  if (vaccine) fields.vaccine = vaccine[1];
  const status = text.match(/\b(normal|underweight|overweight|stunted|wasted|healthy)\b/i);
  if (status) fields.nutrition_status = status[1].toLowerCase() === 'healthy' ? 'normal' : status[1].toLowerCase();
  const count = text.match(/\b(\d+)\s+(?:children|kids|child(?:ren)?|\u0d15\u0d41\u0d1f\u0d4d\u0d1f\u0d3f\u0d15\u0d7e)\b/i);
  if (count) fields.beneficiaries_served = Number(count[1]);
  fields.details = [fields.details, text].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(' ');
  return fields;
};

const label = (type) => ({ health: 'Child health / growth', health_screening: 'Health screening', nutrition: 'Nutrition', vaccination: 'Vaccination', attendance: 'Attendance', supplementary_nutrition: 'Food distribution', home_visit: 'Home visit', counselling: 'Health or nutrition counselling', referral: 'Referral / follow-up', preschool_activity: 'Preschool activity', event: 'Centre event', monthly: 'Monthly activity report' }[type] || type);

class ReportAssistantService {
  static async buildPreview(message, language = 'en-IN', existingDraft = null, user, requestedType = null) {
    const type = isDeleteRequest(message) ? 'delete' : (isBeneficiaryRequest(message) ? 'beneficiary' : (existingDraft?.reportType || requestedType || reportIntent(message)));
    if (!type) return { isReportRequest: false };
    const fields = parseFields(message, existingDraft || { fields: {} });
    if (type === 'delete') {
      const deleteType = reportIntent(message) || existingDraft?.fields?.deleteType || (isBeneficiaryRequest(message) ? 'beneficiary' : null);
      fields.deleteType = deleteType === 'monthly' ? 'activity' : deleteType;
      const beneficiaries = user?.centreId ? await Beneficiary.find({ anganwadi_id: user.centreId }).select('beneficiary_id name').lean() : [];
      const lowerMessage = String(message || '').toLowerCase();
      const found = beneficiaries.find((item) => lowerMessage.includes(item.name.toLowerCase()) || lowerMessage.includes(item.beneficiary_id.toLowerCase()));
      if (found) {
        fields.beneficiary_id = found.beneficiary_id;
        fields.beneficiary_name = found.name;
      }
      const missing = [];
      if (!fields.beneficiary_id) missing.push('the child name or beneficiary ID');
      if (!fields.deleteType) missing.push('the report type to delete');
      if (fields.deleteType !== 'beneficiary' && !fields.date) missing.push('the report date');
      const preview = {
        operation: 'Delete',
        reportType: fields.deleteType ? label(fields.deleteType) : 'Unspecified report',
        child: fields.beneficiary_name || fields.beneficiary_id || '',
        date: fields.date || 'all dates for this child',
      };
      return {
        isReportRequest: true,
        operation: 'delete',
        reportType: 'delete',
        fields,
        missing,
        canSave: missing.length === 0,
        preview,
        assistantText: missing.length
          ? 'I can prepare that deletion. I still need: ' + missing.join(', ') + '.'
          : 'This will permanently delete the selected record. Please verify the preview and confirm.',
      };
    }
    if (type === 'beneficiary') {
      fields.beneficiaries = parseBeneficiaryNames(message, existingDraft || { fields: {} });
      Object.assign(fields, parseBeneficiaryDetails(message, fields));
      const missing = [];
      if (!fields.beneficiaries.length) missing.push('child name');
      if (!fields.dob) missing.push('date of birth');
      if (!fields.gender) missing.push('gender');
      if (!fields.parent_id) missing.push('parent or guardian ID');
      const preview = { reportType: 'Beneficiary registration', beneficiaries: fields.beneficiaries, dateOfBirth: fields.dob || '', gender: fields.gender || '', parentId: fields.parent_id || '' };
      return {
        isReportRequest: true,
        reportType: type,
        fields,
        missing,
        canSave: missing.length === 0,
        preview,
        assistantText: missing.length
          ? 'I can add these child records. I still need: ' + missing.join(', ') + '.'
          : 'The beneficiary registration preview is ready. Please verify the children and confirm to save.',
      };
    }
    if (!fields.date && type !== 'monthly') fields.date = today();
    const beneficiaries = user?.centreId ? await Beneficiary.find({ anganwadi_id: user.centreId }).select('beneficiary_id name').lean() : [];
    const lowerMessage = String(message || '').toLowerCase();
    if (!fields.beneficiary_id) {
      const found = beneficiaries.find((item) => lowerMessage.includes(item.name.toLowerCase()) || lowerMessage.includes(item.beneficiary_id.toLowerCase()));
      if (found) { fields.beneficiary_id = found.beneficiary_id; fields.beneficiary_name = found.name; }
    }
    if (type === 'attendance') {
      fields.attendance = fields.attendance || beneficiaries
        .map((item) => {
          const namePattern = item.name.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\\\$&');
          const statusMatch = new RegExp('(?:' + namePattern + '\\\\s*(?:is|was)?\\\\s*(present|absent)|(present|absent)\\\\s*' + namePattern + ')', 'i').exec(message);
          const status = statusMatch?.[1] || statusMatch?.[2];
          return status ? { beneficiary_id: item.beneficiary_id, beneficiary_name: item.name, status: status.toLowerCase() } : null;
        })
        .filter(Boolean);
    }
    const missing = [];
    if (['health', 'health_screening', 'nutrition', 'vaccination'].includes(type) && !fields.beneficiary_id) missing.push('beneficiary or child name');
    if (type === 'health' && (!fields.weight || !fields.height)) missing.push(...[!fields.weight ? 'weight' : '', !fields.height ? 'height' : ''].filter(Boolean));
    if (type === 'nutrition' && !fields.nutrition_status) missing.push('nutrition status');
    if (type === 'vaccination' && !fields.vaccine) missing.push('vaccine name');
    if (type === 'attendance' && !fields.attendance?.length) missing.push('individual child attendance statuses or a daily attendance list');
    const languageMalayalam = language === 'ml-IN' || isMalayalam(message);
    if (type === 'monthly') return { isReportRequest: true, reportType: type, fields, missing: [], canSave: false, assistantText: languageMalayalam ? '\u0d38\u0d47\u0d35\u0d4d \u0d1a\u0d46\u0d2f\u0d4d\u0d24 \u0d30\u0d47\u0d16\u0d15\u0d33\u0d3f\u0d7d \u0d09\u0d2a\u0d2f\u0d4b\u0d17\u0d3f\u0d1a\u0d4d\u0d1a\u0d4d \u0d2e\u0d3e\u0d38 \u0d31\u0d3f\u0d2a\u0d4d\u0d2a\u0d4b\u0d7c\u0d1f\u0d4d\u0d1f\u0d4d \u0d24\u0d2f\u0d3e\u0d30\u0d3e\u0d15\u0d4d\u0d15\u0d3e\u0d02.' : 'I can generate the monthly activity report from saved records after you choose the reporting period.' };
    const preview = { reportType: label(type), ...fields, date: fields.date || today() };
    const assistantText = missing.length
      ? (languageMalayalam ? '\u0d08 \u0d31\u0d3f\u0d2a\u0d4d\u0d2a\u0d4b\u0d7c\u0d1f\u0d4d\u0d1f\u0d3f\u0d28\u0d3e\u0d2f\u0d3f \u0d15\u0d42\u0d1f\u0d41\u0d24\u0d7d \u0d35\u0d3f\u0d35\u0d30\u0d19\u0d4d\u0d19\u0d7e \u0d06\u0d35\u0d36\u0d4d\u0d2f\u0d2e\u0d3e\u0d23\u0d4d: ' + missing.join(', ') + '.' : 'I can prepare a ' + label(type) + '. I still need: ' + missing.join(', ') + '.')
      : (languageMalayalam ? '\u0d31\u0d3f\u0d2a\u0d4d\u0d2a\u0d4b\u0d7c\u0d1f\u0d4d\u0d1f\u0d4d \u0d24\u0d2f\u0d3e\u0d31\u0d3e\u0d15\u0d4d\u0d15\u0d3f. \u0d38\u0d47\u0d35\u0d4d \u0d1a\u0d46\u0d2f\u0d4d\u0d2f\u0d41\u0d28\u0d4d\u0d28\u0d24\u0d3f\u0d28\u0d4d \u0d2e\u0d41\u0d2e\u0d4d\u0d2a\u0d4d \u0d2a\u0d30\u0d3f\u0d36\u0d4b\u0d27\u0d3f\u0d15\u0d4d\u0d15\u0d42\u0d15. \u0d38\u0d02\u0d30\u0d15\u0d4d\u0d37\u0d3f\u0d15\u0d4d\u0d15\u0d23\u0d4b?' : label(type) + ' preview is ready. Please review it. Would you like to save this report?');
    return { isReportRequest: true, reportType: type, fields, missing, canSave: missing.length === 0, preview, assistantText };
  }

  static async savePreview(draft, user) {
    if (!draft?.reportType || !draft?.fields) throw new Error('There is no report waiting for confirmation.');
    if (draft.reportType === 'monthly') throw new Error('Monthly reports are generated from the Reports screen after choosing a reporting period.');
    if (user.role !== 'worker' || !user.centreId) throw new Error('Only an assigned Anganwadi worker can save report entries.');
    const fields = draft.fields;
    if (draft.operation === 'delete' || draft.reportType === 'delete') {
      if (!fields.beneficiary_id) throw new Error('A specific child or beneficiary ID is required before deleting.');
      if (fields.deleteType === 'beneficiary') {
        const result = await Beneficiary.deleteOne({ beneficiary_id: fields.beneficiary_id, anganwadi_id: user.centreId });
        return { operation: 'delete', deletedCount: result.deletedCount };
      }
      const date = new Date(fields.date);
      const nextDate = new Date(date.getTime() + 86400000);
      const query = { beneficiary_id: fields.beneficiary_id, date: { $gte: date, $lt: nextDate } };
      const models = {
        health: HealthRecord,
        nutrition: NutritionRecord,
        vaccination: Vaccination,
        attendance: Attendance,
      };
      if (fields.deleteType === 'supplementary_nutrition' || fields.deleteType === 'home_visit' || fields.deleteType === 'counselling' || fields.deleteType === 'referral' || fields.deleteType === 'preschool_activity' || fields.deleteType === 'event' || fields.deleteType === 'activity') {
        const result = await ActivityRecord.deleteMany({ ...query, centre_id: user.centreId });
        return { operation: 'delete', deletedCount: result.deletedCount };
      }
      const model = models[fields.deleteType];
      if (!model) throw new Error('That report type cannot be deleted from the assistant yet.');
      const result = await model.deleteMany(query);
      return { operation: 'delete', deletedCount: result.deletedCount };
    }
    if (draft.reportType === 'beneficiary') {
      return Promise.all(fields.beneficiaries.map((child) => Beneficiary.create({
        name: child.name,
        dob: fields.dob,
        gender: fields.gender,
        parent_id: fields.parent_id,
        anganwadi_id: user.centreId,
        beneficiary_type: 'child',
      })));
    }
    if (fields.beneficiary_id) {
      const beneficiary = await Beneficiary.findOne({ beneficiary_id: fields.beneficiary_id, anganwadi_id: user.centreId }).select('beneficiary_id');
      if (!beneficiary) throw new Error('The child is not registered at your centre.');
    }
    if (draft.reportType === 'health') {
      const height = Number(fields.height); const weight = Number(fields.weight);
      const bmi = Number((weight / ((height / 100) ** 2)).toFixed(2));
      const health_status = bmi < 18.5 ? 'underweight' : bmi >= 25 ? 'overweight' : 'normal';
      return HealthRecord.findOneAndUpdate({ beneficiary_id: fields.beneficiary_id, date: fields.date }, { beneficiary_id: fields.beneficiary_id, height, weight, bmi, health_status, date: fields.date }, { upsert: true, new: true, runValidators: true });
    }
    if (draft.reportType === 'nutrition') return NutritionRecord.create({ beneficiary_id: fields.beneficiary_id, nutrition_status: fields.nutrition_status, meals: fields.details, recommendations: fields.recommendations, date: fields.date });
    if (draft.reportType === 'vaccination') return Vaccination.create({ beneficiary_id: fields.beneficiary_id, vaccine: fields.vaccine, date: fields.date, completed: true });
    if (draft.reportType === 'health_screening') return ActivityRecord.create({ activity_type: 'event', centre_id: user.centreId, beneficiary_id: fields.beneficiary_id, date: fields.date, event_type: 'health_screening', details: fields.details, created_by: user.user_id });
    if (draft.reportType === 'attendance') {
      return Promise.all(fields.attendance.map((row) => Attendance.findOneAndUpdate(
        { beneficiary_id: row.beneficiary_id, date: fields.date },
        { beneficiary_id: row.beneficiary_id, date: fields.date, status: row.status, absence_reason: '' },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      )));
    }
    return ActivityRecord.create({ activity_type: draft.reportType, centre_id: user.centreId, beneficiary_id: fields.beneficiary_id, date: fields.date, service_type: fields.service_type, beneficiaries_served: fields.beneficiaries_served, details: fields.details, follow_up_required: Boolean(fields.follow_up_required), follow_up_status: fields.follow_up_status, created_by: user.user_id });
  }
}

module.exports = ReportAssistantService;
