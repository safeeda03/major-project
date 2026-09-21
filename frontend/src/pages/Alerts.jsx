import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { reportAPI } from '../services/api';

const alertTitles = {
  health: 'Growth and health risk',
  nutrition: 'Nutrition risk',
  vaccination: 'Vaccinations overdue',
  attendance: 'Low attendance',
};

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError('');
      setAlerts(await reportAPI.getAlerts());
    } catch (err) {
      setError(err.message || 'Could not load alerts. Check that the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAlerts(); }, []);

  return <div className="page"><Navbar /><div className="page-content"><Sidebar role="supervisor" /><main className="main-content">
    <div className="page-heading"><div><h2>Alerts & Notifications</h2><p>Live alerts calculated from saved health, nutrition, vaccination, and attendance records.</p></div><button className="submit-btn" type="button" onClick={loadAlerts} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh alerts'}</button></div>
    {error && <div className="error-message">{error}</div>}
    {loading && <p>Loading live alerts…</p>}
    {!loading && !error && !alerts.length && <div className="form-container"><p>No current alerts. All monitored records are within the configured thresholds.</p></div>}
    {!loading && !error && alerts.length > 0 && <div className="alerts-page-grid">
      {alerts.map((alert) => <article className={`alert-item alert-card alert-${alert.severity}`} key={alert.type}>
        <div className="alert-heading"><span className="severity-badge">{alert.severity}</span><h3>{alertTitles[alert.type] || 'Action needed'}</h3></div>
        <p>{alert.message}</p><p className="alert-count">{alert.count} affected record{alert.count === 1 ? '' : 's'}</p>
        <Link className="alert-detail-link" to={`/reports/alerts/${alert.type}`}>View affected beneficiaries →</Link>
      </article>)}
    </div>}
  </main></div></div>;
};

export default Alerts;
