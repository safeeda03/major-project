import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import WorkerDashboard from './pages/WorkerDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import ParentDashboard from './pages/ParentDashboard';
import Beneficiary from './pages/Beneficiary';
import BeneficiaryDetails from './pages/BeneficiaryDetails';
import Health from './pages/Health';
import Nutrition from './pages/Nutrition';
import Vaccination from './pages/Vaccination';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import AlertDetails from './pages/AlertDetails';
import Alerts from './pages/Alerts';
import Chatbot from './pages/Chatbot';
import Map from './pages/Map';
import OCR from './pages/OCR';
import Statistics from './pages/Statistics';
import Centres from './pages/Centres';
import ChildProfile from './pages/ChildProfile';
import AlertsRecommendations from './pages/AlertsRecommendations';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/worker-dashboard" element={
            <ProtectedRoute allowedRoles={['worker']}>
              <WorkerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/supervisor-dashboard" element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <SupervisorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/parent-dashboard" element={
            <ProtectedRoute allowedRoles={['parent']}>
              <ParentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/beneficiaries" element={
            <ProtectedRoute allowedRoles={['worker', 'supervisor']}>
              <Beneficiary />
            </ProtectedRoute>
          } />
          <Route path="/beneficiaries/:id" element={
            <ProtectedRoute allowedRoles={['worker']}>
              <BeneficiaryDetails />
            </ProtectedRoute>
          } />
          <Route path="/child-profile" element={
            <ProtectedRoute allowedRoles={['parent']}>
              <ChildProfile />
            </ProtectedRoute>
          } />
          <Route path="/recommendations" element={
            <ProtectedRoute allowedRoles={['parent']}>
              <AlertsRecommendations />
            </ProtectedRoute>
          } />
          <Route path="/health" element={
            <ProtectedRoute allowedRoles={['worker', 'parent']}>
              <Health />
            </ProtectedRoute>
          } />
          <Route path="/nutrition" element={
            <ProtectedRoute allowedRoles={['worker', 'parent']}>
              <Nutrition />
            </ProtectedRoute>
          } />
          <Route path="/vaccination" element={
            <ProtectedRoute allowedRoles={['worker', 'parent']}>
              <Vaccination />
            </ProtectedRoute>
          } />
          <Route path="/attendance" element={
            <ProtectedRoute allowedRoles={['worker', 'parent']}>
              <Attendance />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['worker', 'supervisor']}>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/alerts" element={
            <ProtectedRoute allowedRoles={['worker', 'supervisor']}>
              <Alerts />
            </ProtectedRoute>
          } />
          <Route path="/statistics" element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <Statistics />
            </ProtectedRoute>
          } />
          <Route path="/centres" element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <Centres />
            </ProtectedRoute>
          } />
          <Route path="/reports/alerts/:type" element={
            <ProtectedRoute allowedRoles={['worker', 'supervisor']}>
              <AlertDetails />
            </ProtectedRoute>
          } />
          <Route path="/chatbot" element={
            <ProtectedRoute allowedRoles={['worker', 'parent']}>
              <Chatbot />
            </ProtectedRoute>
          } />
          <Route path="/map" element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <Map />
            </ProtectedRoute>
          } />
          <Route path="/ocr" element={
            <ProtectedRoute allowedRoles={['worker']}>
              <OCR />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
