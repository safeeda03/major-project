import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { reportAPI } from '../services/api';

const Statistics = () => {
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStatistics = async () => {
    setLoading(true);
    setError('');
    try {
      setStatistics(await reportAPI.getCentreStatistics());
    } catch (err) {
      setError(err.message || 'Could not load Anganwadi statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatistics(); }, []);

  return <div className="page"><Navbar /><div className="page-content"><Sidebar role="supervisor" /><main className="main-content">
    <div className="page-heading"><div><h2>Anganwadi Statistics</h2><p>Current child-care indicators for each Anganwadi centre. Attendance is based on the last 30 days.</p></div><button className="submit-btn" type="button" onClick={loadStatistics} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh statistics'}</button></div>
    {error && <div className="error-message">{error}</div>}
    {!loading && !error && <div className="form-container records-wide"><h3>{statistics.length} Anganwadi Centre{statistics.length === 1 ? '' : 's'}</h3><div className="records-table-wrapper"><table className="records-table"><thead><tr><th>Anganwadi centre</th><th>Centre ID</th><th>Beneficiaries</th><th>Health risks</th><th>Nutrition risks</th><th>Pending vaccinations</th><th>Attendance</th></tr></thead><tbody>{statistics.length ? statistics.map((centre) => <tr key={centre.centre_id}><td>{centre.centreName}</td><td>{centre.centre_id}</td><td>{centre.beneficiaries}</td><td>{centre.healthRisk}</td><td>{centre.nutritionRisk}</td><td>{centre.pendingVaccinations}</td><td>{centre.attendanceRate === null ? 'No records' : `${centre.attendanceRate}%`}</td></tr>) : <tr><td colSpan="7">No Anganwadi centres or beneficiary records found.</td></tr>}</tbody></table></div></div>}
    {loading && <p>Loading Anganwadi statistics…</p>}
  </main></div></div>;
};

export default Statistics;
