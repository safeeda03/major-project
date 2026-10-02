import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { activityAPI } from '../services/api';

const activityTypes = [
  ['supplementary_nutrition', 'Supplementary nutrition / food distribution'],
  ['preschool_activity', 'Preschool education activity'],
  ['home_visit', 'Home visit'],
  ['counselling', 'Health or nutrition counselling'],
  ['referral', 'Referral / follow-up'],
  ['food_stock', 'Food or stock record'],
  ['event', 'Birth, death, or centre event'],
];

const initialForm = { activity_type: 'supplementary_nutrition', beneficiary_id: '', date: new Date().toISOString().slice(0, 10), service_type: '', quantity: '', unit: '', beneficiaries_served: '', participation: '', observations: '', reason: '', counselling_topic: '', advice: '', referral_reason: '', referred_to: '', follow_up_required: false, follow_up_status: '', outcome: '', food_item: '', received_quantity: '', distributed_quantity: '', remaining_quantity: '', event_type: '', details: '' };

const Activities = () => {
  const [form, setForm] = useState(initialForm);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try { setRecords(await activityAPI.getAll()); } catch (err) { setError(err.message || 'Could not load activity records.'); }
  };
  useEffect(() => { load(); }, []);

  const update = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true); setMessage(''); setError('');
    try {
      await activityAPI.create({ ...form, beneficiaries_served: form.beneficiaries_served ? Number(form.beneficiaries_served) : undefined });
      setMessage('Activity record saved successfully.');
      setForm({ ...initialForm, activity_type: form.activity_type, date: form.date });
      await load();
    } catch (err) { setError(err.message || 'Could not save activity record.'); } finally { setLoading(false); }
  };

  return (
    <div className="page"><Navbar /><div className="page-content"><Sidebar role="worker" /><main className="main-content">
      <h2>Centre Activities</h2>
      <div className="form-container">
        <h3>Record an activity</h3>
        <p>Use this form for centre work that is not already captured by attendance, health, nutrition, vaccination, or beneficiary records.</p>
        <form onSubmit={submit}>
          <div className="form-group"><label>Activity type</label><select name="activity_type" value={form.activity_type} onChange={update}>{activityTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div className="form-group"><label>Date</label><input type="date" name="date" value={form.date} onChange={update} required /></div>
          <div className="form-group"><label>Beneficiary ID, if applicable</label><input name="beneficiary_id" value={form.beneficiary_id} onChange={update} placeholder="Optional for centre-wide activities" /></div>
          <div className="form-group"><label>Service, food item, topic, or event</label><input name="service_type" value={form.service_type} onChange={update} placeholder="Example: Egg distribution, home counselling" /></div>
          <div className="form-group"><label>Details and observations</label><textarea name="details" value={form.details} onChange={update} rows={4} placeholder="Record the useful facts, advice, participation, or outcome." /></div>
          <div className="form-group"><label>Follow-up status</label><input name="follow_up_status" value={form.follow_up_status} onChange={update} placeholder="Optional" /></div>
          <label className="checkbox-row"><input type="checkbox" name="follow_up_required" checked={form.follow_up_required} onChange={update} /> Follow-up required</label>
          <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Saving...' : 'Save activity record'}</button>
        </form>
        {message && <div className="success-message">{message}</div>}{error && <div className="error-message">{error}</div>}
      </div>
      <section className="records-section"><h3>Recent activity records</h3>{records.length ? <div className="records-table-wrapper"><table className="records-table"><thead><tr><th>Date</th><th>Type</th><th>Beneficiary</th><th>Service / details</th><th>Follow-up</th></tr></thead><tbody>{records.map((record) => <tr key={record._id}><td>{new Date(record.date).toLocaleDateString()}</td><td>{activityTypes.find(([value]) => value === record.activity_type)?.[1] || record.activity_type}</td><td>{record.beneficiary_id || 'Centre-wide'}</td><td>{record.service_type || record.details || '-'}</td><td>{record.follow_up_required ? (record.follow_up_status || 'Required') : 'No'}</td></tr>)}</tbody></table></div> : <p>No activity records yet.</p>}</section>
    </main></div></div>
  );
};

export default Activities;
