import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { vaccinationAPI } from '../services/api';

const Vaccination = () => {
  const [formData, setFormData] = useState({
    beneficiary_id: '',
    vaccine: '',
    date: new Date().toISOString().split('T')[0],
    next_due_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await vaccinationAPI.create(formData);
      setMessage('Vaccination record saved successfully!');
      setFormData({
        beneficiary_id: '',
        vaccine: '',
        date: new Date().toISOString().split('T')[0],
        next_due_date: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to save vaccination record');
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
          <h2>Vaccination Records</h2>
          <div className="form-container">
            <h3>Add Vaccination Record</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Beneficiary ID</label>
                <input
                  type="text"
                  name="beneficiary_id"
                  value={formData.beneficiary_id}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Vaccine</label>
                <select name="vaccine" value={formData.vaccine} onChange={handleChange} required>
                  <option value="">Select Vaccine</option>
                  <option value="bcg">BCG</option>
                  <option value="polio">Polio</option>
                  <option value="dpt">DPT</option>
                  <option value="mmr">MMR</option>
                  <option value="hepatitis">Hepatitis B</option>
                  <option value="measles">Measles</option>
                </select>
              </div>
              <div className="form-group">
                <label>Vaccination Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Next Due Date</label>
                <input
                  type="date"
                  name="next_due_date"
                  value={formData.next_due_date}
                  onChange={handleChange}
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save Vaccination Record'}
              </button>
              {message && <div className="success-message">{message}</div>}
              {error && <div className="error-message">{error}</div>}
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Vaccination;