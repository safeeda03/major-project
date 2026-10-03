const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { authenticate } = require('./middleware/auth');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OCR originals are retained privately for authenticated review. There is no
// public static route for this directory.
const uploadsDirectory = path.join(__dirname, 'private-uploads', 'ocr');
fs.mkdirSync(uploadsDirectory, { recursive: true });

// Configure multer for private OCR image and PDF uploads.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDirectory);
  },
  filename: (req, file, cb) => {
    cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
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

const serializeOcrDocument = (document) => ({
  id: String(document._id),
  originalFilename: document.original_filename,
  sourceMimeType: document.source_mime_type,
  fileSize: document.file_size,
  documentType: document.document_type,
  processingStatus: document.processing_status,
  reviewStatus: document.review_status,
  provider: document.provider,
  confidence: document.confidence,
  createdAt: document.createdAt,
  firebaseSynced: document.firebase_synced,
});

const processStoredOcrDocument = async (document, user) => {
  const OCRService = require('./services/ocrService');
  const OcrWorkflowService = require('./services/ocrWorkflowService');
  const result = await OCRService.processDocument({
    path: document.storage_path,
    originalname: document.original_filename,
    mimetype: document.source_mime_type,
  });
  const structured = OcrWorkflowService.buildStructuredData(result.data, result.data.quality);
  const enriched = await OcrWorkflowService.enrich(structured, user, document.file_hash, document._id);
  document.provider = result.data.provider;
  document.confidence = result.data.confidence;
  document.document_type = enriched.classification.label;
  document.raw_text = result.data.rawText;
  document.analysis = { ...result.data, structured: enriched, saveOptions: OcrWorkflowService.getSaveOptions(enriched) };
  document.processing_status = 'ready_for_review';
  await document.save();
  const FirebaseOcrSyncService = require('./services/firebaseOcrSyncService');
  const firebaseStatus = await FirebaseOcrSyncService.publish(document.toObject());
  if (firebaseStatus.enabled) {
    document.firebase_synced = firebaseStatus.synced;
    document.firebase_synced_at = firebaseStatus.synced ? new Date() : null;
    await document.save();
  }
  return {
    ...result,
    data: {
      ...result.data,
      documentType: enriched.classification.label,
      structured: enriched,
      saveOptions: OcrWorkflowService.getSaveOptions(enriched),
      ocrDocumentId: String(document._id),
      storedAt: document.createdAt,
      originalAvailable: true,
      firebaseSynced: firebaseStatus.synced,
    },
  };
};

app.post('/api/ocr/process', authenticate, upload.single('document'), async (req, res) => {
  let document;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!fileSignatureIsValid(req.file)) {
      const error = new Error('The uploaded file does not match its declared format. Choose a valid JPG, PNG, WebP, PDF, or TXT file.');
      error.statusCode = 400;
      throw error;
    }
    const OcrDocument = require('./models/OcrDocument');
    const OcrWorkflowService = require('./services/ocrWorkflowService');
    document = await OcrDocument.create({
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      storage_path: req.file.path,
      source_mime_type: req.file.mimetype,
      file_size: req.file.size,
      file_hash: OcrWorkflowService.hashFile(req.file.path),
      provider: 'processing',
      document_type: 'Other/Unknown',
      processing_status: 'processing',
      centre_id: req.user.centreId || null,
      created_by: req.user._id,
    });
    res.json(await processStoredOcrDocument(document, req.user));
  } catch (error) {
    if (document) {
      document.processing_status = 'failed';
      document.analysis = { error: 'OCR processing failed. Upload a clearer document and retry.' };
      await document.save().catch(() => {});
    } else if (req.file?.path) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    res.status(error.statusCode || 500).json({ message: error.message || 'OCR processing failed' });
  }
});

