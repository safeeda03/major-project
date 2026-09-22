import React from 'react';
import { Link } from 'react-router-dom';

const Cards = ({ title, value, icon, color }) => {
  return (
    <div className="card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="card-icon">{icon}</div>
      <div className="card-content">
        <h3>{title}</h3>
        <p className="card-value">{value}</p>
      </div>
    </div>
  );
};

export const StatCard = ({ title, value, subtitle, to }) => {
  const content = <>
    <h3>{title}</h3>
    <p className="stat-value">{value}</p>
    <p className="stat-subtitle">{subtitle}</p>
  </>;

  return to ? (
    <Link to={to} className="stat-card stat-card-link" aria-label={`View ${title}`}>
      {content}
    </Link>
  ) : (
    <div className="stat-card">{content}</div>
  );
};

export const BeneficiaryCard = ({ beneficiary }) => (
  <div className="beneficiary-card">
    <h4>{beneficiary.name}</h4>
    {beneficiary.beneficiaryId && <p>Beneficiary ID: <strong>{beneficiary.beneficiaryId}</strong></p>}
    <p>Age: {beneficiary.age}</p>
    <p>Gender: {beneficiary.gender}</p>
    <p>Status: {beneficiary.status}</p>
  </div>
);

export default Cards;
