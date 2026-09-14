import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { nutritionAPI } from '../services/api';

const Nutrition = () => {
  const [formData, setFormData] = useState({
    beneficiary_id: '',
    nutrition_status: '',
    meals: '',
    recommendations: ''
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
      const response = await nutritionAPI.create(formData);
      setMessage('Nutrition record saved successfully!');
      setFormData({
        beneficiary_id: '',
        nutrition_status: '',
        meals: '',
        recommendations: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to save nutrition record');
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
          <h2>Nutrition Records</h2>
          <div className="form-container">
            <h3>Add Nutrition Assessment</h3>
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
                <label>Nutrition Status</label>
                <select name="nutrition_status" value={formData.nutrition_status} onChange={handleChange} required>
                  <option value="">Select Status</option>
                  <option value="normal">Normal</option>
                  <option value="underweight">Underweight</option>
                  <option value="overweight">Overweight</option>
                  <option value="stunted">Stunted</option>
                  <option value="wasted">Wasted</option>
                </select>
              </div>
              <div className="form-group">
                <label>Meals Provided</label>
                <textarea
                  name="meals"
                  value={formData.meals}
                  onChange={handleChange}
                  placeholder="Breakfast, Lunch, Snacks details..."
                />
              </div>
              <div className="form-group">
                <label>Recommendations</label>
                <textarea
                  name="recommendations"
                  value={formData.recommendations}
                  onChange={handleChange}
                  placeholder="Dietary recommendations..."
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save Nutrition Record'}
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

export default Nutrition;