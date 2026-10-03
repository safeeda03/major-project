const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('./middleware/auth');

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

// Configure multer for short-lived OCR image and PDF uploads.
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
    const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt']);
    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']);
    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.has(extension) && allowedMimeTypes.has(file.mimetype)) {
      return cb(null, true);
    }

    const error = new Error('Only TXT, PDF, JPG, PNG, and WebP files are supported for OCR.');
    error.statusCode = 400;
    return cb(error);
  }
});

const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = new Set([
      'audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/wav',
      'audio/mp4', 'audio/mpeg', 'audio/x-m4a', 'video/webm'
    ]);
    if (allowedTypes.has(file.mimetype)) return cb(null, true);
    const error = new Error('Unsupported audio format. Please record again in your browser.');
    error.statusCode = 400;
    return cb(error);
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/poshanai', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
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
const canAccessOcrDocument = (user, document) => {
  if (user.role === 'supervisor') return true;
  if (String(document.created_by) === String(user._id)) return true;
  return user.role === 'worker' && Boolean(user.centreId) && document.centre_id === user.centreId;
};

app.post('/api/ocr/process', authenticate, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const OCRService = require('./services/ocrService');
    const result = await OCRService.processDocument(req.file);
    const OcrDocument = require('./models/OcrDocument');
    const { rawText, ...analysis } = result.data;
    const document = await OcrDocument.create({
      original_filename: req.file.originalname,
      source_mime_type: req.file.mimetype,
      provider: result.data.provider,
      confidence: result.data.confidence,
      document_type: result.data.documentType,
      raw_text: rawText,
      analysis,
      centre_id: req.user.centreId || null,
      created_by: req.user._id,
    });
    const FirebaseOcrSyncService = require('./services/firebaseOcrSyncService');
    const firebaseStatus = await FirebaseOcrSyncService.publish(document.toObject());
    if (firebaseStatus.enabled) {
      document.firebase_synced = firebaseStatus.synced;
      document.firebase_synced_at = firebaseStatus.synced ? new Date() : null;
      await document.save();
    }
    result.data.ocrDocumentId = String(document._id);
    result.data.storedAt = document.createdAt;
    result.data.firebaseSynced = firebaseStatus.synced;
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
app.post('/api/chatbot/message', authenticate, async (req, res) => {
  try {
    const { message, history, language } = req.body;
    const ChatbotService = require('./services/chatbotService');
    const response = await ChatbotService.processMessage(message, history, language, req.user);
    res.json(response);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Chatbot error' });
  }
});

app.get('/api/ocr/latest', authenticate, async (req, res) => {
  try {
    const OcrDocument = require('./models/OcrDocument');
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10;
    const filter = req.user.role === 'supervisor'
      ? {}
      : req.user.role === 'worker' && req.user.centreId
        ? { $or: [{ centre_id: req.user.centreId }, { created_by: req.user._id }] }
        : { created_by: req.user._id };
    const documents = await OcrDocument.find(filter)
      .select('original_filename provider confidence document_type review_status firebase_synced createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ documents });
  } catch (error) {
    res.status(500).json({ message: 'Could not load recent OCR documents.' });
  }
});

app.get('/api/ocr/:id', authenticate, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid OCR document ID.' });
    const OcrDocument = require('./models/OcrDocument');
    const document = await OcrDocument.findById(req.params.id).lean();
    if (!document) return res.status(404).json({ message: 'OCR document not found.' });
    if (!canAccessOcrDocument(req.user, document)) return res.status(403).json({ message: 'You cannot access this OCR document.' });
    res.json({
      document: {
        id: String(document._id),
        ...document.analysis,
        rawText: document.raw_text,
        confidence: document.confidence,
        provider: document.provider,
        ocrDocumentId: String(document._id),
        storedAt: document.createdAt,
        firebaseSynced: document.firebase_synced,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not load this OCR document.' });
  }
});

app.post('/api/chatbot/confirm', authenticate, async (req, res) => {
  try {
    const ChatbotService = require('./services/chatbotService');
    const response = await ChatbotService.confirmAction(req.body.draft, req.user);
    res.json(response);
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message || 'Could not complete the assistant action.' });
  }
});

app.post('/api/chatbot/voice', authenticate, voiceUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No audio recording was uploaded.' });
    const SpeechService = require('./services/speechService');
    const result = await SpeechService.transcribe(req.file, req.body.language);
    res.json(result);
  } catch (error) {
    console.error('Voice transcription failed:', error.message);
    res.status(error.statusCode || 503).json({
      message: 'Voice recognition is currently unavailable. Please type your question instead.'
    });
  }
});

