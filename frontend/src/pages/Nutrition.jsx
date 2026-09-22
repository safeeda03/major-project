import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { beneficiaryAPI, nutritionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Nutrition = () => {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';
  const [formData, setFormData] = useState({ beneficiary_id: '', nutrition_status: '', meals: '', recommendations: '' });
  const [loading, setLoading] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const [children, setChildren] = useState([]); const [selectedChildId, setSelectedChildId] = useState(''); const [records, setRecords] = useState([]); const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    if (!isParent) return;
    const loadChildren = async () => { setRecordsLoading(true); setError(''); try {
      const linkedChildren = await beneficiaryAPI.getByParent(user.id || user.user_id || user._id); setChildren(linkedChildren); setSelectedChildId(linkedChildren[0]?.beneficiary_id || '');
    } catch (err) { setError(err.message || 'Could not load child profiles.'); } finally { setRecordsLoading(false); } };
    loadChildren();
  }, [isParent, user]);
  useEffect(() => {
    if (!isParent || !selectedChildId) { if (isParent) setRecords([]); return; }
    const loadRecords = async () => { setRecordsLoading(true); setError(''); try { setRecords(await nutritionAPI.getByBeneficiary(selectedChildId)); } catch (err) { setError(err.message || 'Could not load nutrition records.'); } finally { setRecordsLoading(false); } };
    loadRecords();
  }, [isParent, selectedChildId]);
  const sortedRecords = useMemo(() => [...records].sort((a, b) => new Date(b.date) - new Date(a.date)), [records]);
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); setError(''); setMessage(''); try { await nutritionAPI.create(formData); setMessage('Nutrition record saved successfully!'); setFormData({ beneficiary_id: '', nutrition_status: '', meals: '', recommendations: '' }); } catch (err) { setError(err.message || 'Failed to save nutrition record'); } finally { setLoading(false); } };

  return <div className="page"><Navbar /><div className="page-content"><Sidebar role={isParent ? 'parent' : 'worker'} /><main className="main-content"><h2>Nutrition Records</h2>
    {isParent ? <div className="form-container records-wide"><h3>Nutrition Records Added by Your Anganwadi Worker</h3><p>These records are view-only and show only children linked to your parent account.</p>{error && <div className="error-message">{error}</div>}
      {!recordsLoading && children.length > 0 && <p><strong>Child:</strong> {children[0].name} ({children[0].beneficiary_id})</p>}
      {recordsLoading ? <p>Loading nutrition records...</p> : !children.length ? <p>No child profile is linked to this parent account.</p> : <div className="records-table-wrapper"><table className="records-table"><thead><tr><th>Date</th><th>Status</th><th>Meals</th><th>Recommendations</th></tr></thead><tbody>{sortedRecords.length ? sortedRecords.map((record) => <tr key={record._id}><td>{record.date ? new Date(record.date).toLocaleDateString() : '—'}</td><td>{record.nutrition_status || '—'}</td><td>{record.meals || '—'}</td><td>{record.recommendations || '—'}</td></tr>) : <tr><td colSpan="4">No nutrition records have been added for this child.</td></tr>}</tbody></table></div>}
    </div> : <div className="form-container"><h3>Add Nutrition Assessment</h3><form onSubmit={handleSubmit}>
      <div className="form-group"><label>Beneficiary ID</label><input type="text" name="beneficiary_id" value={formData.beneficiary_id} onChange={handleChange} required /></div><div className="form-group"><label>Nutrition Status</label><select name="nutrition_status" value={formData.nutrition_status} onChange={handleChange} required><option value="">Select Status</option><option value="normal">Normal</option><option value="underweight">Underweight</option><option value="overweight">Overweight</option><option value="stunted">Stunted</option><option value="wasted">Wasted</option></select></div><div className="form-group"><label>Meals Provided</label><textarea name="meals" value={formData.meals} onChange={handleChange} placeholder="Breakfast, Lunch, Snacks details..." /></div><div className="form-group"><label>Recommendations</label><textarea name="recommendations" value={formData.recommendations} onChange={handleChange} placeholder="Dietary recommendations..." /></div><button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Saving...' : 'Save Nutrition Record'}</button>{message && <div className="success-message">{message}</div>}{error && <div className="error-message">{error}</div>}
    </form></div>}
  </main></div></div>;
};

export default Nutrition;
