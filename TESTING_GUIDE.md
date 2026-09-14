# PoshanAI Testing Guide

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Git

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Configure `.env` file:
```
MONGODB_URI=mongodb://localhost:27017/poshanai
PORT=5000
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

Start MongoDB (if using local installation):
```bash
# On Windows
net start MongoDB

# On Mac/Linux
sudo systemctl start mongod
# or
mongod
```

Seed the database:
```bash
npm run seed
```

Start the backend server:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Start the frontend development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173` (or another port as shown by Vite)

## Test Credentials

After running the seed script, use these credentials to test:

### Worker Login
- Phone: `9876543210`
- Password: `password123`
- Role: Worker

### Supervisor Login
- Phone: `9876543211`
- Password: `password123`
- Role: Supervisor

### Parent Login
- Phone: `9876543212`
- Password: `password123`
- Role: Parent

### Admin Login
- Phone: `9876543213`
- Password: `password123`
- Role: Admin

## Testing Checklist

### Authentication Testing
- [ ] Login with worker credentials
- [ ] Login with supervisor credentials
- [ ] Login with parent credentials
- [ ] Login with admin credentials
- [ ] Test invalid credentials
- [ ] Test logout functionality
- [ ] Test role-based redirects

### Worker Dashboard Testing
- [ ] View dashboard statistics
- [ ] View activity list
- [ ] View pending tasks
- [ ] View attendance trend chart
- [ ] View nutrition status chart

### Beneficiary Management Testing
- [ ] Add new beneficiary
- [ ] Verify beneficiary data is saved
- [ ] Test form validation
- [ ] View success/error messages

### Health Records Testing
- [ ] Add health measurement
- [ ] Verify BMI calculation
- [ ] Check health status determination
- [ ] Test form validation

### Nutrition Records Testing
- [ ] Add nutrition assessment
- [ ] Select different nutrition statuses
- [ ] Add meal details
- [ ] Add recommendations

### Vaccination Records Testing
- [ ] Add vaccination record
- [ ] Select different vaccines
- [ ] Set vaccination date
- [ ] Set next due date

### Attendance Testing
- [ ] Mark attendance as present
- [ ] Mark attendance as absent
- [ ] Mark attendance as half-day
- [ ] Verify date selection

### Reports Testing
- [ ] Generate beneficiary report
- [ ] Generate health report
- [ ] Generate nutrition report
- [ ] Generate vaccination report
- [ ] View alerts section

### Chatbot Testing
- [ ] Send message to chatbot
- [ ] Test nutrition-related questions
- [ ] Test vaccination-related questions
- [ ] Test health-related questions
- [ ] Use quick question buttons

### OCR Testing
- [ ] Upload document/image
- [ ] Process document with OCR
- [ ] View extracted data
- [ ] Verify data accuracy
- [ ] Test verification workflow

### GIS Map Testing (Supervisor/Admin only)
- [ ] View map with centre markers
- [ ] Check risk level colors
- [ ] Filter by region
- [ ] View centre details
- [ ] Toggle risk areas

### Navigation Testing
- [ ] Navigate between pages
- [ ] Test sidebar links
- [ ] Test navbar links
- [ ] Verify role-based menu items

### Error Handling Testing
- [ ] Test with backend server offline
- [ ] Test with invalid data
- [ ] Test network errors
- [ ] Verify error messages display

## API Testing

You can test the API endpoints using tools like Postman or curl:

### Authentication
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","password":"password123","role":"worker"}'
```

### Beneficiaries
```bash
# Get all beneficiaries
curl http://localhost:5000/api/beneficiaries

# Create beneficiary
curl -X POST http://localhost:5000/api/beneficiaries \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Child","dob":"2023-01-01","gender":"male","parent_id":"USR003","anganwadi_id":"ANG001"}'
```

### Health Records
```bash
# Create health record
curl -X POST http://localhost:5000/api/health \
  -H "Content-Type: application/json" \
  -d '{"beneficiary_id":"BEN001","height":75,"weight":9.5,"date":"2024-01-15"}'
```

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check MongoDB URI in `.env` file
- Verify MongoDB credentials

### Frontend Build Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for dependency conflicts
- Verify Node.js version

### Backend Start Issues
- Check if port 5000 is already in use
- Verify all dependencies are installed
- Check MongoDB connection

### OCR Processing Issues
- Ensure Tesseract.js is properly installed
- Check file upload permissions
- Verify file format (images/PDFs)

### Map Display Issues
- Ensure Leaflet CSS is imported
- Check internet connection for map tiles
- Verify coordinate data

## Performance Testing

### Load Testing
- Test with multiple concurrent users
- Monitor database query performance
- Check API response times

### Database Performance
- Index frequently queried fields
- Optimize complex queries
- Monitor database size

## Security Testing

### Authentication
- Test JWT token expiration
- Verify role-based access control
- Test unauthorized access attempts

### Data Validation
- Test input validation on all forms
- Verify SQL injection protection
- Check XSS protection

### File Uploads
- Test file size limits
- Verify file type restrictions
- Check upload directory permissions

## Deployment Preparation

### Before Deployment
- [ ] Update environment variables
- [ ] Set strong JWT secret
- [ ] Configure production database
- [ ] Enable HTTPS
- [ ] Set up CORS properly
- [ ] Configure logging
- [ ] Set up monitoring

### Production Build
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm start
```

## Support

For issues or questions:
1. Check the console for error messages
2. Verify all services are running
3. Check network connectivity
4. Review the documentation in README.md