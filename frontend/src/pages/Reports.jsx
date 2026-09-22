import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { reportAPI } from '../services/api';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

const reportLabels = {
  beneficiary: 'Beneficiary Report',
  health: 'Health Report',
  nutrition: 'Nutrition Report',
  vaccination: 'Vaccination Report',
  attendance: 'Attendance Report',
  centre: 'Centre Report'
};

const reportColumns = {
  beneficiary: ['Beneficiary ID', 'Name', 'Category', 'Date of Birth', 'Gender', 'Centre'],
  health: ['Beneficiary ID', 'Date', 'Height', 'Weight', 'BMI', 'Status'],
  nutrition: ['Beneficiary ID', 'Date', 'Status', 'Meals', 'Recommendations'],
  vaccination: ['Beneficiary ID', 'Vaccine', 'Given on', 'Next due', 'Status'],
  attendance: ['Beneficiary ID', 'Date', 'Attendance'],
  centre: ['Centre ID', 'Registered Beneficiaries']
};

const reportRow = (type, record) => {
  switch (type) {
    case 'beneficiary': return [record.beneficiary_id, record.name, { child: 'Child', pregnant_woman: 'Pregnant woman', lactating_mother: 'Lactating mother', elderly_person: 'Elderly person' }[record.beneficiary_type] || 'Child', formatDate(record.dob), record.gender, record.anganwadi_id];
    case 'health': return [record.beneficiary_id, formatDate(record.date), `${record.height} cm`, `${record.weight} kg`, record.bmi, record.health_status];
    case 'nutrition': return [record.beneficiary_id, formatDate(record.date), record.nutrition_status, record.meals || '—', record.recommendations || '—'];
    case 'vaccination': return [record.beneficiary_id, record.vaccine, formatDate(record.date), formatDate(record.next_due_date), record.completed ? 'Completed' : 'Pending'];
    case 'attendance': return [record.beneficiary_id, formatDate(record.date), record.status];
    case 'centre': return [record.centre_id, record.beneficiaryCount];
    default: return [];
  }
};

const Reports = () => {
  const [reportType, setReportType] = useState('beneficiary');
  const [beneficiaryCategory, setBeneficiaryCategory] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [report, setReport] = useState(null);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    setReport(null);

    try {
      const response = await reportAPI.generate(reportType, dateRange, reportType === 'beneficiary' ? beneficiaryCategory : '');
      setReport(response);
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
              {reportType === 'beneficiary' && <div className="form-group">
                <label>Category</label>
                <select value={beneficiaryCategory} onChange={(e) => setBeneficiaryCategory(e.target.value)}>
                  <option value="">All categories</option>
                  <option value="child">Child</option>
                  <option value="pregnant_woman">Pregnant woman</option>
                  <option value="lactating_mother">Lactating mother</option>
                  <option value="elderly_person">Elderly person</option>
                </select>
              </div>}
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
          {report && <section className="report-document">
            <div className="report-document-header">
              <div>
                <h2>PoshanAI</h2>
                <h3>{reportLabels[report.reportType]}</h3>
                <p>Generated: {formatDate(report.generatedAt)} · {report.count} record{report.count === 1 ? '' : 's'}</p>
                {(dateRange.startDate || dateRange.endDate) && <p>Period: {dateRange.startDate ? formatDate(dateRange.startDate) : 'Beginning'} to {dateRange.endDate ? formatDate(dateRange.endDate) : 'Today'}</p>}
              </div>
              <button type="button" className="print-btn" onClick={() => window.print()}>Print / Save PDF</button>
            </div>
            {report.data.length ? <div className="records-table-wrapper"><table className="records-table report-table">
              <thead><tr>{reportColumns[report.reportType].map((column) => <th key={column}>{column}</th>)}</tr></thead>
              <tbody>{report.data.map((record, index) => <tr key={record._id || `${record.centre_id}-${index}`}>{reportRow(report.reportType, record).map((value, columnIndex) => <td key={columnIndex}>{value}</td>)}</tr>)}</tbody>
            </table></div> : <p>No records found for this report and date range.</p>}
          </section>}
        </main>
      </div>
    </div>
  );
};

export default Reports;
