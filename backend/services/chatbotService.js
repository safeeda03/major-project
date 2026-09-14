// Chatbot Service for AI-powered assistance
// This service provides intelligent responses about child health, nutrition, and vaccination

class ChatbotService {
  // Knowledge base for common questions
  static knowledgeBase = {
    nutrition: {
      keywords: ['nutrition', 'food', 'diet', 'eat', 'feed', 'meal', 'hungry'],
      responses: [
        'For children under 2 years, breast milk is the best source of nutrition. Continue breastfeeding along with complementary foods.',
        'A balanced diet for children should include proteins (dal, eggs, meat), carbohydrates (rice, wheat), vegetables, and fruits.',
        'Children between 1-3 years need about 1,000-1,400 calories daily depending on their activity level.',
        'Include iron-rich foods like spinach, lentils, and fortified cereals to prevent anemia.',
        'Vitamin A is essential for vision and immunity - include carrots, sweet potatoes, and mangoes in the diet.'
      ]
    },
    vaccination: {
      keywords: ['vaccine', 'vaccination', 'immunization', 'shot', 'dose', 'bcg', 'polio'],
      responses: [
        'BCG vaccine should be given at birth or as early as possible within the first month.',
        'Polio vaccine is given at birth, 6 weeks, 10 weeks, and 14 weeks, followed by booster doses.',
        'DPT (Diphtheria, Pertussis, Tetanus) vaccine is given at 6 weeks, 10 weeks, and 14 weeks.',
        'MMR (Measles, Mumps, Rubella) vaccine is given at 9 months and 15 months.',
        'Hepatitis B vaccine is given at birth, 6 weeks, and 14 weeks.'
      ]
    },
    health: {
      keywords: ['health', 'sick', 'fever', 'cold', 'cough', 'medicine', 'doctor'],
      responses: [
        'If your child has a fever above 100.4°F (38°C), consult a healthcare provider.',
        'For mild colds, ensure the child gets plenty of rest and fluids. Use saline drops for congestion.',
        'Regular health check-ups are recommended at 1, 2, 3, 4, 5, 6, 9, 12, 15, 18, and 24 months.',
        'Watch for danger signs: difficulty breathing, dehydration, lethargy, or fever lasting more than 3 days.',
        'Keep track of your child\'s growth parameters - weight, height, and head circumference.'
      ]
    },
    growth: {
      keywords: ['growth', 'weight', 'height', 'develop', 'milestone'],
      responses: [
        'Normal weight gain for infants is about 150-200g per week in the first 3 months.',
        'Children typically double their birth weight by 5 months and triple it by 1 year.',
        'Key developmental milestones: sitting at 6 months, crawling at 8-9 months, walking at 12 months.',
        'If your child is not meeting milestones, consult your healthcare provider for assessment.',
        'Regular growth monitoring helps identify nutritional issues early.'
      ]
    },
    general: {
      keywords: ['hello', 'hi', 'help', 'what', 'how'],
      responses: [
        'Hello! I\'m here to help with questions about child health, nutrition, and vaccination.',
        'I can provide information about feeding guidelines, vaccination schedules, and general child health.',
        'Feel free to ask about nutrition requirements, vaccination due dates, or health concerns.',
        'For specific medical advice, please consult with a healthcare professional.'
      ]
    }
  };

  // Process user message and generate response
  static async processMessage(message) {
    try {
      const lowerMessage = message.toLowerCase();
      
      // Find matching category
      let matchedCategory = null;
      let maxMatches = 0;
      
      for (const [category, data] of Object.entries(this.knowledgeBase)) {
        const matches = data.keywords.filter(keyword => lowerMessage.includes(keyword));
        if (matches.length > maxMatches) {
          maxMatches = matches.length;
          matchedCategory = category;
        }
      }
      
      // Get response from matched category
      let response;
      if (matchedCategory && maxMatches > 0) {
        const responses = this.knowledgeBase[matchedCategory].responses;
        response = responses[Math.floor(Math.random() * responses.length)];
      } else {
        response = this.getFallbackResponse(lowerMessage);
      }
      
      return {
        response,
        timestamp: new Date(),
        category: matchedCategory || 'general'
      };
    } catch (error) {
      throw new Error(`Chatbot Service error: ${error.message}`);
    }
  }

  // Fallback response for unmatched queries
  static getFallbackResponse(message) {
    const fallbackResponses = [
      'I\'m not sure about that specific question. Could you ask about nutrition, vaccination, or general child health?',
      'For detailed medical advice, please consult with a healthcare professional at your local Anganwadi centre.',
      'I can help with questions about child nutrition, vaccination schedules, and general health guidelines.',
      'That\'s a good question. For specific guidance, please speak with your healthcare provider.'
    ];
    
    // Check for age-specific questions
    if (message.includes('year') || message.includes('month') || message.includes('old')) {
      const ageMatch = message.match(/(\d+)\s*(year|month|old)/i);
      if (ageMatch) {
        const age = ageMatch[1];
        return `For a ${ageMatch[2]}-old, specific nutrition and vaccination needs apply. Would you like information about general guidelines for this age group?`;
      }
    }
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }

  // Get quick questions for the user
  static getQuickQuestions() {
    return [
      'What are the nutritional requirements for a 3-year-old?',
      'When is the next vaccination due?',
      'What are the signs of malnutrition?',
      'How much should my 2-year-old eat daily?',
      'What vaccines are due at 6 months?'
    ];
  }
}

module.exports = ChatbotService;