// GIS Routes (to be implemented)
app.get('/api/gis/centres', authenticate, async (req, res) => {
  try {
    const AnganwadiCentre = require('./models/AnganwadiCentre');
    if (!req.user) return res.status(401).json({ message: 'Please log in to continue.' });
    const Beneficiary = require('./models/Beneficiary');
    const centreId = req.user.role === 'worker' ? req.user.centreId : req.user.role === 'parent'
      ? (await Beneficiary.findOne({ beneficiary_id: req.user.beneficiaryId }).select('anganwadi_id'))?.anganwadi_id
      : null;
    const centres = await AnganwadiCentre.find(centreId ? { centre_id: centreId } : req.user.role === 'parent' ? { centre_id: '__none__' } : {});
    res.json(centres);
  } catch (error) {
    res.status(500).json({ message: 'GIS error', error: error.message });
  }
});

app.post('/api/gis/centres', authenticate, async (req, res) => {
  try {
    if (req.user?.role !== 'supervisor') return res.status(403).json({ message: 'Only supervisors can manage centres.' });
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'MongoDB is not connected. Start the MongoDB service, then try saving the centre again.' });
    }
    const AnganwadiCentre = require('./models/AnganwadiCentre');
    const { centre_id, name, latitude, longitude, address, worker_id, worker_name, worker_phone } = req.body;
    if (!String(worker_id || '').trim()) return res.status(400).json({ message: 'Assign an Anganwadi Worker ID before saving this centre.' });
    const centre = await AnganwadiCentre.create({
      centre_id: String(centre_id || '').trim().toUpperCase(),
      name: String(name || '').trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      address: String(address || '').trim(),
      worker_id: String(worker_id || '').trim().toUpperCase(),
      worker_name: String(worker_name || '').trim(),
      worker_phone: String(worker_phone || '').trim()
    });
    res.status(201).json(centre);
  } catch (error) {
    const duplicateCentre = error?.code === 11000;
    res.status(duplicateCentre ? 409 : 400).json({
      message: duplicateCentre ? 'A centre with this Centre ID already exists.' : 'Could not save centre details.',
      error: error.message
    });
  }
});

app.put('/api/gis/centres/:id', authenticate, async (req, res) => {
  try {
    if (req.user?.role !== 'supervisor') return res.status(403).json({ message: 'Only supervisors can manage centres.' });
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'MongoDB is not connected. Start the MongoDB service, then try updating the centre again.' });
    }
    const AnganwadiCentre = require('./models/AnganwadiCentre');
    const { centre_id, name, latitude, longitude, address, worker_id, worker_name, worker_phone } = req.body;
    if (!String(worker_id || '').trim()) return res.status(400).json({ message: 'Assign an Anganwadi Worker ID before saving this centre.' });
    const previousCentre = await AnganwadiCentre.findById(req.params.id);
    if (!previousCentre) return res.status(404).json({ message: 'Centre not found.' });
    const centre = await AnganwadiCentre.findByIdAndUpdate(req.params.id, {
      centre_id: String(centre_id || '').trim().toUpperCase(),
      name: String(name || '').trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      address: String(address || '').trim(),
      worker_id: String(worker_id || '').trim().toUpperCase(),
      worker_name: String(worker_name || '').trim(),
      worker_phone: String(worker_phone || '').trim()
    }, { new: true, runValidators: true });
    if (!centre) return res.status(404).json({ message: 'Centre not found.' });
    const User = require('./models/User');
    if (previousCentre.centre_id !== centre.centre_id) {
      const Beneficiary = require('./models/Beneficiary');
      await Beneficiary.updateMany({ anganwadi_id: previousCentre.centre_id }, { $set: { anganwadi_id: centre.centre_id } });
    }
    await User.updateMany({ centreId: previousCentre.centre_id }, { $set: { centreId: centre.centre_id } });
    if (previousCentre.worker_id !== centre.worker_id) {
      await User.updateMany({ centreId: centre.centre_id, workerId: previousCentre.worker_id }, { $set: { workerId: centre.worker_id } });
    }
    res.json(centre);
  } catch (error) {
    const duplicateCentre = error?.code === 11000;
    res.status(duplicateCentre ? 409 : 400).json({
      message: duplicateCentre ? 'A centre with this Centre ID already exists.' : 'Could not update centre details.',
      error: error.message
    });
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
    const isVoiceUpload = req.path === '/api/chatbot/voice';
    return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE'
      ? (isVoiceUpload ? 'Audio recordings must be 15 MB or smaller.' : 'OCR images must be 10 MB or smaller.')
      : err.message });
  }

  console.error(err.stack || err.message);
  return res.status(err.statusCode || 500).json({ message: err.message || 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`PoshanAI Backend Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
