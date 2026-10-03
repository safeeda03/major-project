const mongoose = require('mongoose');

// OCR output is stored separately from confirmed health records. A worker must
// still review and explicitly save a report before it becomes clinical data.
const ocrDocumentSchema = new mongoose.Schema({
  original_filename: { type: String, required: true, trim: true },
  stored_filename: { type: String, required: true, trim: true },
  storage_path: { type: String, required: true, trim: true },
  source_mime_type: { type: String, required: true, trim: true },
  file_size: { type: Number, required: true, min: 0 },
  file_hash: { type: String, required: true, index: true },
  provider: { type: String, required: true, trim: true },
  confidence: { type: Number, min: 0, max: 100, default: null },
  document_type: { type: String, trim: true, default: 'Child health report' },
  raw_text: { type: String, default: '' },
  analysis: { type: mongoose.Schema.Types.Mixed, default: {} },
  centre_id: { type: String, trim: true, default: null },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  processing_status: { type: String, enum: ['processing', 'ready_for_review', 'failed', 'saved'], default: 'processing' },
  review_status: { type: String, enum: ['pending', 'reviewed', 'saved'], default: 'pending' },
  verified_at: { type: Date, default: null },
  verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  firebase_synced: { type: Boolean, default: false },
  firebase_synced_at: { type: Date, default: null },
}, { timestamps: true });

ocrDocumentSchema.index({ centre_id: 1, createdAt: -1 });
ocrDocumentSchema.index({ file_hash: 1, createdAt: -1 });

module.exports = mongoose.model('OcrDocument', ocrDocumentSchema);
