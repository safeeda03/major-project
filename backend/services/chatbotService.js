const MAX_MESSAGE_LENGTH = 4_000;
const MAX_HISTORY_MESSAGES = 8;
const REQUEST_TIMEOUT_MS = 45_000;

const ASSISTANT_INSTRUCTIONS = `You are PoshanAI, a helpful assistant for families and Anganwadi workers in India. Answer questions about child nutrition, Anganwadi activities, growth monitoring, child development, food, vaccination, and related general health topics. Give practical, clear, respectful educational guidance. Do not diagnose or invent project, child, or beneficiary data. Do not invent official schemes, citations, or statistics. Do not ask for passwords, API keys, Aadhaar numbers, or other unnecessary sensitive information. For emergencies, advise the user to seek urgent professional care. Reply in the language requested by the user: Malayalam for ml-IN and English for en-IN. Return only the final answer, without hidden reasoning or thinking markers.`;

class ChatbotService {
  static fallbackResponse(message, language) {
    if (language === 'ml-IN') {
      if (/ഭക്ഷണം|തീറ്റ|പോഷണം/.test(message)) {
        return 'കുട്ടിക്ക് പ്രായത്തിന് അനുയോജ്യമായ വൈവിധ്യമാർന്ന ഭക്ഷണം നൽകുക: ധാന്യങ്ങൾ, പയർവർഗങ്ങൾ, മുട്ട അല്ലെങ്കിൽ മറ്റ് പ്രോട്ടീൻ ഭക്ഷണം, പച്ചക്കറികൾ, പഴങ്ങൾ എന്നിവ ഉൾപ്പെടുത്തുക. ആറുമാസം വരെ മുലപ്പാൽ മാത്രം നൽകുകയും, സംശയമുണ്ടെങ്കിൽ അങ്കണവാടി പ്രവർത്തകയെയോ ആരോഗ്യപ്രവർത്തകനെയോ സമീപിക്കുകയും ചെയ്യുക.';
      }
      if (/വളർച്ച|ഭാരം|ഉയരം/.test(message)) {
        return 'കുട്ടിയുടെ ഭാരം, ഉയരം, വളർച്ച എന്നിവ അങ്കണവാടിയിലെ വളർച്ചാ ചാർട്ടിൽ സ്ഥിരമായി രേഖപ്പെടുത്തുക. വളർച്ചയിൽ ആശങ്കയുണ്ടെങ്കിൽ ആരോഗ്യപ്രവർത്തകന്റെ പരിശോധന തേടുക.';
      }
      return 'കുട്ടിയുടെ പോഷണം, വളർച്ച, പ്രതിരോധ കുത്തിവയ്പ്പ് എന്നിവയ്ക്കായി അങ്കണവാടി പ്രവർത്തകയെയോ ആരോഗ്യപ്രവർത്തകനെയോ സമീപിക്കുക. അടിയന്തര ലക്ഷണങ്ങൾ ഉണ്ടെങ്കിൽ ഉടൻ ചികിത്സ തേടുക.';
    }
    if (/food|feed|nutrition/i.test(message)) {
      return 'Offer age-appropriate varied foods including grains, pulses, eggs or other protein, vegetables, and fruit. Breast milk alone is recommended until six months; contact an Anganwadi or health worker for personalised guidance.';
    }
    return 'I can help with child nutrition, growth monitoring, vaccination, and Anganwadi activities. Please contact an Anganwadi or health worker for personalised medical guidance.';
  }

  static isUsableResponse(content, language) {
    if (!content || content.length > 900) return false;
    if (/Okay, let me|Let me think|Possible response|Wait, the user|I need to respond|The answer should/i.test(content)) return false;
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
      ? 'LANGUAGE RULE: The user wrote Malayalam or selected Malayalam. Reply entirely in natural Malayalam script. Do not reply in English, do not transliterate Malayalam, and do not include English explanations. Use short, clear Malayalam sentences.'
      : 'LANGUAGE RULE: Reply entirely in natural English. Do not include Malayalam or another language.';
    const messages = [
      { role: 'system', content: `${ASSISTANT_INSTRUCTIONS}\n${languageInstruction}\nPreferred response language: ${selectedLanguage}.` },
      ...this.sanitizeHistory(history),
      { role: 'user', content: `${message}\n\n/no_think` },
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
          think: false,
          options: { num_predict: 768, temperature: 0.2 },
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
