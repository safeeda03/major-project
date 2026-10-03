import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { ocrAPI } from '../services/api';

const FIELD_GROUPS = [
  ['Beneficiary details', ['beneficiaryId', 'childName', 'dateOfBirth', 'age', 'gender', 'parentName', 'parentId', 'phone', 'address', 'anganwadiId']],
  ['Health and growth', ['height', 'weight', 'muac', 'nutritionalStatus', 'screeningDate', 'healthObservations', 'attendanceStatus']],
];
const FIELD_LABELS = { beneficiaryId: 'Beneficiary ID', childName: 'Child name', dateOfBirth: 'Date of birth', age: 'Age', gender: 'Gender', parentName: 'Parent/Guardian name', parentId: 'Parent/Guardian ID', phone: 'Phone number', address: 'Address', anganwadiId: 'Anganwadi Centre ID', height: 'Height', weight: 'Weight', muac: 'MUAC', nutritionalStatus: 'Nutritional status', screeningDate: 'Screening date', healthObservations: 'Health observations', attendanceStatus: 'Attendance status' };
const clone = (value) => JSON.parse(JSON.stringify(value));
const formatBytes = (bytes) => bytes == null ? '' : `${(bytes / 1024 / 1024).toFixed(bytes >= 1024 * 1024 ? 1 : 2)} MB`;

