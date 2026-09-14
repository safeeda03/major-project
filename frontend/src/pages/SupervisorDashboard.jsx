import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Cards, { StatCard } from '../components/Cards';

const SupervisorDashboard = () => {
  const stats = [
    { title: 'Total Centres', value: '25', subtitle: 'Under supervision' },
    { title: 'Total Beneficiaries', value: '3,750', subtitle: 'Across all centres' },
    { title: 'High Risk Areas', value: '3', subtitle: 'Require attention' },
    { title: 'This Month Reports', value: '45', subtitle: 'Generated' }
  ];

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="dashboard-content">
        <Sidebar role="supervisor" />
        <main className="main-content">
          <h2>Supervisor Dashboard</h2>
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>
          <div className="dashboard-sections">
            <div className="section">
              <h3>Centre Performance</h3>
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Centre Name</th>
                    <th>Attendance %</th>
                    <th>Health Status</th>
                    <th>Nutrition Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Anganwadi Centre A</td>
                    <td>92%</td>
                    <td>Good</td>
                    <td>Satisfactory</td>
                  </tr>
                  <tr>
                    <td>Anganwadi Centre B</td>
                    <td>88%</td>
                    <td>Moderate</td>
                    <td>Needs Improvement</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="section">
              <h3>Alerts & Notifications</h3>
              <ul className="alert-list">
                <li className="alert-high">Centre C showing declining nutrition trends</li>
                <li className="alert-medium">Vaccination coverage below target in 5 centres</li>
                <li className="alert-low">Monthly reports pending from 2 centres</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SupervisorDashboard;