import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Cards, { StatCard } from '../components/Cards';
import { LineChart, BarChart } from '../components/Charts';
import { attendanceAPI, beneficiaryAPI, healthAPI, nutritionAPI, vaccinationAPI } from '../services/api';

const WorkerDashboard = () => {
  const [data, setData] = useState({ beneficiaries: [], attendance: [], dueVaccinations: [], healthRecords: [], nutritionRecords: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [beneficiaries, attendance, dueVaccinations, healthRecords, nutritionRecords] = await Promise.all([
          beneficiaryAPI.getAll(),
          attendanceAPI.getAll(),
          vaccinationAPI.getPending(),
          healthAPI.getAll(),
          nutritionAPI.getAll(),
        ]);
        setData({ beneficiaries, attendance, dueVaccinations, healthRecords, nutritionRecords });
      } catch (err) {
        setError(err.message || 'Could not load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const today = new Date().toDateString();
  const beneficiariesById = Object.fromEntries(data.beneficiaries.map((child) => [child.beneficiary_id, child]));
  const todayAttendance = data.attendance.filter((record) => new Date(record.date).toDateString() === today);
  const presentCount = todayAttendance.filter((record) => record.status === 'present').length;
  const latestHealthByChild = data.healthRecords.reduce((latest, record) => {
    const existing = latest[record.beneficiary_id];
    if (!existing || new Date(record.date) > new Date(existing.date)) latest[record.beneficiary_id] = record;
    return latest;
  }, {});
  const healthAlerts = Object.values(latestHealthByChild).filter((record) => record.health_status !== 'normal');
  const latestNutritionByChild = data.nutritionRecords.reduce((latest, record) => {
    const existing = latest[record.beneficiary_id];
    if (!existing || new Date(record.date) > new Date(existing.date)) latest[record.beneficiary_id] = record;
    return latest;
  }, {});
  const nutritionStatuses = ['normal', 'underweight', 'overweight', 'stunted', 'wasted'];
  const nutritionCounts = nutritionStatuses.map((status) => Object.values(latestNutritionByChild).filter((record) => record.nutrition_status === status).length);
  const monthlyAttendance = Array.from({ length: 7 }, (_, index) => {
    const month = new Date();
    month.setDate(1);
    month.setHours(0, 0, 0, 0);
    month.setMonth(month.getMonth() - (6 - index));
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    const records = data.attendance.filter((record) => {
      const recordDate = new Date(record.date);
      return !Number.isNaN(recordDate.getTime())
        && `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}` === monthKey;
    });
    const attendanceUnits = records.reduce((total, record) => (
      total + (record.status === 'present' ? 1 : record.status === 'half-day' ? 0.5 : 0)
    ), 0);

    return {
      label: month.toLocaleString(undefined, { month: 'short' }),
      // A month without attendance entries is left blank rather than displayed as 0%.
      percentage: records.length ? Math.round((attendanceUnits / records.length) * 100) : null
    };
  });
  const ChildLink = ({ id }) => {
    const child = beneficiariesById[id];
    return child ? <Link className="child-link" to={`/beneficiaries/${child._id}`}>{child.name} ({id})</Link> : id;
  };
  const stats = [
    { title: 'Total Beneficiaries', value: data.beneficiaries.length, subtitle: 'Children registered', to: '/beneficiaries' },
    { title: 'Today\'s Attendance', value: presentCount, subtitle: `${todayAttendance.length} records today`, to: '/attendance' },
    { title: 'Vaccination Due', value: data.dueVaccinations.length, subtitle: 'Pending vaccinations', to: '/vaccination' },
    { title: 'Health Alerts', value: healthAlerts.length, subtitle: 'Latest non-normal records', to: '/health' }
  ];

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="dashboard-content">
        <Sidebar role="worker" />
        <main className="main-content">
          <h2>Worker Dashboard</h2>
          {loading && <p>Loading current database values...</p>}
          {error && <div className="error-message">{error}</div>}
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>
          <div className="dashboard-sections">
            <div className="section">
              <h3>Today&apos;s Attendance</h3>
              <ul className="activity-list">
                {todayAttendance.length ? todayAttendance.map((record) => (
                  <li key={record._id}><ChildLink id={record.beneficiary_id} /> — {record.status}</li>
                )) : <li>No attendance recorded for today.</li>}
              </ul>
            </div>
            <div className="section">
              <h3>Pending Vaccinations</h3>
              <ul className="task-list">
                {data.dueVaccinations.length ? data.dueVaccinations.map((record) => (
                  <li key={record._id}><ChildLink id={record.beneficiary_id} /> — {record.vaccine} (due {new Date(record.next_due_date).toLocaleDateString()})</li>
                )) : <li>No vaccinations are pending.</li>}
              </ul>
            </div>
          </div>

          <div className="dashboard-sections">
            <div className="section">
              <h3>Health Alerts</h3>
              <ul className="task-list">
                {healthAlerts.length ? healthAlerts.map((record) => (
                  <li key={record._id}><ChildLink id={record.beneficiary_id} /> — {record.health_status}</li>
                )) : <li>No health alerts in current records.</li>}
              </ul>
            </div>
          </div>
          
          <div className="dashboard-sections">
            <div className="section">
              <h3>Monthly Attendance Trend</h3>
              <LineChart 
                data={monthlyAttendance.map((month) => month.percentage)}
                labels={monthlyAttendance.map((month) => month.label)}
                title="Attendance Percentage"
                maxValue={100}
              />
            </div>
            <div className="section">
              <h3>Nutrition Status Distribution</h3>
              <BarChart 
                data={nutritionCounts} 
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
