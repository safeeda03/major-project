import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { beneficiaryAPI, healthAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Health = () => {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';
  const [formData, setFormData] = useState({ beneficiary_id: '', height: '', weight: '', date: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    if (!isParent) return;
    const loadChildren = async () => {
      setRecordsLoading(true); setError('');
      try {
        const beneficiaries = await beneficiaryAPI.getAll();
        const parentIds = new Set([user?.id, user?.user_id, user?._id].filter(Boolean));
        const linkedChildren = beneficiaries.filter((beneficiary) => parentIds.has(beneficiary.parent_id));
        setChildren(linkedChildren);
        setSelectedChildId(linkedChildren[0]?.beneficiary_id || '');
      } catch (err) { setError(err.message || 'Could not load child profiles.'); }
      finally { setRecordsLoading(false); }
    };
    loadChildren();
  }, [isParent, user]);

  useEffect(() => {
    if (!isParent || !selectedChildId) { if (isParent) setRecords([]); return; }
    const loadRecords = async () => {
      setRecordsLoading(true); setError('');
      try { setRecords(await healthAPI.getByBeneficiary(selectedChildId)); }
      catch (err) { setError(err.message || 'Could not load health records.'); }
      finally { setRecordsLoading(false); }
    };
    loadRecords();
  }, [isParent, selectedChildId]);

  const sortedRecords = useMemo(() => [...records].sort((a, b) => new Date(b.date) - new Date(a.date)), [records]);
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); setMessage('');
    try {
      const response = await healthAPI.create(formData);
      setMessage(response.message || 'Health record saved successfully!');
      setFormData({ beneficiary_id: '', height: '', weight: '', date: new Date().toISOString().split('T')[0] });
    } catch (err) { setError(err.message || 'Failed to save health record'); }
    finally { setLoading(false); }
  };

  return <div className="page"><Navbar /><div className="page-content"><Sidebar role={isParent ? 'parent' : 'worker'} /><main className="main-content">
    <h2>Health Records</h2>
    {isParent ? <div className="form-container records-wide">
      <h3>Health Records Added by Your Anganwadi Worker</h3>
      <p>These records are view-only and show only children linked to your parent account.</p>
      {error && <div className="error-message">{error}</div>}
      {!recordsLoading && children.length > 0 && <div className="form-group"><label>Child</label><select value={selectedChildId} onChange={(event) => setSelectedChildId(event.target.value)}>{children.map((child) => <option key={child.beneficiary_id} value={child.beneficiary_id}>{child.name} ({child.beneficiary_id})</option>)}</select></div>}
      {recordsLoading ? <p>Loading health records...</p> : !children.length ? <p>No child profile is linked to this parent account.</p> : <div className="records-table-wrapper"><table className="records-table"><thead><tr><th>Date</th><th>Height</th><th>Weight</th><th>BMI</th><th>Status</th></tr></thead><tbody>{sortedRecords.length ? sortedRecords.map((record) => <tr key={record._id}><td>{record.date ? new Date(record.date).toLocaleDateString() : '—'}</td><td>{record.height} cm</td><td>{record.weight} kg</td><td>{record.bmi ?? '—'}</td><td>{record.health_status || '—'}</td></tr>) : <tr><td colSpan="5">No health records have been added for this child.</td></tr>}</tbody></table></div>}
    </div> : <div className="form-container"><h3>Add Health Measurement</h3><form onSubmit={handleSubmit}>
      <div className="form-group"><label>Beneficiary ID</label><input type="text" name="beneficiary_id" value={formData.beneficiary_id} onChange={handleChange} required /></div>
      <div className="form-group"><label>Height (cm)</label><input type="number" step="0.1" name="height" value={formData.height} onChange={handleChange} required /></div>
      <div className="form-group"><label>Weight (kg)</label><input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} required /></div>
      <div className="form-group"><label>Date</label><input type="date" name="date" value={formData.date} onChange={handleChange} required /></div>
      <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Saving...' : 'Save Health Record'}</button>{message && <div className="success-message">{message}</div>}{error && <div className="error-message">{error}</div>}
    </form></div>}
  </main></div></div>;
};

export default Health;
