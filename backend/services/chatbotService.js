const MAX_MESSAGE_LENGTH = 4_000;
const MAX_HISTORY_MESSAGES = 8;
const REQUEST_TIMEOUT_MS = 45_000;
const NUTRITION_KNOWLEDGE = require('../data/nutrition-knowledge.json');

const ASSISTANT_INSTRUCTIONS = `You are PoshanAI, a practical child-nutrition counsellor for parents and Anganwadi workers in Kerala and India.

Give advice that someone can use at home or during parent counselling. For nutrition or poor-growth questions, explain specific foods and actions, using familiar examples such as rice, ragi, dal, green gram, egg, fish, chicken, milk or curd, banana, and seasonal vegetables. Explain feeding frequency, responsive feeding, hygiene, and how to monitor weight and height on the growth chart. If the child's age is missing and it changes the advice, ask for the age while still giving safe general guidance.

Organise longer answers with short headings and bullet points. Prefer practical examples over phrases like "give a balanced diet". Never diagnose a disease or prescribe medicine. Explain when to contact an Anganwadi worker, ASHA/health worker, or doctor, and mention urgent care for danger signs. Do not invent official schemes, citations, statistics, or beneficiary data. Do not ask for passwords, API keys, Aadhaar numbers, or other unnecessary sensitive information. Reply only in the user's language and return only the final answer without hidden reasoning or thinking markers.`;

const LOCAL_KNOWLEDGE_CONTEXT = `General PoshanAI reference context:
- Common foods: rice, ragi, dal, green gram, egg, fish, chicken, milk, curd, banana, seasonal vegetables, and healthy fats such as groundnut or sesame paste.
- Practical pattern: 3 meals and 2 to 3 nutritious snacks, with age-appropriate texture, clean preparation, and responsive feeding.
- Monitoring: record weight and height on the Anganwadi growth chart and refer persistent poor growth or danger signs to a health worker.
Use this as guidance, not as a diagnosis or a replacement for an individual health assessment.`;

class ChatbotService {
  static async getDatasetContext() {
    try {
      const NutritionRecord = require('../models/NutritionRecord');
      const HealthRecord = require('../models/HealthRecord');
      const publicKnowledge = JSON.stringify(NUTRITION_KNOWLEDGE);
      if (NutritionRecord.db.readyState !== 1) return `${LOCAL_KNOWLEDGE_CONTEXT}\nPublic nutrition knowledge:\n${publicKnowledge}`;

      const [nutritionRecords, healthRecords] = await Promise.all([
        NutritionRecord.find().sort({ date: -1 }).limit(12).lean().exec(),
        HealthRecord.find().sort({ date: -1 }).limit(12).lean().exec(),
      ]);
      const records = [
        ...nutritionRecords.map(({ beneficiary_id, nutrition_status, meals, recommendations, date }) => ({
          type: 'nutrition', beneficiary_id, nutrition_status, meals, recommendations, date,
        })),
        ...healthRecords.map(({ beneficiary_id, height, weight, health_status, date }) => ({
          type: 'health', beneficiary_id, height, weight, health_status, date,
        })),
      ];
      return `${LOCAL_KNOWLEDGE_CONTEXT}\nPublic nutrition knowledge:\n${publicKnowledge}\nRecent project records (use only when relevant; do not reveal beneficiary IDs):\n${JSON.stringify(records)}`;
    } catch (error) {
      console.warn('Could not load chatbot dataset context:', error.message);
      return `${LOCAL_KNOWLEDGE_CONTEXT}\nPublic nutrition knowledge:\n${JSON.stringify(NUTRITION_KNOWLEDGE)}`;
    }
  }

