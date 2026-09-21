import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (hasRole(['supervisor', 'admin'])) return '/supervisor-dashboard';
    if (hasRole('parent')) return '/parent-dashboard';
    return '/worker-dashboard';
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>PoshanAI</h1>
      </div>
      <div className="navbar-menu">
        <a href={getDashboardPath()}>Dashboard</a>
        {hasRole(['worker', 'admin']) && <a href="/beneficiaries">Beneficiaries</a>}
        {hasRole(['worker', 'supervisor', 'admin']) && <a href="/reports">Reports</a>}
        {hasRole(['worker', 'parent', 'admin']) && <a href="/chatbot">Chatbot</a>}
        {hasRole(['supervisor', 'admin']) && <a href="/map">GIS Map</a>}
        <span className="user-info">Welcome, {user?.name || 'User'}</span>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;
