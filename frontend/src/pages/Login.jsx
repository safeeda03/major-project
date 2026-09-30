import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    role: 'worker', name: '', email: '', phone: '', confirmPassword: '', workerId: '', centreId: '', beneficiaryId: ''
  });
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let result;
    try {
      if (mode === 'register') await authAPI.register(formData);
      result = await login(mode === 'login'
        ? { identifier: formData.identifier, password: formData.password }
        : { identifier: formData.email, password: formData.password });
    } catch (err) {
      result = { success: false, message: err.message };
    }
    
    if (result.success) {
      // Redirect based on role
      const roleDashboard = {
        worker: '/worker-dashboard',
        supervisor: '/supervisor-dashboard',
        parent: '/parent-dashboard'
      };
      
      // Use the user role from login response
      const userRole = result.user?.role || formData.role;
      navigate(roleDashboard[userRole] || '/worker-dashboard');
    } else {
      setError(result.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Navbar />
      <div className="login-container">
        <div className="login-box">
          <h2>{mode === 'login' ? 'PoshanAI Login' : 'Create Account'}</h2>
          {location.state?.message && <div className="success-message login-status-message" role="status">{location.state.message}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              {mode === 'register' && <>
                <div className="form-group"><label>Account type</label><select name="role" value={formData.role} onChange={handleChange}><option value="supervisor">Supervisor</option><option value="worker">Anganwadi Worker</option><option value="parent">Parent</option></select></div>
                <div className="form-group"><label>Full Name</label><input name="name" value={formData.name} onChange={handleChange} autoComplete="name" required /></div>
                <div className="form-group"><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} autoComplete="email" required /></div>
                <div className="form-group"><label>Phone Number</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} autoComplete="tel" required /></div>
                {formData.role === 'worker' && <><div className="form-group"><label>Anganwadi Worker ID</label><input name="workerId" value={formData.workerId} onChange={handleChange} required /></div><div className="form-group"><label>Centre ID</label><input name="centreId" value={formData.centreId} onChange={handleChange} required /></div></>}
                {formData.role === 'parent' && <div className="form-group"><label>Beneficiary ID</label><input name="beneficiaryId" value={formData.beneficiaryId} onChange={handleChange} required /></div>}
              </>}
              {mode === 'login' && <label>Email or Phone Number</label>}
              {mode === 'login' && <>
              <div className="login-input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17.97 17.97 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.57 1 1 0 0 1-.25 1z" /></svg>
                <input
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  placeholder="Enter your phone number or email"
                  autoComplete="username"
                  required
                />
              </div>
              </>}
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="login-input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2ZM10 7a2 2 0 1 1 4 0v2h-4Zm7 13H7v-9h10Zm-5-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  minLength={mode === 'register' ? 8 : undefined}
                  required
                />
              </div>
            </div>
            {mode === 'register' && <div className="form-group"><label>Confirm Password</label><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" required /></div>}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (mode === 'login' ? 'Logging in...' : 'Creating account...') : mode === 'login' ? 'Login' : 'Create Account'}
            </button>
            {error && <div className="error-message">{error}</div>}
          </form>
          <p className="auth-mode-prompt">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button type="button" className="auth-mode-toggle" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Sign up' : 'Back to login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
