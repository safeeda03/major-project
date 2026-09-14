# PoshanAI - Child Health & Nutrition Management System

## Overview
PoshanAI is a comprehensive health and nutrition management system designed for Anganwadi centres, workers, supervisors, and parents. It provides tools for tracking child health, nutrition, vaccination, and attendance records, along with AI-powered insights and GIS-based clustering.

## Technology Stack

### Frontend
- **React.js** - UI Framework
- **Vite** - Build Tool
- **React Router** - Navigation
- **Chart.js / Recharts** - Data Visualization
- **Leaflet** - Maps
- **Axios** - HTTP Client

### Backend
- **Node.js** - Runtime
- **Express.js** - Backend Framework
- **MongoDB** - Database
- **JWT** - Authentication
- **Bcrypt** - Password Hashing

### AI/ML Services
- **Python + Scikit-learn** - ML Models
- **KNN** - Growth Classification Algorithm
- **Tesseract OCR** - Document Processing
- **LLM API** - Chatbot
- **Speech-to-Text** - Voice Input

## Project Structure

```
poshanai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Cards.jsx
│   │   │   └── Charts.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── WorkerDashboard.jsx
│   │   │   ├── SupervisorDashboard.jsx
│   │   │   ├── ParentDashboard.jsx
│   │   │   ├── Beneficiary.jsx
│   │   │   ├── Health.jsx
│   │   │   ├── Nutrition.jsx
│   │   │   ├── Vaccination.jsx
│   │   │   ├── Attendance.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── Chatbot.jsx
│   │   │   └── Map.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── backend/
    ├── controllers/
    │   ├── authController.js
    │   ├── beneficiaryController.js
    │   ├── healthController.js
    │   ├── nutritionController.js
    │   ├── vaccinationController.js
    │   ├── attendanceController.js
    │   └── reportController.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── beneficiaryRoutes.js
    │   ├── healthRoutes.js
    │   ├── nutritionRoutes.js
    │   ├── vaccinationRoutes.js
    │   ├── attendanceRoutes.js
    │   └── reportRoutes.js
    ├── models/
    │   ├── User.js
    │   ├── Beneficiary.js
    │   ├── HealthRecord.js
    │   ├── NutritionRecord.js
    │   ├── Vaccination.js
    │   ├── Attendance.js
    │   └── AnganwadiCentre.js
    ├── services/
    │   ├── aiService.js
    │   ├── ocrService.js
    │   └── reportService.js
    ├── server.js
    ├── package.json
    └── .env
```

## User Roles

### Anganwadi Worker
- Add/update beneficiaries, attendance, health, nutrition and vaccination data
- Access OCR for document processing
- Use AI chatbot for queries
- Generate reports

### Supervisor
- Monitor centres performance
- View statistics and reports
- Access GIS-based information
- Manage alerts and notifications

### Parent/Guardian
- View child health, nutrition, vaccination records
- Track attendance
- Receive recommendations
- Access child growth charts

### Administrator
- Manage users and centres
- Oversee system data
- Configure system settings

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Python (for ML services)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure .env with your MongoDB URI and other settings
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Development Phases

### Phase 1: Project Setup ✅
- Project structure created
- Frontend and backend initialized
- Basic configuration files set up

### Phase 2: UI Development ✅
- React components created
- Page layouts implemented
- Navigation structure established
- Chart visualizations with Chart.js
- Map integration with Leaflet

### Phase 3: Backend Development ✅
- Express server set up
- Database models created
- API routes implemented
- Controllers and services configured
- Authentication with JWT

### Phase 4: Database Integration ✅
- MongoDB connection setup
- Seed data creation
- CRUD operations testing

### Phase 5: AI/ML Integration ✅
- Health/growth classification model
- Risk prediction algorithms
- Recommendation engine

### Phase 6: OCR Implementation ✅
- Document upload functionality
- Tesseract OCR integration
- Data verification workflow

### Phase 7: Chatbot Development ✅
- Knowledge-based chatbot
- Query processing
- Quick questions feature

