const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  }
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/poshanai', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/beneficiaries', require('./routes/beneficiaryRoutes'));
app.use('/api/health', require('./routes/healthRoutes'));
app.use('/api/nutrition', require('./routes/nutritionRoutes'));
app.use('/api/vaccination', require('./routes/vaccinationRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// OCR Routes
app.post('/api/ocr/process', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const OCRService = require('./services/ocrService');
    const result = await OCRService.processDocument(req.file);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'OCR processing failed', error: error.message });
  }
});

// Chatbot Routes
app.post('/api/chatbot/message', async (req, res) => {
  try {
    const { message } = req.body;
    const ChatbotService = require('./services/chatbotService');
    const response = await ChatbotService.processMessage(message);
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Chatbot error', error: error.message });
  }
});

// GIS Routes (to be implemented)
app.get('/api/gis/centres', async (req, res) => {
  try {
    const AnganwadiCentre = require('./models/AnganwadiCentre');
    const centres = await AnganwadiCentre.find();
    res.json(centres);
  } catch (error) {
    res.status(500).json({ message: 'GIS error', error: error.message });
  }
});

app.get('/api/gis/clustering', async (req, res) => {
  try {
    // This would perform clustering analysis
    res.json({
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
    });
  } catch (error) {
    res.status(500).json({ message: 'Clustering error', error: error.message });
  }
});

// Health check endpoint
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'OK', message: 'PoshanAI API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`PoshanAI Backend Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});