const OCR = () => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Select a document to begin.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [review, setReview] = useState(null);
  const [selectedModules, setSelectedModules] = useState([]);
  const [createBeneficiary, setCreateBeneficiary] = useState(false);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [history, setHistory] = useState([]);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyStatus, setHistoryStatus] = useState('');

  const releasePreview = (url = previewUrl) => { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); };
  useEffect(() => () => releasePreview(), [previewUrl]);
  const loadHistory = async (filters = {}) => { try { const response = await ocrAPI.getLatest(25, filters); setHistory(response.documents || []); } catch {} };
  useEffect(() => { loadHistory(); }, []);

  const applyDocument = async (data, loadOriginal = true) => {
    setResult(data); setReview(data.structured ? clone(data.structured) : null);
    setSelectedModules((data.saveOptions || []).filter((item) => item.ready).map((item) => item.id));
    setCreateBeneficiary(false); setAllowDuplicate(false);
    if (loadOriginal && data.ocrDocumentId) {
      try { releasePreview(); setPreviewUrl(await ocrAPI.openOriginal(data.ocrDocumentId)); }
      catch (previewError) { setError(previewError.message); }
    }
  };

  const selectFile = (event) => {
    const selected = event.target.files?.[0] || null;
    releasePreview(); setFile(selected); setPreviewUrl(selected ? URL.createObjectURL(selected) : '');
    setResult(null); setReview(null); setError(''); setSuccess(''); setProgress(0); setStatus(selected ? 'Ready to upload and process.' : 'Select a document to begin.');
  };
  const removeFile = () => { releasePreview(); setFile(null); setPreviewUrl(''); setResult(null); setReview(null); setProgress(0); setError(''); setSuccess(''); setStatus('Document removed. Select a replacement to continue.'); };

  const processDocument = async () => {
    if (!file) { setError('Select a JPG, JPEG, PNG, WebP, PDF, or TXT document first.'); return; }
    setLoading(true); setError(''); setSuccess(''); setProgress(0); setStatus('Uploading document...');
    try {
      const response = await ocrAPI.processDocument(file, (value) => { setProgress(value); setStatus(value < 100 ? `Uploading document... ${value}%` : 'Preprocessing, extracting text, and validating fields...'); });
      await applyDocument(response.data, false); setStatus('Ready for human review.'); await loadHistory();
    } catch (requestError) { setStatus('OCR processing failed.'); setError(requestError.message || 'OCR processing failed. Upload a clearer document and try again.'); }
    finally { setLoading(false); }
  };
  const openHistory = async (id) => { setLoading(true); setError(''); setSuccess(''); try { const response = await ocrAPI.getById(id); await applyDocument(response.document); setStatus(response.document.processingStatus === 'failed' ? 'OCR processing failed. You can retry this document.' : 'Saved OCR document loaded for review.'); } catch (requestError) { setError(requestError.message || 'Could not load this OCR document.'); } finally { setLoading(false); } };
  const retry = async () => { if (!result?.ocrDocumentId) return; setLoading(true); setError(''); setStatus('Retrying OCR with the preserved original document...'); try { const response = await ocrAPI.retry(result.ocrDocumentId); await applyDocument(response.data); setStatus('Ready for human review.'); await loadHistory(); } catch (requestError) { setError(requestError.message || 'OCR processing failed.'); setStatus('OCR processing failed.'); } finally { setLoading(false); } };

  const setField = (key, value) => setReview((current) => ({ ...current, fields: { ...current.fields, [key]: { ...(current.fields[key] || {}), value, status: value ? 'review_recommended' : 'not_found' } } }));
  const setVaccine = (index, key, value) => setReview((current) => ({ ...current, vaccinations: current.vaccinations.map((record, recordIndex) => recordIndex === index ? { ...record, [key]: { ...(record[key] || {}), value, status: value ? 'review_recommended' : 'not_found' } } : record) }));
  const toggleModule = (id) => setSelectedModules((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const saveReview = async () => {
    if (!result?.ocrDocumentId || !review) return;
    setLoading(true); setError(''); setSuccess(''); setStatus('Validating reviewed information and saving selected records...');
    try { const response = await ocrAPI.confirm(result.ocrDocumentId, review, { createBeneficiary, allowDuplicate, saveModules: selectedModules }); setSuccess(`${response.message} ${response.savedRecords.length ? `Saved to: ${response.savedRecords.map((item) => item.module).join(', ')}.` : 'Document marked as reviewed.'}`); setStatus('Saved successfully.'); setResult((current) => ({ ...current, reviewStatus: 'saved', processingStatus: 'saved', structured: review })); await loadHistory(); }
    catch (requestError) { setError(requestError.message || 'Could not save the reviewed OCR data.'); setStatus('Review needs attention before saving.'); }
    finally { setLoading(false); }
  };

  const isImage = file?.type?.startsWith('image/') || result?.sourceMimeType?.startsWith('image/');
  const isPdf = file?.type === 'application/pdf' || result?.sourceMimeType === 'application/pdf';
  const preview = previewUrl && isImage ? <img src={previewUrl} alt="Original uploaded document" className="ocr-preview-media" /> : previewUrl && isPdf ? <iframe title="Original uploaded PDF" src={previewUrl} className="ocr-preview-media" /> : <div className="ocr-preview-placeholder">Original document preview is available after upload.</div>;

  return <div className="page"><Navbar /><div className="page-content"><Sidebar role="worker" /><main className="main-content"><h2>Smart OCR Document Review</h2>
    <div className="form-container records-wide ocr-workspace">
      <section className="ocr-upload-card"><h3>1. Upload document</h3><p>JPG, JPEG, PNG, WebP, TXT, or PDF up to 10 MB. PDFs with selectable text support multiple pages; clear image pages are best for scanned PDFs.</p>
        <input id="ocr-document" type="file" onChange={selectFile} accept="text/plain,.txt,application/pdf,image/jpeg,image/png,image/webp,.pdf" disabled={loading} />
        {file && <div className="ocr-file-details"><strong>{file.name}</strong><span>{formatBytes(file.size)} · {file.type || 'Unknown type'}</span><button type="button" className="secondary-btn" onClick={removeFile} disabled={loading}>Remove / replace</button></div>}
        <div className="ocr-upload-actions"><button type="button" className="submit-btn" onClick={processDocument} disabled={loading || !file}>{loading ? 'Processing…' : 'Process document'}</button>{result?.processingStatus === 'failed' && <button type="button" className="secondary-btn" onClick={retry} disabled={loading}>Retry processing</button>}</div>
        <div className="ocr-status" aria-live="polite"><strong>Processing status:</strong> {status}{loading && progress > 0 && <progress max="100" value={progress}>{progress}%</progress>}</div>{error && <div className="error-message">{error}</div>}{success && <div className="success-message">{success}</div>}
      </section>
      {result && <section className="ocr-review-layout"><aside className="ocr-original-panel"><h3>2. Original document</h3>{preview}{result.ocrDocumentId && <button type="button" className="secondary-btn" onClick={async () => { try { window.open(await ocrAPI.openOriginal(result.ocrDocumentId), '_blank', 'noopener,noreferrer'); } catch (openError) { setError(openError.message); } }}>Open original</button>}{result.rawText && <details><summary>Recognized text</summary><pre className="ocr-raw-text">{result.rawText}</pre></details>}</aside>
        <section className="ocr-review-panel"><h3>3. Extract, validate, and review</h3><div className="ocr-meta"><div><strong>Document type</strong><span>{review?.classification?.label || result.documentType || 'Document type requires review'}</span></div><div><strong>Classification evidence</strong><span>{review?.classification?.confidence == null ? 'Document type requires review' : `${review.classification.confidence}% keyword evidence`}</span></div><div><strong>OCR engine</strong><span>{result.provider === 'google-cloud-vision' ? 'Google Cloud Vision' : 'Local Tesseract OCR'}</span></div></div>
          <div className="ocr-summary"><span>Extracted: {review?.summary?.extracted || 0}</span><span>Needs review: {review?.summary?.needsReview || 0}</span><span>Missing: {review?.summary?.missing || 0}</span></div>
          {review?.warnings?.length > 0 && <div className="warning-message"><strong>Validation warnings</strong><ul>{review.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
          {review?.beneficiaryMatch?.found ? <div className="success-message"><strong>Existing beneficiary found</strong><br />{review.beneficiaryMatch.beneficiary.name} · {review.beneficiaryMatch.beneficiary.beneficiaryId}</div> : <div className="warning-message"><strong>Beneficiary not found.</strong> {review?.beneficiaryMatch?.message}<label className="ocr-checkbox"><input type="checkbox" checked={createBeneficiary} onChange={(event) => setCreateBeneficiary(event.target.checked)} /> Create a new beneficiary only after required fields are completed.</label></div>}
          {review?.duplicates?.length > 0 && <div className="warning-message"><strong>Possible duplicate document found.</strong><ul>{review.duplicates.map((duplicate) => <li key={duplicate.id}>{duplicate.documentName} · {duplicate.documentType}</li>)}</ul><label className="ocr-checkbox"><input type="checkbox" checked={allowDuplicate} onChange={(event) => setAllowDuplicate(event.target.checked)} /> I reviewed the possible duplicate and want to continue.</label></div>}
          {FIELD_GROUPS.map(([title, keys]) => <fieldset className="ocr-fieldset" key={title}><legend>{title}</legend>{keys.map((key) => { const item = review?.fields?.[key] || {}; return <label className={`ocr-field ${item.value ? (item.warning ? 'needs-review' : 'extracted') : 'missing'}`} key={key}><span>{FIELD_LABELS[key]}<small>{item.value ? (item.warning || 'Extracted — verify against original') : 'Not found in document'}</small></span>{key === 'healthObservations' || key === 'address' ? <textarea value={item.value || ''} onChange={(event) => setField(key, event.target.value)} placeholder="Not found in document" /> : key === 'gender' ? <select value={item.value || ''} onChange={(event) => setField(key, event.target.value)}><option value="">Not found in document</option><option value="male">Male</option><option value="female">Female</option></select> : key === 'attendanceStatus' ? <select value={item.value || ''} onChange={(event) => setField(key, event.target.value)}><option value="">Not found in document</option><option value="present">Present</option><option value="absent">Absent</option><option value="half-day">Half-day</option></select> : <input value={item.value || ''} onChange={(event) => setField(key, event.target.value)} placeholder="Not found in document" />}</label>; })}</fieldset>)}
          {review?.vaccinations?.length > 0 && <fieldset className="ocr-fieldset"><legend>Vaccination details</legend>{review.vaccinations.map((record, index) => <div className="ocr-vaccine-row" key={index}><label>Vaccine<input value={record.vaccine?.value || ''} onChange={(event) => setVaccine(index, 'vaccine', event.target.value)} /></label><label>Vaccination date<input value={record.date?.value || ''} onChange={(event) => setVaccine(index, 'date', event.target.value)} placeholder="DD/MM/YYYY" /></label><label>Next date<input value={record.nextDueDate?.value || ''} onChange={(event) => setVaccine(index, 'nextDueDate', event.target.value)} placeholder="Not found" /></label></div>)}</fieldset>}
          {review?.tableRows?.length > 0 && <details className="ocr-table-details"><summary>Detected table rows ({review.tableRows.length})</summary><pre>{JSON.stringify(review.tableRows, null, 2)}</pre></details>}
          <fieldset className="ocr-fieldset"><legend>4. Confirm and save</legend>{(result.saveOptions || []).length ? result.saveOptions.map((option) => <label className="ocr-checkbox" key={option.id}><input type="checkbox" checked={selectedModules.includes(option.id)} onChange={() => toggleModule(option.id)} /> Save as {option.label}</label>) : <p>No complete module record was found. You can still preserve this document as reviewed after matching a beneficiary.</p>}<button type="button" className="submit-btn" onClick={saveReview} disabled={loading || result.reviewStatus === 'saved'}>{result.reviewStatus === 'saved' ? 'Saved successfully' : 'Verify and save'}</button></fieldset>
        </section></section>}
      <section className="ocr-history"><div className="ocr-history-heading"><div><h3>OCR history</h3><p>Only documents in your authorized scope are shown.</p></div><div><input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search name, type, beneficiary ID" /><select value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)}><option value="">All statuses</option><option value="pending">Pending review</option><option value="saved">Saved</option></select><button type="button" className="secondary-btn" onClick={() => loadHistory({ q: historyQuery, status: historyStatus })}>Filter</button></div></div>
        <div className="ocr-history-table"><table><thead><tr><th>Document</th><th>Beneficiary ID</th><th>Type</th><th>Uploaded</th><th>Status</th><th>Action</th></tr></thead><tbody>{history.length ? history.map((document) => <tr key={document.id}><td>{document.originalFilename}</td><td>{document.beneficiaryId || 'Not found'}</td><td>{document.documentType}</td><td>{new Date(document.createdAt).toLocaleString()}</td><td>{document.reviewStatus === 'saved' ? 'Saved' : document.processingStatus === 'failed' ? 'Failed' : 'Ready for review'}</td><td><button type="button" className="secondary-btn" onClick={() => openHistory(document.id)} disabled={loading}>{document.processingStatus === 'failed' ? 'View / retry' : 'Review'}</button></td></tr>) : <tr><td colSpan="6">No OCR documents found.</td></tr>}</tbody></table></div>
      </section>
    </div>
  </main></div></div>;
};

export default OCR;
