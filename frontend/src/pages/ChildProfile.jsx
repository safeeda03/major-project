import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { beneficiaryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyProfile = () => ({ name: '', dob: '', gender: '', anganwadi_id: '', contact_phone: '', notes: '', profile_photo: '' });
const formatDate = (date) => date ? new Date(date).toLocaleDateString() : '—';

export default function ChildProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(emptyProfile());
  const [child, setChild] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadChild = async () => {
    setLoading(true);
    try {
      const children = await beneficiaryAPI.getByParent(user?.id || user?.user_id || user?._id);
      const linkedChild = children[0] || null;
      setChild(linkedChild);
      if (linkedChild) setProfile({ ...emptyProfile(), ...linkedChild, dob: linkedChild.dob?.slice(0, 10) || '' });
    } catch (err) { setError(err.message || 'Could not load child profile.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadChild(); }, [user]);
  const change = (event) => setProfile({ ...profile, [event.target.name]: event.target.value });
  const selectPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Please choose an image smaller than 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setProfile((current) => ({ ...current, profile_photo: reader.result }));
    reader.readAsDataURL(file);
  };
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (child) {
        const response = await beneficiaryAPI.update(child._id, { ...profile, parent_id: child.parent_id, beneficiary_type: 'child' });
        setMessage(response.message || 'Child profile updated successfully.');
      } else {
        const response = await beneficiaryAPI.create({ ...profile, parent_id: user.id, beneficiary_type: 'child' });
        setMessage(`Child profile created successfully. Beneficiary ID: ${response.beneficiary.beneficiary_id}`);
      }
      setEditing(false); await loadChild();
    } catch (err) { setError(err.message || 'Could not save child profile.'); }
    finally { setBusy(false); }
  };
  const cancelEdit = () => { setEditing(false); setError(''); if (child) setProfile({ ...emptyProfile(), ...child, dob: child.dob?.slice(0, 10) || '' }); };

  return <div className="page"><Navbar /><div className="page-content"><Sidebar role="parent" /><main className="main-content">
    <h2>Child Profile</h2>{error && <div className="error-message">{error}</div>}
    {loading ? <p>Loading child profile...</p> : child && !editing ? <div className="child-profile-card">
      <div className="child-photo">{child.profile_photo ? <img src={child.profile_photo} alt={`${child.name}'s profile`} /> : <span>{child.name?.charAt(0)?.toUpperCase()}</span>}</div>
      <h3>{child.name}</h3><p className="child-beneficiary-id">Beneficiary ID: <strong>{child.beneficiary_id}</strong></p>
      <div className="child-profile-details"><div><span>Date of birth</span><strong>{formatDate(child.dob)}</strong></div><div><span>Gender</span><strong>{child.gender}</strong></div><div><span>Anganwadi centre</span><strong>{child.anganwadi_id}</strong></div><div><span>Contact</span><strong>{child.contact_phone || '—'}</strong></div><div><span>Notes</span><strong>{child.notes || '—'}</strong></div></div>
      <button className="submit-btn child-profile-edit" type="button" onClick={() => setEditing(true)}>Edit Profile</button>
    </div> : <div className="form-container"><h3>{child ? 'Edit Child Profile' : 'Add Your Child'}</h3><p>{child ? 'Update your child’s details or profile photo.' : 'Your parent account is linked automatically, and a beneficiary ID is generated after saving.'}</p>
      <form onSubmit={submit}>
        <div className="form-group"><label>Profile picture</label><input type="file" accept="image/*" onChange={selectPhoto} />{profile.profile_photo && <img className="photo-preview" src={profile.profile_photo} alt="Profile preview" />}</div>
        <div className="form-group"><label>Child’s full name</label><input name="name" value={profile.name} onChange={change} required /></div>
        <div className="form-group"><label>Date of birth</label><input type="date" name="dob" value={profile.dob} onChange={change} max={new Date().toISOString().split('T')[0]} required /></div>
        <div className="form-group"><label>Gender</label><select name="gender" value={profile.gender} onChange={change} required><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option></select></div>
        <div className="form-group"><label>Anganwadi centre ID</label><input name="anganwadi_id" value={profile.anganwadi_id} onChange={change} placeholder="e.g. ANG001" required /></div>
        <div className="form-group"><label>Contact phone (optional)</label><input type="tel" name="contact_phone" value={profile.contact_phone} onChange={change} /></div>
        <div className="form-group"><label>Notes or medical information (optional)</label><textarea name="notes" value={profile.notes} onChange={change} /></div>
        <button className="submit-btn" disabled={busy}>{busy ? 'Saving...' : child ? 'Save Changes' : 'Create Child Profile'}</button>{child && <button className="secondary-btn" type="button" onClick={cancelEdit}>Cancel</button>}
      </form>{message && <div className="success-message">{message}</div>}
    </div>}
  </main></div></div>;
}
