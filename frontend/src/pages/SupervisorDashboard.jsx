import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Cards, { StatCard } from '../components/Cards';
import { reportAPI } from '../services/api';

const SupervisorDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState('');
  const [centreStats, setCentreStats] = useState([]);
  const [centreStatsLoading, setCentreStatsLoading] = useState(true);
  const [centreStatsError, setCentreStatsError] = useState('');

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const liveAlerts = await reportAPI.getAlerts();
        const titles = {
          health: 'Growth and health risk',
          nutrition: 'Nutrition risk',
          vaccination: 'Vaccinations overdue',
          attendance: 'Low attendance',
        };
        setAlerts(liveAlerts.map((alert) => ({
          ...alert,
          severity: `${alert.severity.charAt(0).toUpperCase()}${alert.severity.slice(1)}`,
          className: `alert-${alert.severity}`,
          title: titles[alert.type] || 'Action needed',
          detail: alert.message,
        })));
      } catch (error) {
        setAlertsError(error.message || 'Could not load live alerts.');
      } finally {
        setAlertsLoading(false);
      }
    };
    loadAlerts();
  }, []);
  const stats = [
    { title: 'Total Centres', value: centreStatsLoading ? '…' : String(centreStats.length), subtitle: 'Under supervision', to: '/statistics' },
    { title: 'Total Beneficiaries', value: '45', subtitle: 'Across all centres', to: '/beneficiaries' },
    { title: 'High Risk Areas', value: '3', subtitle: 'Require attention', to: '/alerts' },
    { title: 'This Month Reports', value: '45', subtitle: 'Generated', to: '/reports' }
  ];

  useEffect(() => {
    const loadCentreStats = async () => {
      try {
        setCentreStats(await reportAPI.getCentreStatistics());
      } catch (error) {
        setCentreStatsError(error.message || 'Could not load centre statistics.');
      } finally {
        setCentreStatsLoading(false);
      }
    };
    loadCentreStats();
  }, []);

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="dashboard-content">
        <Sidebar role="supervisor" />
        <main className="main-content">
          <h2>Supervisor Dashboard</h2>
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>
          <div className="dashboard-sections">
            <div className="section">
              <h3>Centre Performance</h3>
              <p>Live statistics for each saved Anganwadi centre.</p>
              <div className="performance-table-wrapper">
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Centre Name</th>
                    <th>Beneficiaries</th>
                    <th>Attendance %</th>
                    <th>Health Risks</th>
                    <th>Nutrition Risks</th>
                    <th>Vaccinations Due</th>
                  </tr>
                </thead>
                <tbody>
                  {centreStatsLoading && <tr><td colSpan="6">Loading centre statistics…</td></tr>}
                  {centreStatsError && <tr><td colSpan="6">{centreStatsError}</td></tr>}
                  {!centreStatsLoading && !centreStatsError && centreStats.map((centre) => (
                    <tr key={centre.centre_id}>
                      <td>{centre.centreName}</td>
                      <td>{centre.beneficiaries}</td>
                      <td>{centre.attendanceRate === null ? 'No records' : `${centre.attendanceRate}%`}</td>
                      <td>{centre.healthRisk}</td>
                      <td>{centre.nutritionRisk}</td>
                      <td>{centre.pendingVaccinations}</td>
                    </tr>
                  ))}
                  {!centreStatsLoading && !centreStatsError && centreStats.length === 0 && <tr><td colSpan="6">No centre statistics are available.</td></tr>}
                </tbody>
              </table>
              </div>
              <Link className="alert-detail-link" to="/statistics">View all centre statistics →</Link>
            </div>
            <div className="section">
              <h3>Alerts & Notifications</h3>
              <ul className="alert-list supervisor-alert-list">
                {alertsLoading && <li className="alert-empty">Loading live alerts…</li>}
                {alertsError && <li className="alert-empty alert-error">{alertsError}</li>}
                {!alertsLoading && !alertsError && alerts.length === 0 && <li className="alert-empty">No current health, nutrition, vaccination, or attendance alerts.</li>}
                {alerts.map((alert) => (
                  <li className={`alert-item supervisor-alert ${alert.className}`} key={alert.title}>
                    <div className="alert-heading"><span className="severity-badge">{alert.severity}</span><strong>{alert.title}</strong></div>
                    <p>{alert.detail}</p>
                    <Link className="alert-detail-link" to={`/reports/alerts/${alert.type}`}>View affected beneficiaries</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
