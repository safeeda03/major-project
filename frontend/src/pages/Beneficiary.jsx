import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { beneficiaryAPI } from '../services/api';

const Beneficiary = () => {
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: '',
    parent_id: '',
    anganwadi_id: ''
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
      const response = await beneficiaryAPI.create(formData);
      setMessage('Beneficiary added successfully!');
      setFormData({
        name: '',
        dob: '',
        gender: '',
        parent_id: '',
        anganwadi_id: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to add beneficiary');
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
          <h2>Beneficiary Management</h2>
          <div className="form-container">
            <h3>Add New Beneficiary</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Child Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} required>
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Parent/Guardian ID</label>
                <input
                  type="text"
                  name="parent_id"
                  value={formData.parent_id}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Anganwadi Centre ID</label>
                <input
                  type="text"
                  name="anganwadi_id"
                  value={formData.anganwadi_id}
                  onChange={handleChange}
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Adding...' : 'Add Beneficiary'}
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

export default Beneficiary;