import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { ocrAPI, reportAssistantAPI } from '../services/api';

const REPORT_TYPES = [
  ['health', 'Child health / growth'],
  ['health_screening', 'Health screening'],
  ['nutrition', 'Nutrition'],
  ['vaccination', 'Vaccination'],
  ['attendance', 'Attendance'],
  ['supplementary_nutrition', 'Food distribution'],
  ['home_visit', 'Home visit'],
  ['counselling', 'Counselling'],
  ['referral', 'Referral / follow-up'],
  ['preschool_activity', 'Preschool activity'],
  ['event', 'Centre event'],
  ['monthly', 'Monthly activity report'],
];

const suggestReportType = (candidate) => {
  const text = [candidate.title || '', candidate.documentType || '', candidate.text || ''].join(' ').toLowerCase();
  if (/vaccin|immuni|bcg|polio/.test(text)) return 'vaccination';
  if (/attendance|present|absent/.test(text)) return 'attendance';
  if (/food distribution|rice|egg|meal/.test(text)) return 'supplementary_nutrition';
  if (/nutrition|feeding|diet/.test(text)) return 'nutrition';
  if (/screening|fever|symptom|medical|lab/.test(text)) return 'health_screening';
  if (/growth|weight|height|health/.test(text)) return 'health';
  return 'event';
};

