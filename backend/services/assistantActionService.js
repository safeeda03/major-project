const Beneficiary = require('../models/Beneficiary');
const Attendance = require('../models/Attendance');
const HealthRecord = require('../models/HealthRecord');
const NutritionRecord = require('../models/NutritionRecord');
const Vaccination = require('../models/Vaccination');
const ActivityRecord = require('../models/ActivityRecord');
const { getScopedBeneficiaryIds } = require('../middleware/auth');

const MODELS = { attendance: Attendance, health: HealthRecord, nutrition: NutritionRecord, vaccination: Vaccination };
const ACTIVITY_ENTITIES = new Set(['activity', 'home_visit', 'preschool_activity', 'food_stock', 'supplementary_nutrition', 'counselling', 'referral']);
const entityLabels = { attendance: 'attendance', health: 'growth / health', nutrition: 'nutrition', vaccination: 'vaccination', beneficiary: 'beneficiary profile', activity: 'activity', home_visit: 'home visit', preschool_activity: 'preschool activity', food_stock: 'food stock', supplementary_nutrition: 'supplementary nutrition', counselling: 'counselling', referral: 'referral' };

const isMalayalam = (value) => /[\u0D00-\u0D7F]/.test(value || '');
const has = (text, words) => words.some((word) => text.includes(word));
const iso = (date) => new Date(date).toISOString().slice(0, 10);
const range = (start, end) => ({ $gte: new Date(`${start}T00:00:00.000Z`), $lte: new Date(`${end}T23:59:59.999Z`) });
const cleanPayload = (payload = {}) => {
  const { _id, createdAt, __v, ...safe } = payload;
  return safe;
};

function monthBounds(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start: iso(start), end: iso(end), label: start.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }) };
}

function parseDate(text) {
  const value = String(text || '').toLowerCase();
  const explicit = value.match(/\b(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/);
  if (explicit) {
    const parts = explicit[1].split(/[/-]/).map(Number);
    const parsed = parts[0] > 31 ? new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])) : new Date(Date.UTC(parts[2] < 100 ? 2000 + parts[2] : parts[2], parts[1] - 1, parts[0]));
    return { start: iso(parsed), end: iso(parsed), label: iso(parsed) };
  }
  const base = new Date();
  if (has(value, ['yesterday'])) base.setUTCDate(base.getUTCDate() - 1);
  if (has(value, ['last month', 'previous month', '\u0d15\u0d34\u0d3f\u0d1e\u0d4d\u0d1e \u0d2e\u0d3e\u0d38\u0d02'])) base.setUTCMonth(base.getUTCMonth() - 1);
  if (has(value, ['today', '\u0d07\u0d28\u0d4d\u0d28\u0d4d'])) { const valueDate = iso(base); return { start: valueDate, end: valueDate, label: valueDate }; }
  const month = value.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
  if (month) {
    const index = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(month[1]);
    const year = Number(value.match(/\b20\d{2}\b/)?.[0] || new Date().getUTCFullYear());
    return monthBounds(new Date(Date.UTC(year, index, 1)));
  }
  if (has(value, ['month', 'monthly', '\u0d2e\u0d3e\u0d38'])) return monthBounds(base);
  return { start: '1970-01-01', end: '2999-12-31', label: 'all available dates' };
}

function detectEntity(value) {
  const text = String(value || '').toLowerCase();
  if (has(text, ['beneficiary', 'profile', 'parent', 'guardian', 'child details', 'registered children', 'beneficiaries'])) return 'beneficiary';
  if (has(text, ['home visit', 'home visits', 'house visit', 'follow-up', 'follow up'])) return 'home_visit';
  if (has(text, ['preschool', 'participation', 'class activity', 'play activity'])) return 'preschool_activity';
  if (has(text, ['food stock', 'stock', 'out of stock', 'inventory'])) return 'food_stock';
  if (has(text, ['supplementary nutrition', 'food distribution', 'distributed food'])) return 'supplementary_nutrition';
  if (has(text, ['counselling', 'counseling'])) return 'counselling';
  if (has(text, ['referral', 'referred'])) return 'referral';
  if (has(text, ['activity', 'activities', 'event', 'participation'])) return 'activity';
  if (has(text, ['vaccin', 'immuni', 'bcg', 'polio', 'dpt', '\u0d35\u0d3e\u0d15\u0d4d\u0d38\u0d3f'])) return 'vaccination';
  if (has(text, ['attendance', 'present', 'absent', 'half-day', '\u0d39\u0d3e\u0d1c\u0d7c', '\u0d35\u0d28\u0d4d\u0d28\u0d41'])) return 'attendance';
  if (has(text, ['weight', 'height', 'growth', 'health', 'kg', 'cm', '\u0d2d\u0d3e\u0d30\u0d02', '\u0d09\u0d2f\u0d30\u0d02'])) return 'health';
  if (has(text, ['nutrition', 'food', 'meal', 'feeding', 'underweight', 'supplementary', '\u0d2a\u0d4b\u0d37\u0d15', '\u0d2d\u0d15\u0d4d\u0d37\u0d23\u0d02'])) return 'nutrition';
  return null;
}