app.post('/api/ocr/:id/retry', authenticate, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid OCR document ID.' });
    const OcrDocument = require('./models/OcrDocument');
    const document = await OcrDocument.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'OCR document not found.' });
    if (!canAccessOcrDocument(req.user, document)) return res.status(403).json({ message: 'You cannot retry this OCR document.' });
    if (!fs.existsSync(document.storage_path)) return res.status(404).json({ message: 'The original document is no longer available. Upload it again.' });
    document.processing_status = 'processing';
    await document.save();
    res.json(await processStoredOcrDocument(document, req.user));
  } catch (error) {
    res.status(error.statusCode || 422).json({ message: error.message || 'OCR processing failed. Upload a clearer document and try again.' });
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

const fileSignatureIsValid = (file) => {
  const header = fs.readFileSync(file.path).subarray(0, 16);
  const textStart = header.toString('utf8');
  if (file.mimetype === 'image/jpeg') return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  if (file.mimetype === 'image/png') return header.length >= 8 && header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (file.mimetype === 'image/webp') return header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WEBP';
  if (file.mimetype === 'application/pdf') return textStart.startsWith('%PDF-');
  if (file.mimetype === 'text/plain') return !header.includes(0);
  return false;
};

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
    if (req.query.status && ['pending', 'reviewed', 'saved'].includes(req.query.status)) filter.review_status = req.query.status;
    if (req.query.type) filter.document_type = req.query.type;
    if (req.query.q) {
      const query = String(req.query.q).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$and = [{ $or: [
        { original_filename: new RegExp(query, 'i') },
        { document_type: new RegExp(query, 'i') },
        { 'analysis.structured.fields.beneficiaryId.value': new RegExp(query, 'i') },
      ] }];
    }
    const documents = await OcrDocument.find(filter)
      .select('original_filename source_mime_type file_size provider confidence document_type processing_status review_status firebase_synced createdAt analysis.structured.fields.beneficiaryId.value')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ documents: documents.map((document) => ({
      ...serializeOcrDocument(document),
      beneficiaryId: document.analysis?.structured?.fields?.beneficiaryId?.value || null,
    })) });
  } catch (error) {
    res.status(500).json({ message: 'Could not load recent OCR documents.' });
  }
});

app.get('/api/ocr/:id/original', authenticate, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid OCR document ID.' });
    const OcrDocument = require('./models/OcrDocument');
    const document = await OcrDocument.findById(req.params.id).lean();
    if (!document) return res.status(404).json({ message: 'OCR document not found.' });
    if (!canAccessOcrDocument(req.user, document)) return res.status(403).json({ message: 'You cannot access this OCR document.' });
    if (!document.storage_path || !fs.existsSync(document.storage_path)) return res.status(404).json({ message: 'Original document is not available.' });
    res.setHeader('Content-Type', document.source_mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${String(document.original_filename).replace(/["\\]/g, '')}"`);
    fs.createReadStream(document.storage_path).pipe(res);
  } catch {
    res.status(500).json({ message: 'Could not open the original document.' });
  }
});

app.post('/api/ocr/:id/confirm', authenticate, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid OCR document ID.' });
    const OcrDocument = require('./models/OcrDocument');
    const document = await OcrDocument.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'OCR document not found.' });
    if (!canAccessOcrDocument(req.user, document)) return res.status(403).json({ message: 'You cannot save this OCR document.' });
    if (document.processing_status !== 'ready_for_review') return res.status(409).json({ message: 'This document is not ready for review.' });
    // A retry/re-upload can legitimately find an earlier *pending* OCR scan of
    // the same file. Only require explicit confirmation when a matching record
    // has already been saved, or a matching module record already exists.
    const hasSavedDuplicate = (document.analysis?.structured?.duplicates || [])
      .some((duplicate) => ['saved', 'existing'].includes(duplicate.status));
    if (hasSavedDuplicate && !req.body.options?.allowDuplicate) {
      return res.status(409).json({ message: 'A possible duplicate was found. Review it and explicitly confirm before saving.' });
    }
    const OcrWorkflowService = require('./services/ocrWorkflowService');
    const result = await OcrWorkflowService.saveReview(document, req.body.review, req.user, req.body.options || {});
    res.json({ message: 'Verified information was saved successfully.', ...result, document: serializeOcrDocument(document) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Could not save the reviewed OCR data.' });
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
        ...serializeOcrDocument(document),
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
