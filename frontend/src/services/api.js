const API_BASE_URL = 'http://localhost:5000/api';

// Mock login for testing without database
const mockUsers = {
  '9876543210': { id: 'USR001', name: 'Rajesh Kumar', phone: '9876543210', role: 'worker' },
  '9876543211': { id: 'USR002', name: 'Sunita Devi', phone: '9876543211', role: 'supervisor' },
  '9876543212': { id: 'USR003', name: 'Amit Sharma', phone: '9876543212', role: 'parent' },
  '9876543213': { id: 'USR004', name: 'Admin User', phone: '9876543213', role: 'admin' }
};

// Auth API
export const authAPI = {
  login: async (credentials) => {
    // Mock login for testing without database
    const { phone, password, role } = credentials;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (mockUsers[phone] && password === 'password123' && mockUsers[phone].role === role) {
      return {
        token: 'mock-jwt-token-' + Date.now(),
        user: mockUsers[phone]
      };
    }
    
    throw new Error('Invalid credentials');
  },
  
  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST'
    });
    return response.json();
  }
};

// Beneficiary API
export const beneficiaryAPI = {
  getAll: async () => {
    // Mock response
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      { _id: '1', beneficiary_id: 'BEN001', name: 'Rahul Kumar', dob: '2023-01-15', gender: 'male', parent_id: 'USR003', anganwadi_id: 'ANG001' },
      { _id: '2', beneficiary_id: 'BEN002', name: 'Priya Singh', dob: '2022-06-20', gender: 'female', parent_id: 'USR003', anganwadi_id: 'ANG001' }
    ];
  },
  
  getById: async (id) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { _id: id, beneficiary_id: 'BEN001', name: 'Rahul Kumar', dob: '2023-01-15', gender: 'male', parent_id: 'USR003', anganwadi_id: 'ANG001' };
  },
  
  create: async (data) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { message: 'Beneficiary created successfully', beneficiary: { ...data, _id: Date.now().toString() } };
  },
  
  update: async (id, data) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { message: 'Beneficiary updated successfully', beneficiary: { ...data, _id: id } };
  },
  
  delete: async (id) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { message: 'Beneficiary deleted successfully' };
  }
};

// Health API
export const healthAPI = {
  getAll: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      { _id: '1', beneficiary_id: 'BEN001', height: 75, weight: 9.5, bmi: 16.89, health_status: 'normal', date: '2024-01-15' }
    ];
  },
  
  create: async (data) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const heightInMeters = data.height / 100;
    const bmi = (data.weight / (heightInMeters * heightInMeters)).toFixed(2);
    return { message: 'Health record created successfully', healthRecord: { ...data, bmi, _id: Date.now().toString() } };
  },
  
  getByBeneficiary: async (beneficiaryId) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [{ _id: '1', beneficiary_id: beneficiaryId, height: 75, weight: 9.5, bmi: 16.89, health_status: 'normal', date: '2024-01-15' }];
  }
};

// Attendance API
export const attendanceAPI = {
  getAll: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      { _id: '1', beneficiary_id: 'BEN001', date: new Date().toISOString().split('T')[0], status: 'present' }
    ];
  },
  
  create: async (data) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { message: 'Attendance record created successfully', attendance: { ...data, _id: Date.now().toString() } };
  },
  
  getByBeneficiary: async (beneficiaryId) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [{ _id: '1', beneficiary_id: beneficiaryId, date: new Date().toISOString().split('T')[0], status: 'present' }];
  },
  
  getByDate: async (date) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [{ _id: '1', beneficiary_id: 'BEN001', date: date, status: 'present' }];
  }
};

// Nutrition API
export const nutritionAPI = {
  getAll: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      { _id: '1', beneficiary_id: 'BEN001', nutrition_status: 'normal', meals: 'Balanced diet', recommendations: 'Continue current diet', date: '2024-01-15' }
    ];
  },
  
  create: async (data) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { message: 'Nutrition record created successfully', nutritionRecord: { ...data, _id: Date.now().toString() } };
  }
};

