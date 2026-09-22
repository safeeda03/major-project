import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { beneficiaryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyProfile = () => ({ name: '', dob: '', gender: '', anganwadi_id: '', contact_phone: '', notes: '' });

const formatDate = (date) => date ? new Date(date).toLocaleDateString() : '—';

export default function ChildProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(emptyProfile());
  const [children, setChildren] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const parentIds = [user?.id, user?.user_id, user?._id].filter(Boolean);
  const loadChildren = async () => {
    setLoading(true);
    try {
      const beneficiaries = await beneficiaryAPI.getAll();
      setChildren(beneficiaries.filter((beneficiary) => parentIds.includes(beneficiary.parent_id)));
    } catch (err) { setError(err.message || 'Could not load child profiles.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadChildren(); }, [user]);
  const change = (event) => setProfile({ ...profile, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const response = await beneficiaryAPI.create({ ...profile, parent_id: user.id, beneficiary_type: 'child' });
      const child = response.beneficiary;
      setMessage(`Child profile created successfully. Beneficiary ID: ${child.beneficiary_id}`);
      setProfile(emptyProfile());
      await loadChildren();
    } catch (err) { setError(err.message || 'Could not create child profile.'); }
    finally { setBusy(false); }
  };

  return <div className="page"><Navbar /><div className="page-content"><Sidebar role="parent" /><main className="main-content">
    <h2>Child Profile</h2>
    <div className="form-container"><h3>Add Your Child</h3><p>Enter your child’s details. Your parent account is linked automatically, and a beneficiary ID will be generated after saving.</p>
      <form onSubmit={submit}>
        <div className="form-group"><label>Child’s full name</label><input name="name" value={profile.name} onChange={change} required /></div>
        <div className="form-group"><label>Date of birth</label><input type="date" name="dob" value={profile.dob} onChange={change} max={new Date().toISOString().split('T')[0]} required /></div>
        <div className="form-group"><label>Gender</label><select name="gender" value={profile.gender} onChange={change} required><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option></select></div>
        <div className="form-group"><label>Anganwadi centre ID</label><input name="anganwadi_id" value={profile.anganwadi_id} onChange={change} placeholder="e.g. ANG001" required /></div>
        <div className="form-group"><label>Contact phone (optional)</label><input type="tel" name="contact_phone" value={profile.contact_phone} onChange={change} /></div>
        <div className="form-group"><label>Notes or medical information (optional)</label><textarea name="notes" value={profile.notes} onChange={change} /></div>
        <button className="submit-btn" disabled={busy}>{busy ? 'Saving...' : 'Create Child Profile'}</button>
      </form>
      {message && <div className="success-message">{message}</div>}{error && <div className="error-message">{error}</div>}
    </div>
    <div className="form-container records-wide"><h3>Your Child Profiles</h3>
      {loading ? <p>Loading child profiles...</p> : children.length ? <div className="records-table-wrapper"><table className="records-table"><thead><tr><th>Beneficiary ID</th><th>Name</th><th>Date of birth</th><th>Gender</th><th>Centre ID</th><th>Contact</th><th>Notes</th></tr></thead><tbody>{children.map((child) => <tr key={child._id}><td><strong>{child.beneficiary_id}</strong></td><td>{child.name}</td><td>{formatDate(child.dob)}</td><td>{child.gender}</td><td>{child.anganwadi_id}</td><td>{child.contact_phone || '—'}</td><td>{child.notes || '—'}</td></tr>)}</tbody></table></div> : <p>No child profile has been created for this account yet.</p>}
    </div>
  </main></div></div>;
}
