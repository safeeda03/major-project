import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { attendanceAPI, beneficiaryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const localDateValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getAge = (dob, onDate) => {
  if (!dob) return '—';
  const birth = new Date(dob);
  const day = new Date(`${onDate}T00:00:00`);
  let years = day.getFullYear() - birth.getFullYear();
  if (day.getMonth() < birth.getMonth() || (day.getMonth() === birth.getMonth() && day.getDate() < birth.getDate())) years -= 1;
  return `${Math.max(0, years)} yrs`;
};

const Attendance = () => {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';
  const [date, setDate] = useState(localDateValue);
  const [children, setChildren] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isParent) {
      let active = true;
      Promise.all([
        attendanceAPI.getAll(),
        beneficiaryAPI.getByParent(user?.id || user?.user_id || user?._id)
      ]).then(([records, linkedChildren]) => {
        if (!active) return;
        setAllRecords(records);
        setChildren(linkedChildren);
        setSelectedChildId(linkedChildren[0]?.beneficiary_id || '');
      }).catch((err) => active && setError(err.message || 'Could not load attendance records.'));
      return () => { active = false; };
    }

    let active = true;
    setLoading(true);
    setError('');
    setMessage('');
    attendanceAPI.getDaily(date).then((roster) => {
      if (active) setChildren(roster.map((child) => ({
        ...child,
        status: child.attendance?.status === 'absent' ? 'absent' : 'present'
      })));
    }).catch((err) => active && setError(err.message || 'Could not load children.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [date, isParent, user]);

  const parentRecords = useMemo(() => allRecords
    .filter((record) => record.beneficiary_id === selectedChildId && String(new Date(record.date).getFullYear()) === selectedYear)
    .sort((a, b) => new Date(b.date) - new Date(a.date)), [allRecords, selectedChildId, selectedYear]);
  const years = useMemo(() => Array.from(new Set([new Date().getFullYear(), ...allRecords.map((record) => new Date(record.date).getFullYear())])).sort((a, b) => b - a), [allRecords]);
  const presentCount = children.filter((child) => child.status === 'present').length;
  const absentCount = children.length - presentCount;
  const filteredChildren = children.filter((child) => `${child.name} ${child.beneficiary_id}`.toLowerCase().includes(query.trim().toLowerCase()));

  const setChildAttendance = (beneficiaryId, status) => {
    setChildren((current) => current.map((child) => child.beneficiary_id === beneficiaryId
      ? { ...child, status }
      : child));
    setMessage('');
  };

  const saveAttendance = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await attendanceAPI.saveDaily(date, children.map(({ beneficiary_id, status }) => ({ beneficiary_id, status })));
      setMessage(result.message || 'Attendance saved successfully.');
    } catch (err) {
      setError(err.message || 'Could not save attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <Sidebar role="worker" />
        <main className="main-content">
          {isParent ? <>
            <h2>Attendance Records</h2>
            <div className="form-container records-wide">
              <h3>Attendance Marked by Your Anganwadi Worker</h3>
              <p>These attendance records are view-only and show one of your registered children at a time.</p>
              {error && <div className="error-message">{error}</div>}
              {children.length > 0 && <p><strong>Child:</strong> {children[0].name} ({children[0].beneficiary_id})</p>}
              {children.length > 0 && <div className="form-group"><label>Attendance year</label><select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></div>}
              {!children.length ? <p>No child profile is linked to this parent account.</p> : <div className="records-table-wrapper"><table className="records-table">
                <thead><tr><th>Beneficiary ID</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>{parentRecords.length ? parentRecords.map((record) => <tr key={record._id}><td>{record.beneficiary_id}</td><td>{record.date ? new Date(record.date).toLocaleDateString() : '—'}</td><td>{record.status === 'half-day' ? 'Half day' : record.status?.charAt(0).toUpperCase() + record.status?.slice(1)}</td></tr>) : <tr><td colSpan="3">No attendance has been marked for this child in {selectedYear}.</td></tr>}</tbody>
              </table></div>}
            </div>
          </> : <>
            <div className="attendance-heading"><div><h2>Daily Attendance</h2><p>Record attendance for all registered children.</p></div>
              <div className="attendance-date"><label htmlFor="attendance-date">Date</label><input id="attendance-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
            </div>
            <section className="attendance-summary" aria-label="Attendance summary">
              <div><span>Total Children</span><strong>{children.length}</strong></div>
              <div><span>Present</span><strong className="attendance-present-count">{presentCount}</strong></div>
              <div><span>Absent</span><strong className="attendance-absent-count">{absentCount}</strong></div>
              <div><span>Attendance</span><strong>{children.length ? `${((presentCount / children.length) * 100).toFixed(1)}%` : '0.0%'}</strong></div>
            </section>
            <section className="form-container records-wide attendance-panel">
              <div className="attendance-tools">
                <button type="button" className="mark-all-btn" disabled={loading || !children.length} onClick={() => { setChildren((current) => current.map((child) => ({ ...child, status: 'present' }))); setMessage(''); }}>✓ Mark All Present</button>
                <input className="search-input attendance-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search child by name or ID" aria-label="Search child by name or ID" />
              </div>
              {message && <div className="success-message">{message}</div>}
              {error && <div className="error-message">{error}</div>}
              {loading ? <p>Loading children…</p> : children.length === 0 ? <p>No registered children found.</p> : <form onSubmit={saveAttendance}>
                <div className="records-table-wrapper"><table className="records-table attendance-table">
                  <thead><tr><th>Child</th><th>Beneficiary ID</th><th>Age</th><th>Attendance status</th></tr></thead>
                  <tbody>{filteredChildren.length ? filteredChildren.map((child) => <tr key={child.beneficiary_id}>
                    <td data-label="Child">{child.name}</td><td data-label="Beneficiary ID">{child.beneficiary_id}</td><td data-label="Age">{getAge(child.dob, date)}</td>
                    <td data-label="Attendance status"><div className="attendance-toggle" role="group" aria-label={`Attendance for ${child.name}`}>
                      <button type="button" className={child.status === 'present' ? 'selected present' : ''} aria-pressed={child.status === 'present'} onClick={() => setChildAttendance(child.beneficiary_id, 'present')}>Present</button>
                      <button type="button" className={child.status === 'absent' ? 'selected absent' : ''} aria-pressed={child.status === 'absent'} onClick={() => setChildAttendance(child.beneficiary_id, 'absent')}>Absent</button>
                    </div></td>
                  </tr>) : <tr><td colSpan="4">No children match your search.</td></tr>}</tbody>
                </table></div>
                <div className="attendance-save-row"><span>{children.length} children · {presentCount} present · {absentCount} absent</span><button type="submit" className="submit-btn" disabled={saving}>{saving ? 'Saving…' : 'Save Attendance'}</button></div>
              </form>}
            </section>
          </>}
        </main>
      </div>
    </div>
  );
};

export default Attendance;
