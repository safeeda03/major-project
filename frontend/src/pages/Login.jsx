import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    role: 'worker'
  });
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

    const result = await login(formData);
    
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
          <h2>PoshanAI Login</h2>
          {location.state?.message && <div className="success-message login-status-message" role="status">{location.state.message}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Phone Number</label>
              <div className="login-input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17.97 17.97 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.57 1 1 0 0 1-.25 1z" /></svg>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  autoComplete="tel"
                  required
                />
              </div>
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
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Role</label>
              <div className="login-input-wrap login-select-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.42 0-8 2.24-8 5v2h16v-2c0-2.76-3.58-5-8-5Zm-6 5c.58-1.4 2.9-3 6-3s5.42 1.6 6 3Z" /></svg>
                <select name="role" value={formData.role} onChange={handleChange}>
                  <option value="worker">Anganwadi Worker</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="parent">Parent/Guardian</option>
                </select>
              </div>
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
            {error && <div className="error-message">{error}</div>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
