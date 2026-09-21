import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  const loadBeneficiaries = async () => {
    try {
      setListLoading(true);
      setBeneficiaries(await beneficiaryAPI.getAll());
    } catch (err) {
      setError(err.message || 'Failed to load beneficiaries');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadBeneficiaries();
  }, []);

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
      await loadBeneficiaries();
    } catch (err) {
      setError(err.message || 'Failed to add beneficiary');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (beneficiary) => {
    if (!window.confirm(`Remove ${beneficiary.name} (${beneficiary.beneficiary_id})?`)) return;

    try {
      setError('');
      await beneficiaryAPI.delete(beneficiary._id);
      setMessage(`${beneficiary.name} removed successfully.`);
      await loadBeneficiaries();
    } catch (err) {
      setError(err.message || 'Failed to remove beneficiary');
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
          <div className="form-container records-container">
            <h3>Current Beneficiaries ({beneficiaries.length})</h3>
            {listLoading ? <p>Loading beneficiaries...</p> : (
              <div className="records-table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr><th>ID</th><th>Name</th><th>Date of Birth</th><th>Gender</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {beneficiaries.length ? beneficiaries.map((beneficiary) => (
                      <tr key={beneficiary._id}>
                        <td>{beneficiary.beneficiary_id}</td>
                        <td><Link className="child-link" to={`/beneficiaries/${beneficiary._id}`}>{beneficiary.name}</Link></td>
                        <td>{new Date(beneficiary.dob).toLocaleDateString()}</td>
                        <td>{beneficiary.gender}</td>
                        <td><button type="button" className="delete-btn" onClick={() => handleDelete(beneficiary)}>Delete</button></td>
                      </tr>
                    )) : <tr><td colSpan="5">No beneficiaries found.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Beneficiary;