function detectOperation(value) {
  const text = String(value || '').toLowerCase();
  if (has(text, ['delete', 'remove', 'erase', 'discard', '\u0d15\u0d33\u0d2f\u0d41\u0d15', '\u0d2e\u0d3e\u0d2f\u0d4d\u0d15\u0d4d\u0d15\u0d41\u0d15'])) return 'delete';
  if (has(text, ['change', 'update', 'correct', 'modify', 'set', 'make it', '\u0d2e\u0d3e\u0d31\u0d4d\u0d31\u0d23\u0d02', '\u0d2e\u0d3e\u0d31\u0d4d\u0d31\u0d3f'])) return 'update';
  if (has(text, ['add', 'mark', 'save', 'log', 'create', 'enter', 'register', '\u0d30\u0d47\u0d16\u0d2a\u0d4d\u0d2a\u0d46\u0d1f\u0d41\u0d15'])) return 'create';
  if (has(text, ['report', 'summary', 'how many', 'which children', 'show', 'find', 'latest', 'history', 'attendance for', '\u0d15\u0d3e\u0d23\u0d3f\u0d15\u0d4d\u0d15\u0d3e\u0d02'])) return 'search';
  return null;
}

function extractValue(text, pattern) { return String(text || '').match(pattern)?.[1]; }

class AssistantActionService {
  static async resolveBeneficiary(message, user) {
    const ids = await getScopedBeneficiaryIds(user);
    const filter = ids ? { beneficiary_id: { $in: ids } } : {};
    const candidates = await Beneficiary.find(filter).select('beneficiary_id name anganwadi_id').lean();
    const lower = String(message || '').toLowerCase();
    const matches = candidates.filter((item) => lower.includes(item.name.toLowerCase()) || lower.includes(item.beneficiary_id.toLowerCase()));
    return { candidates, matches };
  }

