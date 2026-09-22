import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { StatCard, BeneficiaryCard } from '../components/Cards';
import { beneficiaryAPI, healthAPI, nutritionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const formatDate = (date) => date ? new Date(date).toLocaleDateString() : '—';
const capitalise = (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Not recorded';
const childAge = (dob) => {
  if (!dob) return 'Not recorded';
  const birth = new Date(dob); const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  return `${Math.max(0, Math.floor(months / 12))} years ${Math.max(0, months % 12)} months`;
};

const ParentDashboard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [healthRecords, setHealthRecords] = useState([]);
  const [nutritionRecords, setNutritionRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadChildren = async () => {
      setLoading(true); setError('');
      try {
        const beneficiaries = await beneficiaryAPI.getAll();
        const parentIds = new Set([user?.id, user?.user_id, user?._id].filter(Boolean));
        const linkedChildren = beneficiaries.filter((beneficiary) => parentIds.has(beneficiary.parent_id));
        setChildren(linkedChildren); setSelectedChildId(linkedChildren[0]?.beneficiary_id || '');
      } catch (err) { setError(err.message || 'Could not load your child profile.'); }
      finally { setLoading(false); }
    };
    loadChildren();
  }, [user]);

  useEffect(() => {
    if (!selectedChildId) { setHealthRecords([]); setNutritionRecords([]); return; }
    const loadRecords = async () => {
      setLoading(true); setError('');
      try {
        const [health, nutrition] = await Promise.all([healthAPI.getByBeneficiary(selectedChildId), nutritionAPI.getByBeneficiary(selectedChildId)]);
        setHealthRecords(health); setNutritionRecords(nutrition);
      } catch (err) { setError(err.message || 'Could not load child records.'); }
      finally { setLoading(false); }
    };
    loadRecords();
  }, [selectedChildId]);

  const child = children.find((item) => item.beneficiary_id === selectedChildId);
  const latestHealth = useMemo(() => [...healthRecords].sort((a, b) => new Date(b.date) - new Date(a.date))[0], [healthRecords]);
  const latestNutrition = useMemo(() => [...nutritionRecords].sort((a, b) => new Date(b.date) - new Date(a.date))[0], [nutritionRecords]);
  const childData = child && { name: child.name, beneficiaryId: child.beneficiary_id, age: childAge(child.dob), gender: capitalise(child.gender), status: capitalise(latestHealth?.health_status || latestNutrition?.nutrition_status) };
  const stats = [
    { title: 'Growth Status', value: capitalise(latestHealth?.health_status), subtitle: latestHealth ? `Updated ${formatDate(latestHealth.date)}` : 'No health record yet', to: '/health' },
    { title: 'Nutrition Status', value: capitalise(latestNutrition?.nutrition_status), subtitle: latestNutrition ? `Updated ${formatDate(latestNutrition.date)}` : 'No nutrition record yet', to: '/nutrition' },
  ];

  return <div className="dashboard-page"><Navbar /><div className="dashboard-content"><Sidebar role="parent" /><main className="main-content">
    <h2>Parent Dashboard</h2>
    {error && <div className="error-message">{error}</div>}
    {!loading && children.length > 1 && <div className="form-group"><label>Child</label><select value={selectedChildId} onChange={(event) => setSelectedChildId(event.target.value)}>{children.map((item) => <option key={item.beneficiary_id} value={item.beneficiary_id}>{item.name} ({item.beneficiary_id})</option>)}</select></div>}
    {loading ? <p>Loading child information...</p> : !child ? <div className="form-container"><p>No child profile is linked to this parent account. Create one from Child Profile.</p></div> : <>
      <BeneficiaryCard beneficiary={childData} />
      <div className="stats-grid">{stats.map((stat) => <StatCard key={stat.title} {...stat} />)}</div>
      <div className="dashboard-sections">
        <div className="section"><h3>Latest Health Record</h3>{latestHealth ? <ul className="recommendation-list"><li><strong>Date:</strong> {formatDate(latestHealth.date)}</li><li><strong>Height:</strong> {latestHealth.height} cm</li><li><strong>Weight:</strong> {latestHealth.weight} kg</li><li><strong>BMI:</strong> {latestHealth.bmi}</li><li><strong>Status:</strong> {capitalise(latestHealth.health_status)}</li></ul> : <p>No health record has been added by the Anganwadi worker yet.</p>}</div>
        <div className="section"><h3>Latest Nutrition Record</h3>{latestNutrition ? <ul className="recommendation-list"><li><strong>Date:</strong> {formatDate(latestNutrition.date)}</li><li><strong>Status:</strong> {capitalise(latestNutrition.nutrition_status)}</li><li><strong>Meals:</strong> {latestNutrition.meals || '—'}</li><li><strong>Recommendation:</strong> {latestNutrition.recommendations || '—'}</li></ul> : <p>No nutrition record has been added by the Anganwadi worker yet.</p>}</div>
      </div>
    </>}
  </main></div></div>;
};

export default ParentDashboard;