const OCR = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [reviewingId, setReviewingId] = useState('');
  const [activeCandidateId, setActiveCandidateId] = useState('');
  const [recentDocuments, setRecentDocuments] = useState([]);

  const loadRecentDocuments = async () => {
    try {
      const response = await ocrAPI.getLatest(5);
      setRecentDocuments(response.documents || []);
    } catch {
      // The current scan remains available even if the recent-history request fails.
    }
  };

  useEffect(() => {
    loadRecentDocuments();
  }, []);

  const handleFileChange = (event) => {
    setFile(event.target.files?.[0] || null);
    setError('');
    setResult(null);
    setReviewingId('');
    setActiveCandidateId('');
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Select a PDF, TXT, JPG, PNG, or WebP file first.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setReviewingId('');
    setActiveCandidateId('');

    try {
      const response = await ocrAPI.processDocument(file);
      setResult(response.data);
      setActiveCandidateId(response.data.reportCandidates?.[0]?.id || '');
      loadRecentDocuments();
    } catch (err) {
      setError(err.message || 'OCR processing failed');
    } finally {
      setLoading(false);
    }
  };

  const openStoredDocument = async (id) => {
    setLoading(true);
    setError('');
    try {
      const response = await ocrAPI.getById(id);
      setResult(response.document);
      setActiveCandidateId(response.document.reportCandidates?.[0]?.id || '');
    } catch (err) {
      setError(err.message || 'Could not load this saved OCR document.');
    } finally {
      setLoading(false);
    }
  };

  const reviewCandidate = async (candidate) => {
    const reportType = candidate.selectedType || suggestReportType(candidate);
    const typeLabel = REPORT_TYPES.find(([value]) => value === reportType)?.[1] || 'event';
    setReviewingId(candidate.id);
    setError('');
    try {
      const response = await reportAssistantAPI.preview(
        'Add a ' + typeLabel + ' report from this extracted document:\n' + candidate.text,
        /[\u0D00-\u0D7F]/.test(candidate.text) ? 'ml-IN' : 'en-IN',
        null,
        reportType,
      );
      setResult((current) => ({
        ...current,
        reportCandidates: current.reportCandidates.map((item) => item.id === candidate.id
          ? { ...item, selectedType: reportType, reportPreview: response }
          : item),
      }));
    } catch (err) {
      setError(err.message || 'Could not prepare this report for confirmation.');
    } finally {
      setReviewingId('');
    }
  };

  const confirmCandidate = async (candidate) => {
    if (!candidate.reportPreview?.canSave) return;
    setReviewingId(candidate.id);
    setError('');
    try {
      await reportAssistantAPI.confirm(candidate.reportPreview);
      setResult((current) => ({
        ...current,
        reportCandidates: current.reportCandidates.map((item) => item.id === candidate.id
          ? { ...item, saved: true }
          : item),
      }));
    } catch (err) {
      setError(err.message || 'Could not save this report.');
    } finally {
      setReviewingId('');
    }
  };

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <Sidebar role="worker" />
        <main className="main-content">
          <h2>OCR Document Processing</h2>
          <div className="form-container">
            <h3>Scan a document</h3>
            <p>Upload a PDF, TXT, or clear JPG, PNG, or WebP image. Multiple reports in one text/document are separated for review.</p>
            <div className="form-group">
              <label htmlFor="ocr-document">Document file</label>
            <input id="ocr-document" type="file" onChange={handleFileChange} accept="text/plain,.txt,application/pdf,image/jpeg,image/png,image/webp,.pdf" />
            </div>
            <button type="button" onClick={handleProcess} className="submit-btn" disabled={loading || !file}>
              {loading ? 'Processing…' : 'Extract text'}
            </button>
            {error && <div className="error-message">{error}</div>}

            {recentDocuments.length > 0 && (
              <section className="ocr-section">
                <h3>Recent scans</h3>
                <p>Your extracted documents are saved securely for review.</p>
                <ul>
                  {recentDocuments.map((document) => (
                    <li key={document._id}>
                      <button type="button" className="link-button" onClick={() => openStoredDocument(document._id)} disabled={loading}>
                        {document.original_filename || 'Untitled document'}
                      </button>
                      {' — '}{new Date(document.createdAt).toLocaleString()}
                      {document.provider && ` (${document.provider === 'google-cloud-vision' ? 'Google Cloud Vision' : 'Local OCR'})`}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result && (
              <div className="ocr-result">
                <h3>Document Summary</h3>
                <div className="warning-message">Please verify extracted information against the original document.</div>
                <div className="result-content">
                  <p><strong>Document type:</strong> {result.documentType || 'Child health report'}</p>
                  {result.summary?.map((line) => <p key={line}>{line}</p>)}
                  {result.provider && <p><strong>Recognition engine:</strong> {result.provider === 'google-cloud-vision' ? 'Google Cloud Vision' : result.provider === 'tesseract' ? 'Local OCR' : result.provider}</p>}
                  {result.confidence != null && <p><strong>Confidence:</strong> {Number(result.confidence).toFixed(1)}%</p>}
                </div>

                {(!result.reportCandidates || result.reportCandidates.length <= 1) && result.sections?.map((section) => (
                  <section className="ocr-section" key={section.title}>
                    <h4>{section.title}</h4>
                    <ul>
                      {section.items.map((item, index) => (
                        <li key={`${section.title}-${item.value}-${index}`}><strong>{item.label}:</strong> {item.value}</li>
                      ))}
                    </ul>
                  </section>
                ))}

                {result.reportCandidates?.length > 0 && (
                  <section className="ocr-section ocr-candidates">
                    <h4>Separate reports</h4>
                    <p>Select the correct report type for each section, review the extracted preview, then confirm before saving.</p>
                    <label htmlFor="ocr-report-selector"><strong>Report to view</strong></label>
                    <select id="ocr-report-selector" value={activeCandidateId} onChange={(event) => setActiveCandidateId(event.target.value)}>
                      {result.reportCandidates.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.title}</option>)}
                    </select>
                    {result.reportCandidates.filter((candidate) => candidate.id === activeCandidateId).map((candidate) => (
                      <div className="ocr-candidate" key={candidate.id}>
                        <strong>{candidate.title}</strong>
                        <select
                          value={candidate.selectedType || suggestReportType(candidate)}
                          onChange={(event) => setResult((current) => ({
                            ...current,
                            reportCandidates: current.reportCandidates.map((item) => item.id === candidate.id
                              ? { ...item, selectedType: event.target.value, reportPreview: null }
                              : item),
                          }))}
                          aria-label={'Report type for ' + candidate.title}
                          disabled={candidate.saved}
                        >
                          {REPORT_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                        </select>
                        <details>
                          <summary>Review this report text</summary>
                          <pre>{candidate.text}</pre>
                        </details>
                        {!candidate.saved && (
                          <button type="button" className="submit-btn" onClick={() => reviewCandidate(candidate)} disabled={reviewingId === candidate.id}>
                            {reviewingId === candidate.id ? 'Preparing preview...' : 'Review and prepare'}
                          </button>
                        )}
                        {candidate.reportPreview && (
                          <div className="ocr-candidate-preview">
                            <div className="warning-message">Please verify this report against the original before confirming.</div>
                            <p>{candidate.reportPreview.assistantText}</p>
                            {candidate.reportPreview.preview && <pre>{Object.entries(candidate.reportPreview.preview).filter(([, value]) => value !== '' && value !== null && value !== undefined).map(([key, value]) => key + ': ' + (typeof value === 'object' ? JSON.stringify(value) : value)).join('\n')}</pre>}
                            {candidate.reportPreview.canSave && !candidate.saved && <button type="button" className="submit-btn" onClick={() => confirmCandidate(candidate)} disabled={reviewingId === candidate.id}>Confirm and save</button>}
                            {candidate.saved && <div className="success-message">This report was saved successfully.</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </section>
                )}

                {result.rawText && (
                  <details className="ocr-raw-text">
                    <summary>Review original extracted text</summary>
                    <pre>{result.rawText}</pre>
                  </details>
                )}

                  {result.vaccinationRecords?.length > 0 && (
                    <div>
                      <h4>Vaccines mentioned</h4>
                      <ul>
                        {result.vaccinationRecords.map((record, index) => (
                          <li key={`${record.vaccine}-${index}`}>{record.vaccine}{record.date ? ` — ${record.date}` : ''}</li>
                        ))}
                      </ul>
                    </div>
                  )}

              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default OCR;
