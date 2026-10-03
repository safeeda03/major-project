import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { beneficiaryAPI, vaccinationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Vaccination = () => {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';
  const [formData, setFormData] = useState({
    beneficiary_id: '',
    vaccine: '',
    date: new Date().toISOString().split('T')[0],
    next_due_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [linkedChild, setLinkedChild] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    if (!isParent) return;
    const loadChild = async () => {
      setRecordsLoading(true);
      setError('');
      try {
        const children = await beneficiaryAPI.getByParent(user?.id || user?.user_id || user?._id);
        const child = children[0] || null;
        setLinkedChild(child);
        if (child) setRecords(await vaccinationAPI.getByBeneficiary(child.beneficiary_id));
        else setRecords([]);
      } catch (err) { setError(err.message || 'Could not load the linked child profile.'); }
      finally { setRecordsLoading(false); }
    };
    loadChild();
  }, [isParent, user]);

  const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

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
      const response = await vaccinationAPI.create(formData);
      setMessage('Vaccination record saved successfully!');
      setFormData({
        beneficiary_id: isParent ? linkedChild?.beneficiary_id || '' : '',
        vaccine: '',
        date: new Date().toISOString().split('T')[0],
        next_due_date: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to save vaccination record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <Sidebar role={isParent ? 'parent' : 'worker'} />
        <main className="main-content">
          <h2>Vaccination Records</h2>
          {isParent ? <div className="form-container records-wide">
            <h3>Vaccination Records Added by Your Anganwadi Worker</h3>
            <p>These records are view-only. Contact your Anganwadi worker to add or correct a vaccination record.</p>
            {error && <div className="error-message">{error}</div>}
            {recordsLoading ? <p>Loading vaccination records...</p> : !linkedChild ? <p>No child profile is linked to this parent account.</p> : <>
              <p><strong>Child:</strong> {linkedChild.name} ({linkedChild.beneficiary_id})</p>
              <div className="records-table-wrapper"><table className="records-table"><thead><tr><th>Vaccine</th><th>Vaccination date</th><th>Next due date</th><th>Status</th></tr></thead><tbody>
                {sortedRecords.length ? sortedRecords.map((record) => {
                  const dueDate = record.next_due_date ? new Date(record.next_due_date) : null;
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const status = record.completed ? 'Completed' : dueDate && dueDate < today ? 'Overdue' : 'Pending';
                  return <tr key={record._id}><td>{record.vaccine}</td><td>{record.date ? new Date(record.date).toLocaleDateString() : '—'}</td><td>{dueDate ? dueDate.toLocaleDateString() : '—'}</td><td>{status}</td></tr>;
                }) : <tr><td colSpan="4">No vaccination records have been added for this child.</td></tr>}
              </tbody></table></div>
            </>}
          </div> : <div className="form-container">
            <h3>Add Vaccination Record</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Beneficiary ID</label>
                <input
                  type="text"
                  name="beneficiary_id"
                  value={formData.beneficiary_id}
                  onChange={handleChange}
                  readOnly={isParent}
                  required
                />
                {isParent && <small>Your linked child’s beneficiary ID is filled automatically.</small>}
              </div>
              <div className="form-group">
                <label>Vaccine</label>
                <select name="vaccine" value={formData.vaccine} onChange={handleChange} required>
                  <option value="">Select Vaccine</option>
                  <option value="bcg">BCG</option>
                  <option value="polio">Polio</option>
                  <option value="dpt">DPT</option>
                  <option value="mmr">MMR</option>
                  <option value="hepatitis">Hepatitis B</option>
                  <option value="measles">Measles</option>
                </select>
              </div>
              <div className="form-group">
                <label>Vaccination Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Next Due Date</label>
                <input
                  type="date"
                  name="next_due_date"
                  value={formData.next_due_date}
                  onChange={handleChange}
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save Vaccination Record'}
              </button>
              {message && <div className="success-message">{message}</div>}
              {error && <div className="error-message">{error}</div>}
            </form>
          </div>}
        </main>
      </div>
    </div>
  );
};

export default Vaccination;
