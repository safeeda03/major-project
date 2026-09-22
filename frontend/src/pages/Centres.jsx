import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { gisAPI } from '../services/api';

const blankForm = { centre_id: '', name: '', address: '', latitude: '', longitude: '' };

const Centres = () => {
  const [form, setForm] = useState(blankForm);
  const [centres, setCentres] = useState([]);
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
      const centre = await gisAPI.createCentre(form);
      setCentres((items) => [...items, centre].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(blankForm); setMessage('Centre details uploaded successfully.');
    } catch (err) { setError(err.message || 'Could not upload centre details.'); } finally { setSaving(false); }
  };

  return <div className="page"><Navbar /><div className="page-content"><Sidebar role="supervisor" /><main className="main-content">
    <h2>Anganwadi Centres</h2>
    <div className="form-container"><h3>Upload Centre Details</h3><form onSubmit={submit}>
      <Field label="Centre ID"><input name="centre_id" value={form.centre_id} onChange={change} placeholder="e.g. ANG001" required /></Field>
      <Field label="Centre name"><input name="name" value={form.name} onChange={change} placeholder="e.g. Ward 12 Anganwadi" required /></Field>
      <Field label="Address"><textarea name="address" value={form.address} onChange={change} placeholder="Village, ward, district" /></Field>
      <Field label="Latitude"><input name="latitude" type="number" step="any" value={form.latitude} onChange={change} placeholder="e.g. 28.6139" required /></Field>
      <Field label="Longitude"><input name="longitude" type="number" step="any" value={form.longitude} onChange={change} placeholder="e.g. 77.2090" required /></Field>
      <button className="submit-btn" disabled={saving}>{saving ? 'Uploading…' : 'Upload centre details'}</button>
    </form>{message && <div className="success-message">{message}</div>}{error && <div className="error-message">{error}</div>}</div>
    <div className="form-container records-container records-wide"><h3>Saved Centres ({centres.length})</h3>{loading ? <p>Loading centres…</p> : <div className="records-table-wrapper"><table className="records-table"><thead><tr><th>Centre ID</th><th>Centre name</th><th>Address</th><th>Latitude</th><th>Longitude</th></tr></thead><tbody>{centres.length ? centres.map((centre) => <tr key={centre._id || centre.centre_id}><td>{centre.centre_id}</td><td>{centre.name}</td><td>{centre.address || '—'}</td><td>{centre.latitude}</td><td>{centre.longitude}</td></tr>) : <tr><td colSpan="5">No centre details have been uploaded yet.</td></tr>}</tbody></table></div>}</div>
  </main></div></div>;
};

const Field = ({ label, children }) => <div className="form-group"><label>{label}</label>{children}</div>;
export default Centres;
