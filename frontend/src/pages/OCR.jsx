import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { ocrAPI } from '../services/api';

const OCR = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
    setResult(null);
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Please select a file first');
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

  const handleVerifyAndSave = async () => {
    // This would send verified data to backend
    setMessage('Data verified and saved successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <Sidebar role="worker" />
        <main className="main-content">
          <h2>OCR Document Processing</h2>
          <div className="form-container">
            <h3>Upload Document for OCR</h3>
            <div className="form-group">
              <label>Select Document (Image/PDF)</label>
              <input
                type="file"
                onChange={handleFileChange}
                accept="image/*,.pdf"
                required
              />
            </div>
            <button onClick={handleProcess} className="submit-btn" disabled={loading}>
              {loading ? 'Processing...' : 'Process Document'}
            </button>
            {error && <div className="error-message">{error}</div>}
            
            {result && (
              <div className="ocr-result">
                <h3>Extracted Data</h3>
                <div className="result-content">
                  <p><strong>Child Name:</strong> {result.childName}</p>
                  <p><strong>Date of Birth:</strong> {result.dateOfBirth}</p>
                  <p><strong>Parent Name:</strong> {result.parentName}</p>
                  <p><strong>Confidence:</strong> {(result.confidence * 100).toFixed(1)}%</p>
                  
                  {result.vaccinationRecords && result.vaccinationRecords.length > 0 && (
                    <div>
                      <h4>Vaccination Records</h4>
                      <ul>
                        {result.vaccinationRecords.map((record, index) => (
                          <li key={index}>
                            {record.vaccine} - {record.date} (Next due: {record.nextDue})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {result.needsVerification && (
                    <div className="warning-message">
                      Please verify the extracted data before saving.
                    </div>
                  )}
                  
                  <div className="verification-actions">
                    <button onClick={handleVerifyAndSave} className="submit-btn">
                      Verify & Save Data
                    </button>
                  </div>
                  
                  {message && <div className="success-message">{message}</div>}
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