import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { reportAPI } from '../services/api';

const Reports = () => {
  const [reportType, setReportType] = useState('beneficiary');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [alerts, setAlerts] = useState([]);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await reportAPI.generate(reportType, dateRange);
      setMessage('Report generated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await reportAPI.getAlerts();
      setAlerts(Array.isArray(response) ? response : response.alerts || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  };

  React.useEffect(() => {
    loadAlerts();
  }, []);

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <Sidebar role="worker" />
        <main className="main-content">
          <h2>Reports</h2>
          <div className="reports-container">
            <div className="report-filters">
              <h3>Generate Report</h3>
              <div className="form-group">
                <label>Report Type</label>
                <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  <option value="beneficiary">Beneficiary Report</option>
                  <option value="health">Health Report</option>
                  <option value="nutrition">Nutrition Report</option>
                  <option value="vaccination">Vaccination Report</option>
                  <option value="attendance">Attendance Report</option>
                  <option value="centre">Centre Report</option>
                </select>
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                />
              </div>
              <button onClick={handleGenerateReport} className="submit-btn" disabled={loading}>
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
              {message && <div className="success-message">{message}</div>}
              {error && <div className="error-message">{error}</div>}
            </div>
            
            <div className="alerts-section">
              <h3>Alerts</h3>
              <div className="alert-list">
                {alerts.length ? alerts.map((alert) => (
                  <Link key={alert.type} to={`/reports/alerts/${alert.type}`} className={`alert-item alert-${alert.severity} alert-link`}>
                    <strong>{alert.type === 'health' ? 'Growth/Health Risk' : alert.type === 'vaccination' ? 'Vaccination Due' : alert.type === 'nutrition' ? 'Nutrition Risk' : 'Low Attendance'}:</strong> {alert.message}
                    <span className="alert-view-link">View students →</span>
                  </Link>
                )) : <p>No current alerts based on the saved records.</p>}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Reports;
