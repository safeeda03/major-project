import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { ocrAPI } from '../services/api';

const OCR = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    setFile(event.target.files?.[0] || null);
    setError('');
    setResult(null);
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Select a PDF, JPG, PNG, or WebP file first.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await ocrAPI.processDocument(file);
      setResult(response.data);
    } catch (err) {
      setError(err.message || 'OCR processing failed');
    } finally {
      setLoading(false);
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
            <p>Upload a PDF or a clear JPG, PNG, or WebP image. OCR results must be checked against the original before use.</p>
            <div className="form-group">
              <label htmlFor="ocr-document">Document file</label>
              <input id="ocr-document" type="file" onChange={handleFileChange} accept="application/pdf,image/jpeg,image/png,image/webp,.pdf" />
            </div>
            <button type="button" onClick={handleProcess} className="submit-btn" disabled={loading || !file}>
              {loading ? 'Processing…' : 'Extract text'}
            </button>
            {error && <div className="error-message">{error}</div>}

            {result && (
              <div className="ocr-result">
                <h3>Extracted data</h3>
                <div className="warning-message">Please verify every field against the original document.</div>
                <div className="result-content">
                  <p><strong>Child name:</strong> {result.childName || 'Not detected'}</p>
                  <p><strong>Date of birth:</strong> {result.dateOfBirth || 'Not detected'}</p>
                  <p><strong>Parent or guardian:</strong> {result.parentName || 'Not detected'}</p>
                  {result.beneficiaryId && <p><strong>Beneficiary ID:</strong> {result.beneficiaryId}</p>}
                  {result.anganwadiId && <p><strong>Anganwadi ID:</strong> {result.anganwadiId}</p>}
                  {result.nutritionDetails && <p><strong>Nutrition details:</strong> {result.nutritionDetails}</p>}
                  {result.healthInformation && <p><strong>Health information:</strong> {result.healthInformation}</p>}
                  {result.confidence != null && <p><strong>Confidence:</strong> {Number(result.confidence).toFixed(1)}%</p>}

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
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default OCR;
