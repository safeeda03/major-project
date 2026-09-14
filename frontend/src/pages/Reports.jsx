import React, { useState } from 'react';
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
      setAlerts(response.alerts || []);
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
                <div className="alert-item alert-high">
                  <strong>Growth/Health Risk:</strong> 5 children showing stunted growth
                </div>
                <div className="alert-item alert-medium">
                  <strong>Vaccination Due:</strong> 12 children due for vaccination this week
                </div>
                <div className="alert-item alert-low">
                  <strong>Low Attendance:</strong> 3 centres below 80% attendance rate
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Reports;