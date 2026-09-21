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
import Chatbot from './pages/Chatbot';
import Map from './pages/Map';
import OCR from './pages/OCR';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/worker-dashboard" element={
            <ProtectedRoute allowedRoles={['worker', 'admin']}>
              <WorkerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/supervisor-dashboard" element={
            <ProtectedRoute allowedRoles={['supervisor', 'admin']}>
              <SupervisorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/parent-dashboard" element={
            <ProtectedRoute allowedRoles={['parent', 'admin']}>
              <ParentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/beneficiaries" element={
            <ProtectedRoute allowedRoles={['worker', 'admin']}>
              <Beneficiary />
            </ProtectedRoute>
          } />
          <Route path="/beneficiaries/:id" element={
            <ProtectedRoute allowedRoles={['worker', 'admin']}>
              <BeneficiaryDetails />
            </ProtectedRoute>
          } />
          <Route path="/health" element={
            <ProtectedRoute allowedRoles={['worker', 'parent', 'admin']}>
              <Health />
            </ProtectedRoute>
          } />
          <Route path="/nutrition" element={
            <ProtectedRoute allowedRoles={['worker', 'parent', 'admin']}>
              <Nutrition />
            </ProtectedRoute>
          } />
          <Route path="/vaccination" element={
            <ProtectedRoute allowedRoles={['worker', 'parent', 'admin']}>
              <Vaccination />
            </ProtectedRoute>
          } />
          <Route path="/attendance" element={
            <ProtectedRoute allowedRoles={['worker', 'parent', 'admin']}>
              <Attendance />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['worker', 'supervisor', 'admin']}>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/reports/alerts/:type" element={
            <ProtectedRoute allowedRoles={['worker', 'supervisor', 'admin']}>
              <AlertDetails />
            </ProtectedRoute>
          } />
          <Route path="/chatbot" element={
            <ProtectedRoute allowedRoles={['worker', 'parent', 'admin']}>
              <Chatbot />
            </ProtectedRoute>
          } />
          <Route path="/map" element={
            <ProtectedRoute allowedRoles={['supervisor', 'admin']}>
              <Map />
            </ProtectedRoute>
          } />
          <Route path="/ocr" element={
            <ProtectedRoute allowedRoles={['worker', 'admin']}>
              <OCR />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