  static fallbackResponse(message, language) {
    if (language === 'ml-IN') {
      if (/(3\s*വയസ്സ്|മൂന്ന്\s*വയസ്സ്|വയസ്സുള്ള).*(ഭക്ഷണം|പോഷക|ആഹാരം|തീറ്റ)|((ഭക്ഷണം|പോഷക|ആഹാരം|തീറ്റ).*(3\s*വയസ്സ്|മൂന്ന്\s*വയസ്സ്|വയസ്സുള്ള))/.test(message)) {
        return `മൂന്ന് വയസ്സുള്ള കുട്ടിക്ക് പുതിയ ഭക്ഷണങ്ങൾ ചെറിയ അളവിൽ പരിചയപ്പെടുത്തി, കുട്ടിക്ക് ഇഷ്ടപ്പെടുന്ന രീതിയിൽ നൽകാം. കുട്ടിയുടെ കൃത്യമായ ഭാരം അറിയിച്ചാൽ അളവ് കൂടുതൽ കൃത്യമായി പറയാം.

ഭക്ഷണത്തിൽ ഉൾപ്പെടുത്താം
- പ്രഭാതഭക്ഷണമായി റാഗി കഞ്ഞി, ഇഡ്ലി, ദോശ, അല്ലെങ്കിൽ പാൽ ചേർത്ത കഞ്ഞി നൽകാം.
- ഉച്ചയ്ക്ക് ചോറ്, പരിപ്പ്/ചെറുപയർ, പച്ചക്കറി, കൂടെ മുട്ടയോ മീനോ നൽകാം.
- വൈകുന്നേരം വാഴപ്പഴം, തൈര്, വേവിച്ച കടല, അല്ലെങ്കിൽ പഴവും നിലക്കടല/എള്ള് പേസ്റ്റും നൽകാം.
- രാത്രി ചോറ് അല്ലെങ്കിൽ ചപ്പാത്തി, പരിപ്പ്, പച്ചക്കറി, മുട്ട/ചിക്കൻ എന്നിവ നൽകാം.

എങ്ങനെ നൽകണം
- ദിവസം 3 പ്രധാന ഭക്ഷണവും 2 ചെറിയ ഇടത്തരം ഭക്ഷണവും നൽകുക. പുതിയ ഭക്ഷണം ഒരേസമയം ചെറിയ അളവിൽ നൽകി കുട്ടിയുടെ പ്രതികരണം ശ്രദ്ധിക്കുക.
- ഭക്ഷണം നന്നായി വേവിച്ച് ചെറിയ കഷണങ്ങളാക്കി നൽകുക; കുട്ടിയെ നിർബന്ധിച്ച് തീറ്റിക്കരുത്.
- ഭാരം, ഉയരം എന്നിവ അങ്കണവാടിയിലെ വളർച്ചാ ചാർട്ടിൽ രേഖപ്പെടുത്തുക. ഭാരം കൂടാത്തത്, ഭക്ഷണം നിരസിക്കുന്നത്, ആവർത്തിച്ചുള്ള വയറിളക്കം/ഛർദ്ദി എന്നിവ ഉണ്ടെങ്കിൽ ആരോഗ്യപ്രവർത്തകനെ കാണിക്കുക.`;
      }
      if (/ഭാരം കുറവ്|ഭാരം കുറഞ്ഞ|പോഷകാഹാരം മെച്ച|വണ്ണം കുറവ്|ദുർബല/.test(message)) {
        return `കുട്ടിയുടെ പ്രായം, ഇപ്പോഴത്തെ ഭാരം, ഉയരം, കഴിഞ്ഞ മാസങ്ങളിലെ വളർച്ച എന്നിവ പരിശോധിക്കണം. പൊതുവായി ദിവസം 3 പ്രധാന ഭക്ഷണവും 2–3 ചെറിയ ഇടത്തരം ഭക്ഷണവും നൽകുക.

ഭക്ഷണത്തിൽ ചോറ്/റാഗി, പരിപ്പ്/ചെറുപയർ, മുട്ട, മീൻ അല്ലെങ്കിൽ ചിക്കൻ, പാൽ/തൈര്, വാഴപ്പഴം, പച്ചക്കറികൾ എന്നിവ ഉൾപ്പെടുത്തുക. ഭക്ഷണത്തിൽ കുറച്ച് എണ്ണയോ നെയ്യോ ചേർക്കാം. കുട്ടിയെ നിർബന്ധിച്ച് തീറ്റിക്കരുത്; ശാന്തമായി ഇരുത്തി കഴിക്കാൻ പ്രോത്സാഹിപ്പിക്കുക.

ഭാരം, ഉയരം എന്നിവ അങ്കണവാടിയിലെ വളർച്ചാ ചാർട്ടിൽ രേഖപ്പെടുത്തുക. ഭാരം തുടർച്ചയായി കൂടാത്തത്, ഭക്ഷണം കഴിക്കാത്തത്, ആവർത്തിച്ചുള്ള വയറിളക്കം/ഛർദ്ദി, വീക്കം, അമിത ക്ഷീണം എന്നിവ ഉണ്ടെങ്കിൽ ഉടൻ ആരോഗ്യപ്രവർത്തകനെ കാണിക്കുക. മരുന്നോ ടോണിക്കോ സ്വയം നൽകരുത്.`;
      }
      // Keep a useful local answer for ordinary Malayalam nutrition questions when the model falls back.
      if (/ഭക്ഷണം|പോഷക|ആഹാരം|തീറ്റ|കുട്ടിക്ക്|വയസ്സുള്ള|ഭാരം|വളർച്ച/.test(message)) {
        return `കുട്ടിയുടെ പ്രായം, ഇപ്പോഴത്തെ ഭാരം, ഉയരം എന്നിവ അറിയിച്ചാൽ നിർദ്ദേശം കൂടുതൽ കൃത്യമായി നൽകാം. പൊതുവായി:

പ്രധാന നിർദ്ദേശങ്ങൾ
- ദിവസം 3 പ്രധാന ഭക്ഷണവും 2–3 ചെറിയ ഇടത്തരം ഭക്ഷണവും നൽകുക. കുട്ടിയെ നിർബന്ധിച്ച് തീറ്റിക്കരുത്; ശാന്തമായി ഇരുത്തി സ്വയം കഴിക്കാൻ പ്രോത്സാഹിപ്പിക്കുക.

ഭക്ഷണത്തിൽ ഉൾപ്പെടുത്താം
- കഞ്ഞി, ചോറ്, റാഗി എന്നിവയ്‌ക്കൊപ്പം പരിപ്പ് അല്ലെങ്കിൽ ചെറുപയർ ചേർക്കുക.
- ദിവസവും ഒരു മുട്ട നൽകാം; ലഭ്യമെങ്കിൽ മീൻ അല്ലെങ്കിൽ ചിക്കൻ നൽകാം.
- പാൽ അല്ലെങ്കിൽ തൈര്, വാഴപ്പഴം, പച്ചക്കറികൾ, നിലക്കടല/എള്ള് ചേർത്ത ഭക്ഷണം എന്നിവ നൽകാം.
- ഭക്ഷണത്തിൽ കുറച്ച് എണ്ണയോ നെയ്യോ ചേർക്കുന്നത് അധിക ഊർജം നൽകാൻ സഹായിക്കും.

ശ്രദ്ധിക്കേണ്ട കാര്യങ്ങൾ
- കൈ കഴുകി ശുചിയായി തയ്യാറാക്കിയ ഭക്ഷണം നൽകുക. ഭക്ഷണത്തിന് മുമ്പ് അധികം വെള്ളമോ ചായയോ നൽകി വയറ് നിറയ്ക്കരുത്.
- ഭാരം, ഉയരം എന്നിവ അങ്കണവാടിയിലെ വളർച്ചാ ചാർട്ടിൽ സ്ഥിരമായി രേഖപ്പെടുത്തുക.

എപ്പോൾ ആരോഗ്യപ്രവർത്തകനെ സമീപിക്കണം
- ഭാരം തുടർച്ചയായി കൂടാത്തത്, ഭക്ഷണം കഴിക്കാത്തത്, ആവർത്തിച്ചുള്ള വയറിളക്കം/ഛർദ്ദി, വീക്കം, അമിത ക്ഷീണം എന്നിവ ഉണ്ടെങ്കിൽ ഉടൻ ആരോഗ്യപ്രവർത്തകനെ കാണിക്കുക. മരുന്നോ ടോണിക്കോ സ്വയം നൽകരുത്.`;
      }
      if (/ഭാരം കുറവ്|ഭാരം കുറഞ്ഞ|പോഷകാഹാരം മെച്ച|വണ്ണം കുറവ്|ദുർബല/.test(message)) {
        return `കുട്ടിയുടെ പ്രായം, ഇപ്പോഴത്തെ ഭാരം, ഉയരം എന്നിവ അറിയിച്ചാൽ നിർദ്ദേശം കൂടുതൽ കൃത്യമായി നൽകാം. പൊതുവായി:

പ്രധാന നിർദ്ദേശങ്ങൾ
- ദിവസം 3 പ്രധാന ഭക്ഷണവും 2–3 ചെറിയ ഇടത്തരം ഭക്ഷണവും നൽകുക. കുട്ടിയെ നിർബന്ധിച്ച് തീറ്റിക്കരുത്; ശാന്തമായി ഇരുത്തി സ്വയം കഴിക്കാൻ പ്രോത്സാഹിപ്പിക്കുക.

ഭക്ഷണത്തിൽ ഉൾപ്പെടുത്താം
- കഞ്ഞി, ചോറ്, റാഗി എന്നിവയ്‌ക്കൊപ്പം പരിപ്പ് അല്ലെങ്കിൽ ചെറുപയർ ചേർക്കുക.
- ദിവസവും ഒരു മുട്ട നൽകാം; ലഭ്യമെങ്കിൽ മീൻ അല്ലെങ്കിൽ ചിക്കൻ നൽകാം.
- പാൽ അല്ലെങ്കിൽ തൈര്, വാഴപ്പഴം, പച്ചക്കറികൾ, നിലക്കടല/എള്ള് ചേർത്ത ഭക്ഷണം എന്നിവ നൽകാം.
- ഭക്ഷണത്തിൽ കുറച്ച് എണ്ണയോ നെയ്യോ ചേർക്കുന്നത് അധിക ഊർജം നൽകാൻ സഹായിക്കും.

ശ്രദ്ധിക്കേണ്ട കാര്യങ്ങൾ
- കൈ കഴുകി ശുചിയായി തയ്യാറാക്കിയ ഭക്ഷണം നൽകുക; ഭക്ഷണത്തിന് മുമ്പ് അധികം വെള്ളമോ ചായയോ നൽകി വയറ് നിറയ്ക്കരുത്.
- ഭാരം, ഉയരം എന്നിവ അങ്കണവാടിയിലെ വളർച്ചാ ചാർട്ടിൽ സ്ഥിരമായി രേഖപ്പെടുത്തുക.

എപ്പോൾ ആരോഗ്യപ്രവർത്തകനെ സമീപിക്കണം
- ഭാരം തുടർച്ചയായി കൂടാത്തത്, ഭക്ഷണം കഴിക്കാത്തത്, ആവർത്തിച്ചുള്ള വയറിളക്കം/ഛർദ്ദി, വീക്കം, അമിത ക്ഷീണം എന്നിവ ഉണ്ടെങ്കിൽ ഉടൻ ആരോഗ്യപ്രവർത്തകനെ കാണിക്കുക. മരുന്നോ ടോണിക്കോ സ്വയം നൽകരുത്.`;
      }
      if (/ഭക്ഷണം|തീറ്റ|പോഷണം/.test(message)) {
        return 'കുട്ടിക്ക് പ്രായത്തിന് അനുയോജ്യമായ വൈവിധ്യമാർന്ന ഭക്ഷണം നൽകുക: ധാന്യങ്ങൾ, പയർവർഗങ്ങൾ, മുട്ട അല്ലെങ്കിൽ മറ്റ് പ്രോട്ടീൻ ഭക്ഷണം, പച്ചക്കറികൾ, പഴങ്ങൾ എന്നിവ ഉൾപ്പെടുത്തുക. ആറുമാസം വരെ മുലപ്പാൽ മാത്രം നൽകുകയും, സംശയമുണ്ടെങ്കിൽ അങ്കണവാടി പ്രവർത്തകയെയോ ആരോഗ്യപ്രവർത്തകനെയോ സമീപിക്കുകയും ചെയ്യുക.';
      }
      if (/വളർച്ച|ഭാരം|ഉയരം/.test(message)) {
        return 'കുട്ടിയുടെ ഭാരം, ഉയരം, വളർച്ച എന്നിവ അങ്കണവാടിയിലെ വളർച്ചാ ചാർട്ടിൽ സ്ഥിരമായി രേഖപ്പെടുത്തുക. വളർച്ചയിൽ ആശങ്കയുണ്ടെങ്കിൽ ആരോഗ്യപ്രവർത്തകന്റെ പരിശോധന തേടുക.';
      }
      if (/ആരോഗ്യം|അസുഖം|പനി|ചുമ|വയറിളക്കം/.test(message)) {
        return 'പനി, ശ്വാസതടസം, തുടർച്ചയായ ഛർദ്ദി, വയറിളക്കം, അമിതമായ ക്ഷീണം എന്നിവ ഉണ്ടെങ്കിൽ കുട്ടിയെ ഉടൻ ആരോഗ്യകേന്ദ്രത്തിൽ കാണിക്കുക. മരുന്ന് സ്വയം നൽകാതിരിക്കുക.';
      }
      if (/കുത്തിവയ്പ്പ്|വാക്സിൻ|പ്രതിരോധ/.test(message)) {
        return 'കുട്ടിയുടെ വാക്സിനേഷൻ കാർഡ് പരിശോധിച്ച് കുത്തിവയ്പ്പുകൾ സമയത്ത് നൽകുക. തീയതി സംശയമുണ്ടെങ്കിൽ അങ്കണവാടി പ്രവർത്തകയെയോ ആരോഗ്യപ്രവർത്തകനെയോ ചോദിക്കുക.';
      }
      return 'കുട്ടിയുടെ പോഷണം, വളർച്ച, പ്രതിരോധ കുത്തിവയ്പ്പ് എന്നിവയ്ക്കായി അങ്കണവാടി പ്രവർത്തകയെയോ ആരോഗ്യപ്രവർത്തകനെയോ സമീപിക്കുക. അടിയന്തര ലക്ഷണങ്ങൾ ഉണ്ടെങ്കിൽ ഉടൻ ചികിത്സ തേടുക.';
    }
    if (/underweight|poor growth|low weight|malnutrition/i.test(message)) {
      return `The child's age, current weight, height, and recent growth trend are important, so record them on the Anganwadi growth chart and share them with a health worker. General counselling:

Key actions
- Offer 3 small main meals plus 2–3 nutritious snacks each day. Sit with the child, encourage self-feeding, and never force-feed.
- Enrich meals with rice or ragi plus dal or green gram, egg, fish or chicken, and vegetables.
- Offer milk or curd, banana, and a little oil or ghee in meals when suitable for the child.
- Use clean water and handwashing, and avoid filling the child with tea, sugary drinks, or excess water before meals.

Monitoring and referral
- Weigh and measure the child regularly and review the growth chart.
- Contact the Anganwadi worker or health professional if weight is not increasing, appetite is persistently poor, or there is repeated diarrhoea, vomiting, swelling, or unusual tiredness. Do not give medicines or tonics without professional advice.`;
    }
    if (/food|feed|nutrition/i.test(message)) {
      return 'Offer age-appropriate varied foods including grains, pulses, eggs or other protein, vegetables, and fruit. Breast milk alone is recommended until six months; contact an Anganwadi or health worker for personalised guidance.';
    }
    return 'I can help with child nutrition, growth monitoring, vaccination, and Anganwadi activities. Please contact an Anganwadi or health worker for personalised medical guidance.';
  }

