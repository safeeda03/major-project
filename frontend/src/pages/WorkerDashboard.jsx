import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Cards, { StatCard } from '../components/Cards';
import { LineChart, BarChart } from '../components/Charts';

const WorkerDashboard = () => {
  const stats = [
    { title: 'Total Beneficiaries', value: '150', subtitle: 'Children registered', to: '/beneficiaries' },
    { title: 'Today\'s Attendance', value: '142', subtitle: '94.6% attendance', to: '/attendance' },
    { title: 'Vaccination Due', value: '12', subtitle: 'This month', to: '/vaccination' },
    { title: 'Health Alerts', value: '5', subtitle: 'Action required', to: '/health' }
  ];

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="dashboard-content">
        <Sidebar role="worker" />
        <main className="main-content">
          <h2>Worker Dashboard</h2>
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>
          <div className="dashboard-sections">
            <div className="section">
              <h3>Recent Activities</h3>
              <ul className="activity-list">
                <li>Added 3 new beneficiaries</li>
                <li>Updated health records for 5 children</li>
                <li>Recorded attendance for today</li>
              </ul>
            </div>
            <div className="section">
              <h3>Pending Tasks</h3>
              <ul className="task-list">
                <li>Follow up on missed vaccinations</li>
                <li>Complete nutrition assessment</li>
                <li>Review OCR uploaded documents</li>
              </ul>
            </div>
          </div>
          
          <div className="dashboard-sections">
            <div className="section">
              <h3>Monthly Attendance Trend</h3>
              <LineChart 
                data={[85, 88, 92, 90, 94, 89, 91]} 
                labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']}
                title="Attendance Percentage"
              />
            </div>
            <div className="section">
              <h3>Nutrition Status Distribution</h3>
              <BarChart 
                data={[120, 15, 8, 5, 2]} 
                labels={['Normal', 'Underweight', 'Overweight', 'Stunted', 'Wasted']}
                title="Children by Nutrition Status"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default WorkerDashboard;
