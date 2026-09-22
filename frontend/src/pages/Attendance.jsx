import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { attendanceAPI, beneficiaryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Attendance = () => {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';
  const [formData, setFormData] = useState({
    beneficiary_id: '',
    date: new Date().toISOString().split('T')[0],
    status: 'present'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [allRecords, setAllRecords] = useState([]);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    if (!isParent) return;
    const loadAttendance = async () => {
      setRecordsLoading(true);
      setError('');
      try {
        const [attendance, linkedChildren] = await Promise.all([attendanceAPI.getAll(), beneficiaryAPI.getByParent(user?.id || user?.user_id || user?._id)]);
        setChildren(linkedChildren);
        setSelectedChildId(linkedChildren[0]?.beneficiary_id || '');
        setAllRecords(attendance);
      } catch (err) {
        setError(err.message || 'Could not load attendance records.');
      } finally {
        setRecordsLoading(false);
      }
    };
    loadAttendance();
  }, [isParent, user]);

  const parentRecords = useMemo(() => allRecords
    .filter((record) => record.beneficiary_id === selectedChildId && String(new Date(record.date).getFullYear()) === selectedYear)
    .sort((a, b) => new Date(b.date) - new Date(a.date)), [allRecords, selectedChildId, selectedYear]);
  const years = useMemo(() => Array.from(new Set([new Date().getFullYear(), ...allRecords.map((record) => new Date(record.date).getFullYear())])).sort((a, b) => b - a), [allRecords]);

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
      const response = await attendanceAPI.create(formData);
      setMessage('Attendance marked successfully!');
      setFormData({
        beneficiary_id: '',
        date: new Date().toISOString().split('T')[0],
        status: 'present'
      });
    } catch (err) {
      setError(err.message || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <Sidebar role="worker" />
        <main className="main-content">
          <h2>Attendance Records</h2>
          {isParent ? <div className="form-container records-wide">
            <h3>Attendance Marked by Your Anganwadi Worker</h3>
            <p>These attendance records are view-only and show one of your registered children at a time.</p>
            {error && <div className="error-message">{error}</div>}
            {!recordsLoading && children.length > 0 && <p><strong>Child:</strong> {children[0].name} ({children[0].beneficiary_id})</p>}
            {!recordsLoading && children.length > 0 && <div className="form-group"><label>Attendance year</label><select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></div>}
            {recordsLoading ? <p>Loading attendance records...</p> : !children.length ? <p>No child profile is linked to this parent account.</p> : <div className="records-table-wrapper"><table className="records-table">
              <thead><tr><th>Beneficiary ID</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>{parentRecords.length ? parentRecords.map((record) => <tr key={record._id}><td>{record.beneficiary_id}</td><td>{record.date ? new Date(record.date).toLocaleDateString() : '—'}</td><td>{record.status === 'half-day' ? 'Half day' : record.status?.charAt(0).toUpperCase() + record.status?.slice(1)}</td></tr>) : <tr><td colSpan="3">No attendance has been marked for this child in {selectedYear}.</td></tr>}</tbody>
            </table></div>}
          </div> : <div className="form-container">
            <h3>Mark Attendance</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Beneficiary ID</label>
                <input
                  type="text"
                  name="beneficiary_id"
                  value={formData.beneficiary_id}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange} required>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="half-day">Half Day</option>
                </select>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Marking...' : 'Mark Attendance'}
              </button>
              {message && <div className="success-message">{message}</div>}
              {error && <div className="error-message">{error}</div>}
            </form>
          </div>
          }
        </main>
      </div>
    </div>
  );
};

export default Attendance;
