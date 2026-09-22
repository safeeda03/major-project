import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { gisAPI } from '../services/api';

const blankForm = { centre_id: '', name: '', address: '', worker_name: '', worker_phone: '', latitude: '', longitude: '' };

const Centres = () => {
  const [form, setForm] = useState(blankForm);
  const [centres, setCentres] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadCentres = async () => {
    setLoading(true);
    try { setCentres(await gisAPI.getCentres()); } catch (err) { setError(err.message || 'Could not load centres.'); } finally { setLoading(false); }
  };
  useEffect(() => { loadCentres(); }, []);
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      if (editingId) await gisAPI.updateCentre(editingId, form);
      else await gisAPI.createCentre(form);
      await loadCentres();
      setForm(blankForm); setEditingId(null); setMessage(editingId ? 'Centre details updated successfully.' : 'Centre details saved successfully.');
    } catch (err) { setError(err.message || `Could not ${editingId ? 'update' : 'save'} centre details.`); } finally { setSaving(false); }
  };
  const editCentre = (centre) => {
    setEditingId(centre._id);
    setForm({ centre_id: centre.centre_id || '', name: centre.name || '', address: centre.address || '', worker_name: centre.worker_name || '', worker_phone: centre.worker_phone || '', latitude: centre.latitude ?? '', longitude: centre.longitude ?? '' });
    setError(''); setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelEdit = () => { setEditingId(null); setForm(blankForm); setError(''); setMessage(''); };

  return <div className="page"><Navbar /><div className="page-content"><Sidebar role="supervisor" /><main className="main-content">
    <h2>Anganwadi Centres</h2>
    <div className="form-container"><h3>{editingId ? 'Update Centre Details' : 'Upload Centre Details'}</h3><form onSubmit={submit}>
      <Field label="Centre ID"><input name="centre_id" value={form.centre_id} onChange={change} placeholder="e.g. ANG001" required /></Field>
      <Field label="Centre name"><input name="name" value={form.name} onChange={change} placeholder="e.g. Ward 12 Anganwadi" required /></Field>
      <Field label="Address"><textarea name="address" value={form.address} onChange={change} placeholder="Village, ward, district" /></Field>
      <Field label="Anganwadi worker name"><input name="worker_name" value={form.worker_name} onChange={change} placeholder="Worker's full name" required /></Field>
      <Field label="Anganwadi worker phone number"><input name="worker_phone" type="tel" value={form.worker_phone} onChange={change} placeholder="10-digit phone number" pattern="[0-9]{10}" title="Enter a 10-digit phone number" required /></Field>
      <Field label="Latitude"><input name="latitude" type="number" step="any" value={form.latitude} onChange={change} placeholder="e.g. 28.6139" required /></Field>
      <Field label="Longitude"><input name="longitude" type="number" step="any" value={form.longitude} onChange={change} placeholder="e.g. 77.2090" required /></Field>
      <button className="submit-btn" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update centre details' : 'Upload centre details'}</button>{editingId && <button type="button" className="secondary-btn" onClick={cancelEdit}>Cancel</button>}
    </form>{message && <div className="success-message">{message}</div>}{error && <div className="error-message">{error}</div>}</div>
    <div className="form-container records-container records-wide"><h3>Saved Centres ({centres.length})</h3>{loading ? <p>Loading centres…</p> : <div className="records-table-wrapper"><table className="records-table"><thead><tr><th>Centre ID</th><th>Centre name</th><th>Address</th><th>Worker name</th><th>Worker phone</th><th>Latitude</th><th>Longitude</th><th>Action</th></tr></thead><tbody>{centres.length ? centres.map((centre) => <tr key={centre._id || centre.centre_id}><td>{centre.centre_id}</td><td>{centre.name}</td><td>{centre.address || '—'}</td><td>{centre.worker_name || '—'}</td><td>{centre.worker_phone || '—'}</td><td>{centre.latitude}</td><td>{centre.longitude}</td><td><button type="button" className="edit-btn" onClick={() => editCentre(centre)}>Edit</button></td></tr>) : <tr><td colSpan="8">No centre details have been uploaded yet.</td></tr>}</tbody></table></div>}</div>
  </main></div></div>;
};

const Field = ({ label, children }) => <div className="form-group"><label>{label}</label>{children}</div>;
export default Centres;
