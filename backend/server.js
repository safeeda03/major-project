const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDirectory = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDirectory, { recursive: true });

// Configure multer for short-lived OCR image uploads.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDirectory);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.has(extension) && allowedMimeTypes.has(file.mimetype)) {
      return cb(null, true);
    }

    const error = new Error('Only JPG, PNG, and WebP images are supported for OCR.');
    error.statusCode = 400;
    return cb(error);
  }
});

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
    res.status(error.statusCode || 500).json({ message: error.message || 'OCR processing failed' });
  } finally {
    if (req.file?.path) {
      fs.promises.unlink(req.file.path).catch((error) => {
        console.warn('Could not remove temporary OCR upload:', error.message);
      });
    }
  }
});

// Chatbot Routes
app.post('/api/chatbot/message', async (req, res) => {
  try {
    const { message, history } = req.body;
    const ChatbotService = require('./services/chatbotService');
    const response = await ChatbotService.processMessage(message, history);
    res.json(response);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Chatbot error' });
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
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'OCR images must be 10 MB or smaller.' : err.message });
  }

  console.error(err.stack || err.message);
  return res.status(err.statusCode || 500).json({ message: err.message || 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`PoshanAI Backend Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
