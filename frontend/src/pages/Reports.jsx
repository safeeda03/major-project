import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { gisAPI, reportAPI } from '../services/api';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

const reportLabels = {
  beneficiary: 'Beneficiary Report',
  health: 'Health Report',
  nutrition: 'Nutrition Report',
  vaccination: 'Vaccination Report',
  attendance: 'Attendance Report',
  centre: 'Centre Report',
  activity: 'Centre Activity Report',
  monthly: 'Monthly Centre Summary'
};

const reportColumns = {
  beneficiary: ['Beneficiary ID', 'Name', 'Category', 'Date of Birth', 'Gender', 'Centre'],
  health: ['Beneficiary ID', 'Date', 'Height', 'Weight', 'BMI', 'Status'],
  nutrition: ['Beneficiary ID', 'Date', 'Status', 'Meals', 'Recommendations'],
  vaccination: ['Beneficiary ID', 'Vaccine', 'Given on', 'Next due', 'Status'],
  attendance: ['Beneficiary ID', 'Date', 'Attendance'],
  centre: ['Centre ID', 'Registered Beneficiaries'],
  activity: ['Date', 'Activity type', 'Beneficiary', 'Details', 'Follow-up'],
  monthly: ['Metric', 'Count']
};

const reportRow = (type, record) => {
  switch (type) {
    case 'beneficiary': return [record.beneficiary_id, record.name, { child: 'Child', pregnant_woman: 'Pregnant woman', lactating_mother: 'Lactating mother', elderly_person: 'Elderly person' }[record.beneficiary_type] || 'Child', formatDate(record.dob), record.gender, record.anganwadi_id];
    case 'health': return [record.beneficiary_id, formatDate(record.date), `${record.height} cm`, `${record.weight} kg`, record.bmi, record.health_status];
    case 'nutrition': return [record.beneficiary_id, formatDate(record.date), record.nutrition_status, record.meals || '—', record.recommendations || '—'];
    case 'vaccination': return [record.beneficiary_id, record.vaccine, formatDate(record.date), formatDate(record.next_due_date), record.completed ? 'Completed' : 'Pending'];
    case 'attendance': return [record.beneficiary_id, formatDate(record.date), record.status];
    case 'centre': return [record.centre_id, record.beneficiaryCount];
    case 'activity': return [formatDate(record.date), record.activity_type, record.beneficiary_id || 'Centre-wide', record.service_type || record.details || '-', record.follow_up_required ? (record.follow_up_status || 'Required') : 'No'];
    case 'monthly': return [record.metric, record.count];
    default: return [];
  }
};

const Reports = () => {
  const [reportType, setReportType] = useState('beneficiary');
  const [beneficiaryCategory, setBeneficiaryCategory] = useState('');
  const [centreId, setCentreId] = useState('');
  const [centres, setCentres] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    setReport(null);

    try {
      const response = await reportAPI.generate(reportType, dateRange, reportType === 'beneficiary' ? beneficiaryCategory : '', centreId);
      setReport(response);
      setMessage('Report generated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    gisAPI.getCentres().then((response) => setCentres(Array.isArray(response) ? response : [])).catch(() => setCentres([]));
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
                  <option value="activity">Centre Activity Report</option>
                  <option value="monthly">Monthly Centre Summary</option>
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
                <label>Centre ID</label>
                <select value={centreId} onChange={(e) => setCentreId(e.target.value)}>
                  <option value="">All centres</option>
                  {centres.map((centre) => <option key={centre.centre_id} value={centre.centre_id}>{centre.centre_id}{centre.name ? ` — ${centre.name}` : ''}</option>)}
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
            
          </div>
          {report && <section className="report-document">
            <div className="report-document-header">
              <div>
                <h2>PoshanAI</h2>
                <h3>{reportLabels[report.reportType]}</h3>
                <p>Generated: {formatDate(report.generatedAt)} · {report.count} record{report.count === 1 ? '' : 's'}</p>
                {report.centreId && <p>Centre: {report.centreId}{report.centreName ? ` — ${report.centreName}` : ''}</p>}
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