// Vaccination API
export const vaccinationAPI = {
  getAll: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      { _id: '1', beneficiary_id: 'BEN001', vaccine: 'BCG', date: '2023-01-20', next_due_date: '2023-08-20' }
    ];
  },
  
  create: async (data) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { message: 'Vaccination record created successfully', vaccination: { ...data, _id: Date.now().toString() } };
  },
  
  getByBeneficiary: async (beneficiaryId) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [{ _id: '1', beneficiary_id: beneficiaryId, vaccine: 'BCG', date: '2023-01-20', next_due_date: '2023-08-20' }];
  }
};

// Report API
export const reportAPI = {
  generate: async (reportType, dateRange) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { 
      reportType, 
      data: [{ _id: '1', name: 'Sample Data' }], 
      count: 1, 
      generatedAt: new Date() 
    };
  },
  
  getAlerts: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      { type: 'health', severity: 'high', message: '2 children showing growth risks', count: 2 },
      { type: 'vaccination', severity: 'medium', message: '5 vaccinations due this week', count: 5 }
    ];
  }
};

// OCR API
export const ocrAPI = {
  processDocument: async (file) => {
    const formData = new FormData();
    formData.append('document', file);
    const response = await fetch('/api/ocr/process', { method: 'POST', body: formData });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'OCR processing failed');
    return data;
  }
};

// Chatbot API
/* Retired local chatbot mock retained only for historical context.
const retiredChatbotMock = {
  sendMessage: async (message) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const lowerMessage = message.toLowerCase();
    let response = 'I understand your question. Let me help you with that information.';
    
    if (lowerMessage.includes('nutrition') || lowerMessage.includes('food')) {
      response = 'For children under 2 years, breast milk is the best source of nutrition. A balanced diet should include proteins, carbohydrates, vegetables, and fruits.';
    } else if (lowerMessage.includes('vaccine') || lowerMessage.includes('vaccination')) {
      response = 'BCG vaccine should be given at birth. Polio vaccine is given at birth, 6 weeks, 10 weeks, and 14 weeks. DPT vaccine is given at 6, 10, and 14 weeks.';
    } else if (lowerMessage.includes('health') || lowerMessage.includes('sick')) {
      response = 'If your child has a fever above 100.4°F, consult a healthcare provider. Regular health check-ups are recommended at 1, 2, 3, 4, 5, 6, 9, 12, 15, 18, and 24 months.';
    } else if (lowerMessage.includes('growth') || lowerMessage.includes('weight')) {
      response = 'Normal weight gain for infants is about 150-200g per week in the first 3 months. Children typically double their birth weight by 5 months.';
    }
    
    return {
      response,
      timestamp: new Date(),
      category: 'general'
    };
  }
};
*/

export const chatbotAPI = {
  sendMessage: async (message, history = []) => {
    const response = await fetch('/api/chatbot/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Could not reach the AI assistant');
    return data;
  }
};

// GIS API
export const gisAPI = {
  getCentres: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      { _id: '1', centre_id: 'ANG001', name: 'Anganwadi Centre A', latitude: 28.6139, longitude: 77.2090, address: 'Sector 1, New Delhi' },
      { _id: '2', centre_id: 'ANG002', name: 'Anganwadi Centre B', latitude: 28.6150, longitude: 77.2100, address: 'Sector 2, New Delhi' },
      { _id: '3', centre_id: 'ANG003', name: 'Anganwadi Centre C', latitude: 28.6170, longitude: 77.2080, address: 'Sector 3, New Delhi' }
    ];
  },
  
  getClustering: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      clusters: [
        {
          id: 1,
          centers: ['Centre A', 'Centre B'],
          riskLevel: 'low',
          coordinates: { lat: 28.6139, lng: 77.2090 }
        },
        {
          id: 2,
          centers: ['Centre C'],
          riskLevel: 'high',
          coordinates: { lat: 28.6170, lng: 77.2080 }
        }
      ]
    };
  }
};
