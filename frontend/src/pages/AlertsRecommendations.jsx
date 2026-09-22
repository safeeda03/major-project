import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { beneficiaryAPI, nutritionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const RISK_STATUSES = new Set(['underweight', 'stunted', 'wasted']);
const formatDate = (date) => date ? new Date(date).toLocaleDateString() : '—';
const titleCase = (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Not recorded';

export default function AlertsRecommendations() {
  const { user } = useAuth();
  const [child, setChild] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError('');
      try {
        const children = await beneficiaryAPI.getByParent(user?.id || user?.user_id || user?._id);
        const linkedChild = children[0]; setChild(linkedChild || null);
        setRecords(linkedChild ? await nutritionAPI.getByBeneficiary(linkedChild.beneficiary_id) : []);
      } catch (err) { setError(err.message || 'Could not load alerts and recommendations.'); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const latestRecord = useMemo(() => [...records].sort((a, b) => new Date(b.date) - new Date(a.date))[0], [records]);
  const isMalnutritionRisk = RISK_STATUSES.has(latestRecord?.nutrition_status);

  return <div className="page"><Navbar /><div className="page-content"><Sidebar role="parent" /><main className="main-content">
    <h2>Alerts &amp; Recommendations</h2>
    {loading ? <p>Loading alerts and recommendations...</p> : error ? <div className="error-message">{error}</div> : !child ? <div className="form-container"><p>No child profile is linked to this parent account.</p></div> : <>
      <div className={`form-container ${isMalnutritionRisk ? 'malnutrition-alert' : ''}`}><h3>{isMalnutritionRisk ? 'Malnutrition Alert' : 'Nutrition Alert Status'}</h3>
        {isMalnutritionRisk ? <p><strong>Action needed:</strong> {child.name}’s latest nutrition assessment is marked <strong>{titleCase(latestRecord.nutrition_status)}</strong> ({formatDate(latestRecord.date)}). Please follow the recommendation below and contact your Anganwadi worker for support.</p> : <p>{latestRecord ? `No active malnutrition alert. ${child.name}’s latest nutrition status is ${titleCase(latestRecord.nutrition_status)} (${formatDate(latestRecord.date)}).` : 'No nutrition assessment has been added by the Anganwadi worker yet.'}</p>}
      </div>
      <div className="form-container"><h3>Latest Recommendation</h3>
        {latestRecord ? <><p><strong>Nutrition status:</strong> {titleCase(latestRecord.nutrition_status)}</p><p><strong>Meals recorded:</strong> {latestRecord.meals || 'No meal details provided.'}</p><p><strong>Recommendation from Anganwadi worker:</strong> {latestRecord.recommendations || 'No recommendation has been added yet.'}</p></> : <p>No recommendation is available yet.</p>}
      </div>
    </>}
  </main></div></div>;
}
