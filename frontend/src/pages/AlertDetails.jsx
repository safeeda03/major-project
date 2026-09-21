import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { reportAPI } from '../services/api';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

const AlertDetails = () => {
  const { type } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDetails = async () => {
      try {
        setError('');
        setData(await reportAPI.getAlertDetails(type));
      } catch (err) {
        setError(err.message || 'Could not load alert details.');
      }
    };
    loadDetails();
  }, [type]);

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <Sidebar role="worker" />
        <main className="main-content">
          <Link className="back-link" to="/reports">← Back to Reports</Link>
          {error && <div className="error-message">{error}</div>}
          {!data && !error && <p>Loading affected beneficiaries...</p>}
          {data && <div className="form-container records-container">
            <h2>{data.title}</h2>
            <p>{data.records.length} {data.records.length === 1 ? 'beneficiary' : 'beneficiaries'} affected.</p>
            {data.records.length ? <div className="records-table-wrapper"><table className="records-table">
              <thead><tr><th>Beneficiary</th><th>Beneficiary ID</th><th>Alert</th><th>Date</th></tr></thead>
              <tbody>{data.records.map((record, index) => (
                <tr key={`${record.beneficiary_id}-${index}`}>
                  <td>{record.beneficiary ? <Link className="child-link" to={`/beneficiaries/${record.beneficiary._id}`}>{record.beneficiary.name}</Link> : 'Unknown beneficiary'}</td>
                  <td>{record.beneficiary_id}</td>
                  <td>{record.status}</td>
                  <td>{formatDate(record.date)}</td>
                </tr>
              ))}</tbody>
            </table></div> : <p>No beneficiaries currently match this alert.</p>}
          </div>}
        </main>
      </div>
    </div>
  );
};

export default AlertDetails;
