import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { attendanceAPI, beneficiaryAPI, healthAPI, nutritionAPI, vaccinationAPI } from '../services/api';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

const BeneficiaryDetails = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [updatingVaccinationId, setUpdatingVaccinationId] = useState(null);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const beneficiary = await beneficiaryAPI.getById(id);
        const [healthRecords, attendance, vaccinations, nutritionRecords] = await Promise.all([
          healthAPI.getByBeneficiary(beneficiary.beneficiary_id),
          attendanceAPI.getByBeneficiary(beneficiary.beneficiary_id),
          vaccinationAPI.getByBeneficiary(beneficiary.beneficiary_id),
          nutritionAPI.getByBeneficiary(beneficiary.beneficiary_id),
        ]);
        setData({ beneficiary, healthRecords, attendance, vaccinations, nutritionRecords });
      } catch (err) {
        setError(err.message || 'Could not load beneficiary details.');
      }
    };

    loadDetails();
  }, [id]);

  const handleMarkCompleted = async (record) => {
    try {
      setError('');
      setMessage('');
      setUpdatingVaccinationId(record._id);
      const response = await vaccinationAPI.markCompleted(record._id);
      setData((current) => ({
        ...current,
        vaccinations: current.vaccinations.map((item) => (
          item._id === record._id ? response.vaccination : item
        ))
      }));
      setMessage(`${record.vaccine} marked as completed.`);
    } catch (err) {
      setError(err.message || 'Could not mark vaccination as completed.');
    } finally {
      setUpdatingVaccinationId(null);
    }
  };

  const handleMarkIncomplete = async (record) => {
    try {
      setError('');
      setMessage('');
      setUpdatingVaccinationId(record._id);
      const response = await vaccinationAPI.markIncomplete(record._id);
      setData((current) => ({
        ...current,
        vaccinations: current.vaccinations.map((item) => (
          item._id === record._id ? response.vaccination : item
        ))
      }));
      setMessage(`${record.vaccine} marked as due again.`);
    } catch (err) {
      setError(err.message || 'Could not undo the vaccination status.');
    } finally {
      setUpdatingVaccinationId(null);
    }
  };

  const handleDeleteVaccination = async (record) => {
    if (!window.confirm(`Delete the ${record.vaccine} vaccination record?`)) return;

    try {
      setError('');
      setMessage('');
      setUpdatingVaccinationId(record._id);
      await vaccinationAPI.delete(record._id);
      setData((current) => ({
        ...current,
        vaccinations: current.vaccinations.filter((item) => item._id !== record._id)
      }));
      setMessage(`${record.vaccine} vaccination record deleted.`);
    } catch (err) {
      setError(err.message || 'Could not delete vaccination record.');
    } finally {
      setUpdatingVaccinationId(null);
    }
  };

  return (
    <div className="page">
      <Navbar />
      <div className="page-content">
        <Sidebar role="worker" />
        <main className="main-content">
          <Link className="back-link" to="/beneficiaries">← Back to Beneficiaries</Link>
          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}
          {!data && !error && <p>Loading beneficiary details...</p>}
          {data && <>
            <h2>{data.beneficiary.name}</h2>
            <div className="profile-summary">
              <div><span>Beneficiary ID</span><strong>{data.beneficiary.beneficiary_id}</strong></div>
              <div><span>Date of Birth</span><strong>{formatDate(data.beneficiary.dob)}</strong></div>
              <div><span>Gender</span><strong>{data.beneficiary.gender}</strong></div>
              <div><span>Centre ID</span><strong>{data.beneficiary.anganwadi_id}</strong></div>
            </div>

            <RecordTable title="Health Records" headers={['Date', 'Height', 'Weight', 'BMI', 'Status']} rows={data.healthRecords.map((record) => [formatDate(record.date), `${record.height} cm`, `${record.weight} kg`, record.bmi, record.health_status])} />
            <RecordTable title="Nutrition Records" headers={['Date', 'Status', 'Meals', 'Recommendations']} rows={data.nutritionRecords.map((record) => [formatDate(record.date), record.nutrition_status, record.meals || '—', record.recommendations || '—'])} />
            <RecordTable title="Attendance Records" headers={['Date', 'Status']} rows={data.attendance.map((record) => [formatDate(record.date), record.status])} />
            <div className="form-container records-container">
              <h3>Vaccination Records</h3>
              {data.vaccinations.length ? <div className="records-table-wrapper"><table className="records-table"><thead><tr><th>Vaccine</th><th>Given on</th><th>Next due</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.vaccinations.map((record) => (
                <tr key={record._id}>
                  <td>{record.vaccine}</td>
                  <td>{formatDate(record.date)}</td>
                  <td>{formatDate(record.next_due_date)}</td>
                  <td>{record.completed ? <span className="vaccination-complete" aria-label="Completed">✓ Done</span> : <span className="vaccination-pending">Due</span>}</td>
                  <td className="vaccination-actions">
                    {!record.completed && <button type="button" className="complete-btn" onClick={() => handleMarkCompleted(record)} disabled={updatingVaccinationId === record._id}>✓ Mark done</button>}
                    {record.completed && <button type="button" className="undo-btn" onClick={() => handleMarkIncomplete(record)} disabled={updatingVaccinationId === record._id}>Undo done</button>}
                    <button type="button" className="delete-btn" onClick={() => handleDeleteVaccination(record)} disabled={updatingVaccinationId === record._id}>Delete</button>
                  </td>
                </tr>
              ))}</tbody></table></div> : <p>No records found.</p>}
            </div>
          </>}
        </main>
      </div>
    </div>
  );
};

const RecordTable = ({ title, headers, rows }) => (
  <div className="form-container records-container">
    <h3>{title}</h3>
    {rows.length ? <div className="records-table-wrapper"><table className="records-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div> : <p>No records found.</p>}
  </div>
);

export default BeneficiaryDetails;