### Phase 8: GIS Implementation ✅
- Centre coordinates mapping
- Risk level visualization
- Map visualization with Leaflet

### Phase 9: Integration & Testing ✅
- End-to-end testing
- User role testing
- API integration
- Error handling and loading states

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/register` - User registration (admin)

### Beneficiaries
- `GET /api/beneficiaries` - Get all beneficiaries
- `GET /api/beneficiaries/:id` - Get beneficiary by ID
- `POST /api/beneficiaries` - Create new beneficiary
- `PUT /api/beneficiaries/:id` - Update beneficiary
- `DELETE /api/beneficiaries/:id` - Delete beneficiary

### Health Records
- `GET /api/health` - Get all health records
- `GET /api/health/:id` - Get health record by ID
- `POST /api/health` - Create health record
- `PUT /api/health/:id` - Update health record
- `DELETE /api/health/:id` - Delete health record

### Nutrition Records
- `GET /api/nutrition` - Get all nutrition records
- `GET /api/nutrition/:id` - Get nutrition record by ID
- `POST /api/nutrition` - Create nutrition record
- `PUT /api/nutrition/:id` - Update nutrition record
- `DELETE /api/nutrition/:id` - Delete nutrition record

### Vaccination Records
- `GET /api/vaccination` - Get all vaccination records
- `GET /api/vaccination/:id` - Get vaccination record by ID
- `POST /api/vaccination` - Create vaccination record
- `PUT /api/vaccination/:id` - Update vaccination record
- `DELETE /api/vaccination/:id` - Delete vaccination record

### Attendance Records
- `GET /api/attendance` - Get all attendance records
- `GET /api/attendance/:id` - Get attendance record by ID
- `POST /api/attendance` - Create attendance record
- `PUT /api/attendance/:id` - Update attendance record
- `DELETE /api/attendance/:id` - Delete attendance record

### Reports
- `POST /api/reports/generate` - Generate report
- `GET /api/reports/alerts` - Get alerts

### OCR
- `POST /api/ocr/process` - Process document with OCR

### Chatbot
- `POST /api/chatbot/message` - Send message to chatbot

### GIS
- `GET /api/gis/centres` - Get all centres with coordinates
- `GET /api/gis/clustering` - Get clustering analysis

## Database Schema

### User Collection
```javascript
{
  user_id: String,
  name: String,
  phone: String,
  password: String,
  role: String // 'worker', 'supervisor', 'parent', 'admin'
}
```

### Beneficiary Collection
```javascript
{
  beneficiary_id: String,
  name: String,
  dob: Date,
  gender: String,
  parent_id: String,
  anganwadi_id: String
}
```

### HealthRecord Collection
```javascript
{
  beneficiary_id: String,
  height: Number,
  weight: Number,
  bmi: Number,
  health_status: String,
  date: Date
}
```

### NutritionRecord Collection
```javascript
{
  beneficiary_id: String,
  nutrition_status: String,
  meals: String,
  recommendations: String,
  date: Date
}
```

### Vaccination Collection
```javascript
{
  beneficiary_id: String,
  vaccine: String,
  date: Date,
  next_due_date: Date
}
```

### Attendance Collection
```javascript
{
  beneficiary_id: String,
  date: Date,
  status: String // 'present', 'absent', 'half-day'
}
```

### AnganwadiCentre Collection
```javascript
{
  centre_id: String,
  name: String,
  latitude: Number,
  longitude: Number
}
```

## Features

### Core Features
- User authentication and role-based access
- Beneficiary management
- Health record tracking with BMI calculation
- Nutrition assessment and recommendations
- Vaccination scheduling and tracking
- Attendance monitoring

### Advanced Features
- AI-powered growth classification
- Health risk prediction
- OCR document processing
- AI chatbot with voice input
- GIS-based clustering and mapping
- Automated reports and alerts

## Contributing
This project is currently in development. Please follow the development phases outlined above when contributing.

## License
ISC