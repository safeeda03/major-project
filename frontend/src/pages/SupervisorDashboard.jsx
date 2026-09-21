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
    { title: 'Total Centres', value: '25', subtitle: 'Under supervision' },
    { title: 'Total Beneficiaries', value: '3,750', subtitle: 'Across all centres' },
    { title: 'High Risk Areas', value: '3', subtitle: 'Require attention' },
    { title: 'This Month Reports', value: '45', subtitle: 'Generated' }
  ];

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
              <div className="performance-table-wrapper">
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Centre Name</th>
                    <th>Attendance %</th>
                    <th>Health Status</th>
                    <th>Nutrition Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Anganwadi Centre A</td>
                    <td>92%</td>
                    <td>Good</td>
                    <td>Satisfactory</td>
                  </tr>
                  <tr>
                    <td>Anganwadi Centre B</td>
                    <td>88%</td>
                    <td>Moderate</td>
                    <td>Needs Improvement</td>
                  </tr>
                </tbody>
              </table>
              </div>
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