  static isUsableResponse(content, language) {
    if (!content || content.length > 3_000) return false;
    if (/<think>|<\/think>|^Okay, the user|^Let me think|^I need to respond/i.test(content)) return false;
    if (language === 'ml-IN') return (content.match(/[\u0D00-\u0D7F]/g) || []).length >= 8;
    return true;
  }

  static sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];

    return history
      .slice(-MAX_HISTORY_MESSAGES)
      .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.text === 'string')
      .map((item) => ({
        role: item.role,
        content: item.text.trim().slice(0, MAX_MESSAGE_LENGTH),
      }))
      .filter((item) => item.content);
  }

  static normalizeLanguage(language) {
    return language === 'ml-IN' ? 'ml-IN' : 'en-IN';
  }

  static detectLanguage(message, requestedLanguage) {
    return /[\u0D00-\u0D7F]/.test(message) ? 'ml-IN' : this.normalizeLanguage(requestedLanguage);
  }

  static async processMessage(rawMessage, history = [], language = 'en-IN') {
    const message = typeof rawMessage === 'string' ? rawMessage.trim() : '';
    if (!message) {
      const error = new Error('A message is required.');
      error.statusCode = 400;
      throw error;
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      const error = new Error(`Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
      error.statusCode = 400;
      throw error;
    }

    const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
    const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
    const selectedLanguage = this.detectLanguage(message, language);
    const languageInstruction = selectedLanguage === 'ml-IN'
      ? 'LANGUAGE RULE: The user wrote Malayalam or selected Malayalam. Reply entirely in simple, natural Malayalam script. Use the public nutrition knowledge supplied below, but adapt it to the exact question. Do not reply in English, do not transliterate Malayalam, do not invent quantities or medical thresholds, and do not include hidden reasoning.'
      : 'LANGUAGE RULE: Reply entirely in natural English. Do not include Malayalam or another language.';
    const datasetContext = await this.getDatasetContext();
    const messages = [
      { role: 'system', content: `${ASSISTANT_INSTRUCTIONS}\n${languageInstruction}\nPreferred response language: ${selectedLanguage}.\n\n${datasetContext}` },
      ...this.sanitizeHistory(history),
      { role: 'user', content: message },
    ];

    let response;
    try {
        response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          think: true,
          options: { num_predict: 2048, temperature: 0.35 },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (cause) {
      console.error('Local Ollama chatbot request failed:', cause.message);
      return {
        response: this.fallbackResponse(message, selectedLanguage),
        provider: 'local-fallback',
        model,
        language: selectedLanguage,
        timestamp: new Date().toISOString(),
      };
    }

    const payload = await response.json().catch(() => ({}));
    const rawContent = payload.message?.content?.trim() || '';
    const content = rawContent.includes('</think>')
      ? rawContent.slice(rawContent.lastIndexOf('</think>') + '</think>'.length).trim()
      : (rawContent.includes('<think>') ? '' : rawContent);
    if (!response.ok || !this.isUsableResponse(content, selectedLanguage)) {
      console.error('Ollama chatbot response failed:', payload.error || response.statusText);
      return {
        response: this.fallbackResponse(message, selectedLanguage),
        provider: 'local-fallback',
        model,
        language: selectedLanguage,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      response: content,
      provider: 'ollama',
      model,
      language: selectedLanguage,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = ChatbotService;