  static async buildQuery(message, user, history = []) {
    const source = `${history.filter((item) => item.role === 'user').slice(-2).map((item) => item.text).join(' ')} ${message}`;
    const operation = detectOperation(message) || detectOperation(source) || 'search';
    const entity = detectEntity(message) || detectEntity(source);
    const { matches } = await this.resolveBeneficiary(source, user);
    const dates = parseDate(source);
    if (operation === 'create' && dates.label === 'all available dates') {
      const today = iso(new Date());
      dates.start = today;
      dates.end = today;
      dates.label = today;
    }
    const weight = extractValue(source, /(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilos|\u0d15\u0d3f\u0d32\u0d4b)/i);
    const height = extractValue(source, /(\d+(?:\.\d+)?)\s*(?:cm|centimet(?:er|re)|\u0d38\u0d46\u0d2e\u0d3f)/i);
    const status = has(source.toLowerCase(), ['absent', '\u0d35\u0d28\u0d4d\u0d28\u0d3f\u0d32\u0d4d\u0d32']) ? 'absent' : (has(source.toLowerCase(), ['half-day']) ? 'half-day' : 'present');
    const risk = has(String(message).toLowerCase(), ['need attention', 'at risk', 'risk', 'missing growth', 'growth monitoring', 'incomplete vaccination', 'missing vaccination', 'missed follow-up', 'missing information', 'records are missing', 'നഷ്ടപ്പെട്ട കുത്തിവയ്പ്പ്', 'കുത്തിവയ്പ്പ് നഷ്ടപ്പെട്ട', 'മുടങ്ങിയ കുത്തിവയ്പ്പ്', 'കുത്തിവയ്പ്പ് മുടങ്ങിയ', 'എടുക്കാത്ത കുത്തിവയ്പ്പ്', 'കുത്തിവയ്പ്പ് എടുക്കാത്ത']);
    const isReport = has(String(message).toLowerCase(), ['report', 'summary', 'monthly', 'റിപ്പോർട്ട്', 'റിപ്പോർട്ട', 'സംഗ്രഹം', '\u0d2e\u0d3e\u0d38']);
    const beneficiaryName = extractValue(source, /(?:child|beneficiary|student)\s+(?:named\s+)?([a-z][a-z -]{1,40})/i);
    const gender = extractValue(source, /\b(male|female|boy|girl)\b/i);
    const dob = extractValue(source, /(?:date of birth|dob)\s*[:=]?\s*(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
    const activityType = entity === 'activity' ? (has(source.toLowerCase(), ['event']) ? 'event' : (operation === 'create' ? 'preschool_activity' : null)) : entity;
    return { operation: isReport && !['delete', 'update'].includes(operation) ? 'report' : operation, entity, activityType, beneficiary: matches[0], matches, dates, weight: weight ? Number(weight) : undefined, height: height ? Number(height) : undefined, status, source, beneficiaryName, gender: gender ? (/female|girl/i.test(gender) ? 'female' : 'male') : undefined, dob, risk, ambiguous: matches.length > 1 };
  }

  static formatRecord(record, beneficiaryMap) {
    const name = beneficiaryMap.get(record.beneficiary_id) || record.beneficiary_id;
    return { ...record, beneficiary_name: name, _id: String(record._id) };
  }

  static async process(message, user, history = [], language = 'en-IN') {
    const lowerMessage = String(message || '').toLowerCase();
    const malayalamDataQuestion = /റിപ്പോർട്ട|രേഖ|ഹാജർ|വളർച്ച|പോഷണം|കുത്തിവയ്പ്പ്/.test(lowerMessage);
    const dataQuestion = has(lowerMessage, ['show', 'find', 'latest', 'history', 'how many', 'which children', 'report', 'summary', 'attendance for', 'records', 'record', 'last month', 'this month', 'profile', 'details', 'missing', 'risk', 'റിപ്പോർട്ട്', 'രേഖ', 'ഹാജർ', 'വളർച്ച', 'പോഷണം', 'കുത്തിവയ്പ്പ്', '\u0d15\u0d3e\u0d23\u0d3f\u0d15\u0d4d\u0d15\u0d3e\u0d02']);
    if (has(lowerMessage, ['how do i', 'where can i', 'how can i', 'what does this alert mean'])) return this.applicationHelp(lowerMessage);
    if (!detectOperation(message) && !dataQuestion && !malayalamDataQuestion) return null;
    const query = await this.buildQuery(message, user, history);
    if (!query.entity && query.operation !== 'report' && !query.risk) return null;
    const ml = language === 'ml-IN' || isMalayalam(message);
    if (query.ambiguous) return { response: ml ? 'ഒരേ പേരുള്ള ഒന്നിലധികം ഗുണഭോക്താക്കളെ കണ്ടെത്തി. ദയവായി beneficiary ID നൽകുക.' : `I found ${query.matches.length} beneficiaries with that name. Please provide the beneficiary ID so I do not choose the wrong child.`, action: 'clarify', candidates: query.matches };
    if (['create', 'update', 'delete'].includes(query.operation)) return this.preview(query, user, ml);
    if (query.risk) return this.readRisk(query, user, ml);
    if (/separately|each report|each category|one by one|individual reports|വേർതിരിച്ച്|ഓരോ റിപ്പോർട്ടും|ഒന്നൊന്നായി/i.test(lowerMessage)) return this.readAllReports(query, user, ml);
    return this.read(query, user, ml);
  }

  static applicationHelp(message) {
    if (message.includes('beneficiary')) return { response: 'To add a beneficiary, open Beneficiaries, choose Add Beneficiary, complete the profile, and save. You can also tell me the child name, date of birth, gender, and parent ID and I will prepare a confirmation.', action: 'help' };
    if (message.includes('attendance')) return { response: 'Open Attendance to choose a date and mark children present or absent. You can also say “Mark Anu present today” and I will prepare the record for confirmation.' , action: 'help' };
    if (message.includes('vaccination')) return { response: 'Open Vaccination to review due and completed vaccines. Ask me for a child’s vaccination history or status to search saved records.' , action: 'help' };
    if (message.includes('report')) return { response: 'Open Reports to choose the report type and date range. You can also ask me for a daily, monthly, attendance, nutrition, growth, vaccination, or health summary.' , action: 'help' };
    if (message.includes('upload')) return { response: 'Open OCR from the navigation, choose a supported document, and upload it for text extraction. Review extracted details before saving them in the relevant module.' , action: 'help' };
    return { response: 'I can help with beneficiaries, attendance, growth, nutrition, health, vaccination, activities, home visits, food stock, reports, OCR, and alerts. Ask me what you want to find or do.', action: 'help' };
  }

  static async preview(query, user, ml) {
    if (user.role === 'parent' || !['worker', 'supervisor'].includes(user.role)) return { response: ml ? 'ഈ അക്കൗണ്ടിന് റെക്കോർഡ് മാറ്റാൻ അനുമതിയില്ല.' : 'Your account does not have permission to change records.', action: 'denied' };
    if (query.entity === 'beneficiary') {
      if (query.operation === 'create') {
        const parentId = extractValue(query.source, /(?:parent|guardian)(?:\s+id)?\s*[:#=]?\s*([A-Za-z0-9_-]+)/i);
        const payload = { name: query.beneficiaryName, dob: query.dob, gender: query.gender, parent_id: parentId, anganwadi_id: user.centreId, beneficiary_type: 'child' };
        const missing = [!payload.name && 'child name', !payload.dob && 'date of birth', !payload.gender && 'gender', !payload.parent_id && 'parent or guardian ID'].filter(Boolean);
        if (missing.length) return { response: `I can prepare the beneficiary profile, but I still need ${missing.join(', ')}.`, action: 'clarify' };
        return { response: 'I prepared a new beneficiary profile. Would you like me to save it?', action: 'confirm', draft: { ...query, payload }, preview: payload };
      }
      if (!query.beneficiary) return { response: 'Please include the child name or beneficiary ID so I can identify the profile.', action: 'clarify' };
      const current = await Beneficiary.findOne({ beneficiary_id: query.beneficiary.beneficiary_id }).lean();
      if (!current) return { response: 'That beneficiary profile was not found.', action: 'not_found' };
      if (query.operation === 'delete') return { response: `I found ${current.name}'s beneficiary profile. Deleting it may also remove related records. Do you want me to continue?`, action: 'confirm', draft: { ...query, recordId: String(current._id), payload: null }, preview: current };
      const payload = cleanPayload({ ...current, ...(query.beneficiaryName ? { name: query.beneficiaryName } : {}), ...(query.dob ? { dob: query.dob } : {}), ...(query.gender ? { gender: query.gender } : {}) });
      return { response: `I found ${current.name}'s profile. Please confirm the requested update.`, action: 'confirm', draft: { ...query, recordId: String(current._id), payload }, preview: { before: current, after: payload } };
    }
    if (!query.beneficiary && !ACTIVITY_ENTITIES.has(query.entity)) return { response: ml ? 'കുട്ടിയുടെ പേര് അല്ലെങ്കിൽ beneficiary ID പറയൂ.' : 'Please include the child name or beneficiary ID so I can identify the record.', action: 'clarify' };
    if (!query.entity) return { response: ml ? 'ഏത് റെക്കോർഡാണ് മാറ്റേണ്ടതെന്ന് പറയൂ.' : 'Please tell me which record type to change.', action: 'clarify' };
    if (ACTIVITY_ENTITIES.has(query.entity)) {
      if (user.role !== 'worker' || !user.centreId) return { response: 'Only an assigned worker can change activity records.', action: 'denied' };
      const filter = { centre_id: user.centreId, ...(query.beneficiary ? { beneficiary_id: query.beneficiary.beneficiary_id } : {}), date: range(query.dates.start, query.dates.end), ...(query.activityType ? { activity_type: query.activityType } : {}) };
      const existing = await ActivityRecord.find(filter).sort({ date: -1, createdAt: -1 }).lean();
      if (query.operation === 'create') {
        const payload = { activity_type: query.activityType || 'preschool_activity', ...(query.beneficiary ? { beneficiary_id: query.beneficiary.beneficiary_id } : {}), date: query.dates.start, details: query.source, observations: query.source };
        return { response: `I prepared a ${entityLabels[query.entity]} record${query.beneficiary ? ` for ${query.beneficiary.name}` : ''}. Would you like me to save it?`, action: 'confirm', draft: { ...query, payload }, preview: payload };
      }
      if (!existing.length) return { response: `No ${entityLabels[query.entity]} record was found${query.beneficiary ? ` for ${query.beneficiary.name}` : ''}.`, action: 'not_found' };
      const current = existing[0];
      if (query.operation === 'delete') return { response: `I found a ${entityLabels[query.entity]} record${query.beneficiary ? ` for ${query.beneficiary.name}` : ''} on ${iso(current.date)}. Delete it?`, action: 'confirm', draft: { ...query, recordId: String(current._id), payload: null }, preview: current };
      return { response: `I found a ${entityLabels[query.entity]} record${query.beneficiary ? ` for ${query.beneficiary.name}` : ''}. Please confirm the update.`, action: 'confirm', draft: { ...query, recordId: String(current._id), payload: cleanPayload({ ...current, details: query.source }) }, preview: current };
    }
    const Model = MODELS[query.entity];
    const filter = { beneficiary_id: query.beneficiary.beneficiary_id, date: range(query.dates.start, query.dates.end) };
    const existing = Model ? await Model.find(filter).sort({ date: -1, createdAt: -1 }).lean() : [];
    if (query.operation === 'create') {
      const payload = { beneficiary_id: query.beneficiary.beneficiary_id, date: query.dates.start };
      if (query.entity === 'attendance') payload.status = query.status;
      if (query.entity === 'health') Object.assign(payload, { weight: query.weight, height: query.height });
      if (query.entity === 'nutrition') payload.nutrition_status = has(query.source.toLowerCase(), ['underweight', 'overweight', 'stunted', 'wasted']) ? query.source.toLowerCase().match(/underweight|overweight|stunted|wasted/)[0] : undefined;
      if (query.entity === 'vaccination') payload.vaccine = extractValue(query.source, /\b(?:vaccine|vaccination)\s+(?:is\s+)?([a-z0-9 -]+)/i);
      const missing = query.entity === 'health' ? [!payload.weight && 'weight', !payload.height && 'height'].filter(Boolean) : query.entity === 'nutrition' ? [!payload.nutrition_status && 'nutrition status'].filter(Boolean) : query.entity === 'vaccination' ? [!payload.vaccine && 'vaccine name'].filter(Boolean) : [];
      if (missing.length) return { response: `I can prepare the ${entityLabels[query.entity]} record, but I still need ${missing.join(' and ')}.`, action: 'clarify' };
      return { response: ml ? '다음 정보를 저장할까요?' : `I extracted this ${entityLabels[query.entity]} record. Would you like me to save it?`, action: 'confirm', draft: { ...query, recordId: null, payload }, preview: { child: query.beneficiary.name, type: entityLabels[query.entity], date: query.dates.label, status: payload.status, weight: payload.weight, height: payload.height, vaccine: payload.vaccine, nutrition_status: payload.nutrition_status } };
    }
    if (!existing.length) return { response: `No ${entityLabels[query.entity]} record was found for ${query.beneficiary.name} in ${query.dates.label}.`, action: 'not_found' };
    const record = existing[0];
    if (query.operation === 'delete') return { response: `I found 1 matching ${entityLabels[query.entity]} record for ${query.beneficiary.name} on ${iso(record.date)}. Do you want me to delete it?`, action: 'confirm', draft: { ...query, recordId: String(record._id), payload: null }, preview: this.formatRecord(record, new Map([[query.beneficiary.beneficiary_id, query.beneficiary.name]])) };
    const payload = { ...record, ...(query.entity === 'health' ? { ...(query.weight ? { weight: query.weight } : {}), ...(query.height ? { height: query.height } : {}) } : {}) };
    if (query.entity === 'attendance') payload.status = query.status;
    if (query.entity === 'nutrition') payload.nutrition_status = extractValue(query.source, /\b(normal|underweight|overweight|stunted|wasted)\b/i) || payload.nutrition_status;
    return { response: `I found ${entityLabels[query.entity]} for ${query.beneficiary.name} on ${iso(record.date)}. Please confirm the change.`, action: 'confirm', draft: { ...query, recordId: String(record._id), payload }, preview: { before: this.formatRecord(record, new Map([[query.beneficiary.beneficiary_id, query.beneficiary.name]])), after: payload } };
  }

  static async read(query, user, ml) {
    const ids = await getScopedBeneficiaryIds(user);
    const beneficiaryFilter = query.beneficiary ? { beneficiary_id: query.beneficiary.beneficiary_id } : (ids ? { beneficiary_id: { $in: ids } } : {});
    const mapRows = await Beneficiary.find(ids ? { beneficiary_id: { $in: ids } } : {}).select('beneficiary_id name').lean();
    const map = new Map(mapRows.map((item) => [item.beneficiary_id, item.name]));
    if (query.entity === 'beneficiary') {
      const profiles = await Beneficiary.find(query.beneficiary ? { beneficiary_id: query.beneficiary.beneficiary_id } : (ids ? { beneficiary_id: { $in: ids } } : {})).select('-__v').lean();
      if (!profiles.length) return { response: 'No beneficiary profiles were found in your authorized scope.', action: 'not_found', records: [] };
      return { response: query.beneficiary ? `${query.beneficiary.name}'s profile was found.` : `${profiles.length} beneficiary profiles were found in your authorized scope.`, action: 'result', records: profiles };
    }
    if (ACTIVITY_ENTITIES.has(query.entity)) {
      const activityFilter = { ...(user.role === 'worker' ? { centre_id: user.centreId } : {}), ...(query.beneficiary ? { beneficiary_id: query.beneficiary.beneficiary_id } : {}), ...(query.activityType ? { activity_type: query.activityType } : {}), date: range(query.dates.start, query.dates.end) };
      const records = await ActivityRecord.find(activityFilter).sort({ date: -1 }).limit(200).lean();
      if (!records.length) return { response: `No ${entityLabels[query.entity]} records were found in ${query.dates.label}.`, action: 'not_found', records: [] };
      return { response: `${entityLabels[query.entity]} records found: ${records.length} in ${query.dates.label}.`, action: 'result', records };
    }
    if (query.operation === 'report') {
      const [attendance, health, nutrition, vaccination] = await Promise.all(Object.values(MODELS).map((Model) => Model.countDocuments({ ...beneficiaryFilter, date: range(query.dates.start, query.dates.end) })));
      const response = ml
        ? `${query.dates.label}-ലെ സംഗ്രഹം: ഹാജർ ${attendance}, വളർച്ച/ആരോഗ്യം ${health}, പോഷണം ${nutrition}, കുത്തിവയ്പ്പ് ${vaccination} രേഖകൾ.`
        : `${query.dates.label} summary from saved records: ${attendance} attendance, ${health} growth/health, ${nutrition} nutrition, and ${vaccination} vaccination records.`;
      return { response, action: 'result', report: { period: query.dates.label, attendance, health, nutrition, vaccination } };
    }
    const Model = MODELS[query.entity];
    const records = Model ? await Model.find({ ...beneficiaryFilter, date: range(query.dates.start, query.dates.end) }).sort({ date: -1 }).lean() : [];
    if (!records.length) return { response: `No ${entityLabels[query.entity]} records were found for ${query.beneficiary ? query.beneficiary.name : 'the selected children'} in ${query.dates.label}.`, action: 'not_found', records: [] };
    if (/detail|full|entire|specify|complete|വിശദ|പൂർണ്ണ/.test(query.source.toLowerCase())) {
      const formatted = records.slice(0, 25).map((record) => {
        const safe = this.formatRecord(record, map);
        const values = Object.entries(safe).filter(([key]) => !['_id', 'beneficiary_id', 'beneficiary_name', '__v'].includes(key) && safe[key] !== null && safe[key] !== undefined && safe[key] !== '').map(([key, value]) => `${key.replaceAll('_', ' ')}: ${value}`).join('; ');
        return `- ${values}`;
      });
      return { response: `${entityLabels[query.entity]} details for ${query.dates.label}:\n${formatted.join('\n')}`, action: 'result', records: records.map((record) => this.formatRecord(record, map)) };
    }
    if (query.entity === 'attendance' && query.beneficiary) {
      const present = records.filter((record) => record.status === 'present').length;
      const absent = records.filter((record) => record.status === 'absent').length;
      return { response: `Attendance found for ${query.beneficiary.name} — ${query.dates.label}\nPresent: ${present}\nAbsent: ${absent}\nAttendance rate: ${Math.round((present / records.length) * 1000) / 10}%`, action: 'result', records: records.map((record) => this.formatRecord(record, map)) };
    }
    if (query.entity === 'attendance') {
      const present = records.filter((record) => record.status === 'present').length;
      const absent = records.filter((record) => record.status === 'absent').length;
      return { response: `Attendance summary for ${query.dates.label}\nTotal records: ${records.length}\nPresent: ${present}\nAbsent: ${absent}`, action: 'result', records: records.map((record) => this.formatRecord(record, map)) };
    }
    if (query.entity === 'health' && query.source.toLowerCase().includes('latest')) {
      return { response: `Latest growth / health record for ${query.beneficiary ? query.beneficiary.name : 'the selected children'} found.`, action: 'result', records: [this.formatRecord(records[0], map)] };
    }
    return { response: `${entityLabels[query.entity]} records found: ${records.length} for ${query.beneficiary ? query.beneficiary.name : 'the selected children'} in ${query.dates.label}.`, action: 'result', records: records.map((record) => this.formatRecord(record, map)) };
  }

  static async readAllReports(query, user, ml = false) {
    const ids = await getScopedBeneficiaryIds(user);
    const filter = { ...(query.beneficiary ? { beneficiary_id: query.beneficiary.beneficiary_id } : (ids ? { beneficiary_id: { $in: ids } } : {})), date: range(query.dates.start, query.dates.end) };
    const entries = [['Attendance', Attendance], ['Growth / health', HealthRecord], ['Nutrition', NutritionRecord], ['Vaccination', Vaccination]];
    const groups = await Promise.all(entries.map(async ([label, Model]) => ({ label, records: await Model.find(filter).sort({ date: -1 }).limit(50).lean() })));
    const lines = groups.map(({ label, records }) => `${label}: ${records.length} record${records.length === 1 ? '' : 's'}${records.length ? ` (${records.slice(0, 10).map((record) => iso(record.date)).join(', ')})` : ''}`);
    const response = ml
      ? `റിപ്പോർട്ടുകൾ വേർതിരിച്ച് (${query.dates.label}):\n${groups.map(({ label, records }) => { const names = { Attendance: 'ഹാജർ', 'Growth / health': 'വളർച്ച / ആരോഗ്യം', Nutrition: 'പോഷണം', Vaccination: 'കുത്തിവയ്പ്പ്' }; const dates = records.length ? ` (${records.slice(0, 10).map((record) => iso(record.date)).join(', ')})` : ''; return `${names[label]}: ${records.length} രേഖ${records.length === 1 ? '' : 'കൾ'}${dates}`; }).join('\n')}`
      : `Reports separately for ${query.dates.label}:\n${lines.join('\n')}`;
    return { response, action: 'result', report: Object.fromEntries(groups.map(({ label, records }) => [label, records])) };
  }

  static async readRisk(query, user, ml) {
    const ids = await getScopedBeneficiaryIds(user);
    const filter = ids ? { beneficiary_id: { $in: ids } } : {};
    const children = await Beneficiary.find(filter).select('beneficiary_id name').lean();
    const names = new Map(children.map((child) => [child.beneficiary_id, child.name]));
    const text = query.source.toLowerCase();
    let result = [];
    let category = 'risk indicators';
    if (has(text, ['missing growth', 'growth monitoring', 'growth records', 'records are missing'])) {
      const monitored = await HealthRecord.find({ ...filter, date: range(query.dates.start, query.dates.end) }).distinct('beneficiary_id');
      const monitoredSet = new Set(monitored);
      category = 'children without growth monitoring';
      result = children.filter((child) => !monitoredSet.has(child.beneficiary_id)).map((child) => ({ beneficiary_id: child.beneficiary_id, name: child.name, indicator: 'No growth record in the selected period' }));
    } else if (has(text, ['incomplete vaccination', 'missing vaccination', 'നഷ്ടപ്പെട്ട കുത്തിവയ്പ്പ്', 'കുത്തിവയ്പ്പ് നഷ്ടപ്പെട്ട', 'മുടങ്ങിയ കുത്തിവയ്പ്പ്', 'കുത്തിവയ്പ്പ് മുടങ്ങിയ', 'എടുക്കാത്ത കുത്തിവയ്പ്പ്', 'കുത്തിവയ്പ്പ് എടുക്കാത്ത'])) {
      const vaccinated = await Vaccination.find(filter).distinct('beneficiary_id');
      const vaccinatedSet = new Set(vaccinated);
      category = 'children without vaccination records';
      result = children.filter((child) => !vaccinatedSet.has(child.beneficiary_id)).map((child) => ({ beneficiary_id: child.beneficiary_id, name: child.name, indicator: 'No vaccination record found' }));
    } else if (has(text, ['missed follow-up', 'missed follow up', 'pending follow-up', 'pending follow up'])) {
      const pending = await ActivityRecord.find({ ...(user.role === 'worker' ? { centre_id: user.centreId } : {}), follow_up_required: true, follow_up_status: { $nin: ['completed', 'closed'] } }).sort({ date: -1 }).lean();
      category = 'pending follow-ups';
      result = pending.map((record) => ({ ...record, beneficiary_name: names.get(record.beneficiary_id) || record.beneficiary_id }));
    } else {
      const [health, nutrition] = await Promise.all([HealthRecord.find(filter).sort({ date: -1 }).lean(), NutritionRecord.find(filter).sort({ date: -1 }).lean()]);
      const latest = new Map();
      [...health, ...nutrition].forEach((record) => { if (!latest.has(record.beneficiary_id)) latest.set(record.beneficiary_id, record); });
      category = 'children with recorded growth or nutrition indicators requiring review';
      result = [...latest.entries()].filter(([, record]) => record.health_status && record.health_status !== 'normal' || record.nutrition_status && !['normal', 'healthy'].includes(record.nutrition_status)).map(([beneficiary_id, record]) => ({ beneficiary_id, name: names.get(beneficiary_id), indicator: record.health_status || record.nutrition_status, date: record.date }));
    }
    if (!result.length) return { response: ml ? 'സേവ് ചെയ്ത രേഖകളിൽ നിന്ന് നഷ്ടപ്പെട്ട കുത്തിവയ്പ്പ് രേഖകളുള്ള കുട്ടികളെ കണ്ടെത്താനായില്ല.' : `No ${category} were identified from the saved records.`, action: 'result', records: [], calculated: true };
    const matchedNames = result.map((item) => item.name || item.beneficiary_name || item.beneficiary_id).join(', ');
    return { response: ml ? `കുത്തിവയ്പ്പ് രേഖകൾ അപൂർണ്ണമായ കുട്ടികൾ: ${result.length}\n${matchedNames}\nഇത് ഡാറ്റാബേസ് രേഖകളെ അടിസ്ഥാനമാക്കിയുള്ള സൂചന മാത്രമാണ്; ആരോഗ്യപ്രവർത്തകനുമായി പരിശോധിക്കുക.` : `${category}: ${result.length}. These are database-based indicators, not diagnoses. Please review them with the responsible worker or health professional.`, action: 'result', records: result, calculated: true };
  }

  static async confirm(draft, user) {
    if (!draft?.operation || !draft?.entity || (draft.entity !== 'beneficiary' && !draft?.beneficiary?.beneficiary_id && !ACTIVITY_ENTITIES.has(draft.entity))) throw new Error('The confirmation has expired. Please ask again.');
    if (draft.entity === 'beneficiary') return this.confirmBeneficiary(draft, user);
    if (ACTIVITY_ENTITIES.has(draft.entity)) return this.confirmActivity(draft, user);
    const ids = await getScopedBeneficiaryIds(user);
    if (ids && !ids.includes(draft.beneficiary.beneficiary_id)) throw new Error('This child is outside your access scope.');
    if (!['worker', 'supervisor'].includes(user.role)) throw new Error('You are not allowed to change records.');
    const Model = MODELS[draft.entity];
    if (!Model) throw new Error('This record type is not supported yet.');
    if (draft.operation === 'delete') {
      const deleted = await Model.findOneAndDelete({ _id: draft.recordId, beneficiary_id: draft.beneficiary.beneficiary_id });
      if (!deleted) throw new Error('The record was changed or removed already. Please search again.');
      return { response: `${entityLabels[draft.entity]} record deleted successfully.`, action: 'result' };
    }
    const payload = cleanPayload({ ...draft.payload, beneficiary_id: draft.beneficiary.beneficiary_id });
    if (draft.operation === 'update') {
      const updated = await Model.findOneAndUpdate({ _id: draft.recordId, beneficiary_id: draft.beneficiary.beneficiary_id }, payload, { new: true, runValidators: true }).lean();
      if (!updated) throw new Error('The record was changed or removed already. Please search again.');
      return { response: `${entityLabels[draft.entity]} record updated successfully.`, action: 'result', records: [updated] };
    }
    const created = await Model.create(payload);
    return { response: `${entityLabels[draft.entity]} record saved successfully.`, action: 'result', records: [created] };
  }

  static async confirmBeneficiary(draft, user) {
    if (user.role !== 'worker' || !user.centreId) throw new Error('Only an assigned worker can change beneficiary profiles.');
    if (draft.operation === 'delete') {
      const deleted = await Beneficiary.findOneAndDelete({ _id: draft.recordId, anganwadi_id: user.centreId });
      if (!deleted) throw new Error('The beneficiary profile was changed or removed already.');
      await Promise.all([
        Attendance.deleteMany({ beneficiary_id: deleted.beneficiary_id }),
        HealthRecord.deleteMany({ beneficiary_id: deleted.beneficiary_id }),
        NutritionRecord.deleteMany({ beneficiary_id: deleted.beneficiary_id }),
        Vaccination.deleteMany({ beneficiary_id: deleted.beneficiary_id }),
        ActivityRecord.deleteMany({ beneficiary_id: deleted.beneficiary_id, centre_id: user.centreId }),
      ]);
      return { response: 'Beneficiary profile deleted successfully.', action: 'result' };
    }
    if (draft.operation === 'update') {
      const updated = await Beneficiary.findOneAndUpdate({ _id: draft.recordId, anganwadi_id: user.centreId }, cleanPayload(draft.payload), { new: true, runValidators: true }).lean();
      if (!updated) throw new Error('The beneficiary profile was changed or removed already.');
      return { response: 'Beneficiary profile updated successfully.', action: 'result', records: [updated] };
    }
    const created = await Beneficiary.create({ ...draft.payload, anganwadi_id: user.centreId });
    return { response: 'Beneficiary profile saved successfully.', action: 'result', records: [created] };
  }

  static async confirmActivity(draft, user) {
    if (user.role !== 'worker' || !user.centreId) throw new Error('Only an assigned worker can change activity records.');
    const scope = { centre_id: user.centreId };
    if (draft.operation === 'delete') {
      const deleted = await ActivityRecord.findOneAndDelete({ _id: draft.recordId, ...scope });
      if (!deleted) throw new Error('The activity record was changed or removed already.');
      return { response: `${entityLabels[draft.entity]} record deleted successfully.`, action: 'result' };
    }
    if (draft.operation === 'update') {
      const updated = await ActivityRecord.findOneAndUpdate({ _id: draft.recordId, ...scope }, { ...cleanPayload(draft.payload), ...scope }, { new: true, runValidators: true }).lean();
      if (!updated) throw new Error('The activity record was changed or removed already.');
      return { response: `${entityLabels[draft.entity]} record updated successfully.`, action: 'result', records: [updated] };
    }
    const created = await ActivityRecord.create({ ...draft.payload, ...scope, created_by: user.user_id });
    return { response: `${entityLabels[draft.entity]} record saved successfully.`, action: 'result', records: [created] };
  }
}

module.exports = AssistantActionService;
