import React from 'react';

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

export const StatCard = ({ title, value, subtitle }) => (
  <div className="stat-card">
    <h3>{title}</h3>
    <p className="stat-value">{value}</p>
    <p className="stat-subtitle">{subtitle}</p>
  </div>
);

export const BeneficiaryCard = ({ beneficiary }) => (
  <div className="beneficiary-card">
    <h4>{beneficiary.name}</h4>
    <p>Age: {beneficiary.age}</p>
    <p>Gender: {beneficiary.gender}</p>
    <p>Status: {beneficiary.status}</p>
  </div>
);

export default Cards;