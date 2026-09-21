import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { beneficiaryAPI } from '../services/api';

const blank = () => ({ name: '', dob: '', gender: '', beneficiary_type: 'child', parent_id: '', anganwadi_id: '', contact_phone: '', notes: '' });
const labels = { child: 'Child', pregnant_woman: 'Pregnant woman', lactating_mother: 'Lactating mother' };

export default function Beneficiary() {
  const [form, setForm] = useState(blank());
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = async () => { try { setItems(await beneficiaryAPI.getAll()); } catch (e) { setError(e.message); } };
  useEffect(() => { load(); }, []);
  const shown = useMemo(() => { const q = query.toLowerCase().trim(); return !q ? items : items.filter((x) => [x.name, x.beneficiary_id, x.anganwadi_id, x.beneficiary_type].some((v) => String(v || '').toLowerCase().includes(q))); }, [items, query]);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const reset = () => { setForm(blank()); setEditing(null); };
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { const response = editing ? await beneficiaryAPI.update(editing, form) : await beneficiaryAPI.create(form); setMessage(response.message || 'Beneficiary saved.'); reset(); await load(); }
    catch (err) { setError(err.message || 'Could not save beneficiary.'); } finally { setBusy(false); }
  };
  const edit = (item) => { setEditing(item._id); setForm({ ...blank(), ...item, dob: item.dob?.slice(0, 10) || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const remove = async (item) => { if (!window.confirm(`Remove ${item.name} and related records?`)) return; try { await beneficiaryAPI.delete(item._id); setMessage(`${item.name} removed.`); await load(); } catch (err) { setError(err.message); } };
  return <div className="page"><Navbar /><div className="page-content"><Sidebar role="worker" /><main className="main-content">
    <h2>Beneficiary Management</h2>
    <div className="form-container"><h3>{editing ? 'Update Beneficiary' : 'Register Beneficiary'}</h3><form onSubmit={submit}>
      <Field label="Beneficiary type"><select name="beneficiary_type" value={form.beneficiary_type} onChange={change}><option value="child">Child</option><option value="pregnant_woman">Pregnant woman</option><option value="lactating_mother">Lactating mother</option></select></Field>
      <Field label="Full name"><input name="name" value={form.name} onChange={change} required /></Field><Field label="Date of birth"><input type="date" name="dob" value={form.dob} onChange={change} required /></Field>
      <Field label="Gender"><select name="gender" value={form.gender} onChange={change} required><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option></select></Field>
      <Field label="Parent/guardian ID"><input name="parent_id" value={form.parent_id} onChange={change} required /></Field><Field label="Anganwadi centre ID"><input name="anganwadi_id" value={form.anganwadi_id} onChange={change} required /></Field>
      <Field label="Contact phone (optional)"><input type="tel" name="contact_phone" value={form.contact_phone} onChange={change} /></Field><Field label="Notes / observations"><textarea name="notes" value={form.notes} onChange={change} /></Field>
      <button className="submit-btn" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Register beneficiary'}</button>{editing && <button type="button" className="secondary-btn" onClick={reset}>Cancel</button>}
    </form>{message && <div className="success-message">{message}</div>}{error && <div className="error-message">{error}</div>}</div>
    <div className="form-container records-container records-wide"><h3>Registered Beneficiaries ({items.length})</h3><input className="search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID, centre or type" />
      <div className="records-table-wrapper"><table className="records-table"><thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Date of birth</th><th>Centre</th><th>Actions</th></tr></thead><tbody>{shown.length ? shown.map((x) => <tr key={x._id}><td>{x.beneficiary_id}</td><td><Link className="child-link" to={`/beneficiaries/${x._id}`}>{x.name}</Link></td><td>{labels[x.beneficiary_type] || 'Child'}</td><td>{x.dob ? new Date(x.dob).toLocaleDateString() : '—'}</td><td>{x.anganwadi_id}</td><td className="row-actions"><button type="button" className="edit-btn" onClick={() => edit(x)}>Edit</button><button type="button" className="delete-btn" onClick={() => remove(x)}>Delete</button></td></tr>) : <tr><td colSpan="6">No matching beneficiaries.</td></tr>}</tbody></table></div>
    </div>
  </main></div></div>;
}
function Field({ label, children }) { return <div className="form-group"><label>{label}</label>{children}</div>; }
