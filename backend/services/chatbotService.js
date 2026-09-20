const OpenAI = require('openai');

const MAX_MESSAGE_LENGTH = 4_000;
const MAX_HISTORY_MESSAGES = 8;

const ASSISTANT_INSTRUCTIONS = `You are PoshanAI, a helpful general-purpose assistant for families and Anganwadi workers in India. Answer the user's question directly, clearly, and respectfully. You may answer general-knowledge questions as well as questions about child health, nutrition, and vaccination. For medical questions, provide educational information only, do not diagnose, and advise urgent professional care for emergency symptoms. Never request passwords, API keys, Aadhaar numbers, or other unnecessary sensitive information.`;

class ChatbotService {
  static sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];

    return history
      .slice(-MAX_HISTORY_MESSAGES)
      .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.text === 'string')
      .map((item) => ({
        role: item.role,
        text: item.text.trim().slice(0, MAX_MESSAGE_LENGTH),
      }))
      .filter((item) => item.text);
  }

  static buildInput(message, history) {
    const transcript = this.sanitizeHistory(history)
      .map((item) => `${item.role === 'assistant' ? 'Assistant' : 'User'}: ${item.text}`)
      .join('\n');

    return transcript ? `${transcript}\nUser: ${message}` : message;
  }

  static async processMessage(rawMessage, history = []) {
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

    if (!process.env.OPENAI_API_KEY) {
      return {
        response: 'AI chat is not configured yet. Add OPENAI_API_KEY to backend/.env, then restart the backend server.',
        provider: 'unconfigured',
        timestamp: new Date().toISOString(),
      };
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const request = {
      model: process.env.OPENAI_MODEL || 'gpt-5',
      instructions: ASSISTANT_INSTRUCTIONS,
      input: this.buildInput(message, history),
      max_output_tokens: 700,
      store: false,
    };

    if (process.env.OPENAI_ENABLE_WEB_SEARCH === 'true') {
      request.tools = [{ type: 'web_search' }];
    }

    try {
      const completion = await client.responses.create(request);
      const response = completion.output_text && completion.output_text.trim();

      if (!response) {
        throw new Error('The AI provider returned an empty response.');
      }

      return {
        response,
        provider: 'openai',
        model: request.model,
        timestamp: new Date().toISOString(),
      };
    } catch (cause) {
      console.error('OpenAI chatbot request failed:', cause.message);
      let message = 'The AI assistant is temporarily unavailable. Please try again shortly.';
      let statusCode = 503;

      if (cause.code === 'credit_balance_exhausted' || cause.type === 'insufficient_quota') {
        message = 'The AI assistant needs OpenAI API credits before it can reply. Add credits to the OpenAI project billing page, then try again.';
        statusCode = 402;
      } else if (cause.status === 401) {
        message = 'The AI assistant API key is invalid or has been revoked. Update OPENAI_API_KEY in backend/.env, then restart the server.';
        statusCode = 401;
      } else if (cause.status === 429) {
        message = 'The AI assistant has reached its request limit. Please try again shortly.';
        statusCode = 429;
      }

      const error = new Error(message);
      error.statusCode = statusCode;
      throw error;
    }
  }
}

module.exports = ChatbotService;
