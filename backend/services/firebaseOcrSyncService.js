// Firebase sync is opt-in because OCR documents can contain sensitive health
// information. MongoDB remains the source of truth if Firebase is unavailable.
let firebaseApp = null;
let initializationError = null;

const isEnabled = () => String(process.env.FIREBASE_OCR_SYNC_ENABLED || '').toLowerCase() === 'true';

function getDatabase() {
  if (!isEnabled()) return null;
  if (firebaseApp) return firebaseApp.database;
  if (initializationError) throw initializationError;

  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    initializationError = new Error('FIREBASE_DATABASE_URL is required when Firebase OCR sync is enabled.');
    throw initializationError;
  }

  try {
    const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app');
    const { getDatabase: getRealtimeDatabase } = require('firebase-admin/database');
    const app = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: applicationDefault(), databaseURL });
    firebaseApp = { database: getRealtimeDatabase(app) };
    return firebaseApp.database;
  } catch (cause) {
    initializationError = cause;
    throw cause;
  }
}

class FirebaseOcrSyncService {
  static async publish(document) {
    if (!isEnabled()) return { enabled: false, synced: false };

    try {
      const database = getDatabase();
      const id = String(document._id);
      const timestamp = new Date(document.createdAt || Date.now()).toISOString();
      const payload = {
        id,
        originalFilename: document.original_filename,
        provider: document.provider,
        confidence: document.confidence,
        documentType: document.document_type,
        rawText: document.raw_text,
        summary: document.analysis?.summary || [],
        centreId: document.centre_id || null,
        reviewStatus: document.review_status,
        createdAt: timestamp,
      };
      const latestKey = document.centre_id || `user-${String(document.created_by)}`;
      await database.ref().update({
        [`ocrDocuments/${id}`]: payload,
        [`ocrLatest/${latestKey}`]: payload,
      });
      return { enabled: true, synced: true };
    } catch (cause) {
      // Cloud synchronization must never discard a successful local OCR result.
      console.error('Firebase OCR synchronization failed:', cause.message);
      return { enabled: true, synced: false, error: cause.message };
    }
  }
}

module.exports = FirebaseOcrSyncService;
