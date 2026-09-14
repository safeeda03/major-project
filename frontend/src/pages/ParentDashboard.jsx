import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Cards, { StatCard, BeneficiaryCard } from '../components/Cards';
import { LineChart } from '../components/Charts';

const ParentDashboard = () => {
  const childData = {
    name: 'Rahul Kumar',
    age: '3 years 2 months',
    gender: 'Male',
    status: 'Healthy'
  };

  const stats = [
    { title: 'Growth Status', value: 'Normal', subtitle: 'On track' },
    { title: 'Nutrition Status', value: 'Good', subtitle: 'Balanced diet' },
    { title: 'Vaccination', value: 'Up to date', subtitle: 'Next due in 2 months' },
    { title: 'Attendance', value: '95%', subtitle: 'This month' }
  ];

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="dashboard-content">
        <Sidebar role="parent" />
        <main className="main-content">
          <h2>Parent Dashboard</h2>
          <BeneficiaryCard beneficiary={childData} />
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>
          <div className="dashboard-sections">
            <div className="section">
              <h3>Recent Recommendations</h3>
              <ul className="recommendation-list">
                <li>Continue iron-rich foods for better hemoglobin levels</li>
                <li>Ensure regular protein intake for growth</li>
                <li>Next vaccination due: Polio Booster - 15th Oct 2026</li>
              </ul>
            </div>
            <div className="section">
              <h3>Growth Chart</h3>
              <LineChart 
                data={[12, 12.5, 13, 13.8, 14.2, 14.8, 15.2]} 
                labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']}
                title="Weight Growth (kg)"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ParentDashboard;