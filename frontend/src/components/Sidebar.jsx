import React from 'react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ role }) => {
  const { user } = useAuth();
  const menuItems = {
    worker: [
      { name: 'Dashboard', path: '/worker-dashboard' },
      { name: 'Beneficiaries', path: '/beneficiaries' },
      { name: 'Health Records', path: '/health' },
      { name: 'Nutrition', path: '/nutrition' },
      { name: 'Vaccination', path: '/vaccination' },
      { name: 'Attendance', path: '/attendance' },
      { name: 'OCR Upload', path: '/ocr' },
      { name: 'Reports', path: '/reports' },
    ],
    supervisor: [
      { name: 'Dashboard', path: '/supervisor-dashboard' },
      { name: 'Centres', path: '/centres' },
      { name: 'Statistics', path: '/statistics' },
      { name: 'Reports', path: '/reports' },
      { name: 'GIS Map', path: '/map' },
      { name: 'Alerts', path: '/alerts' },
    ],
    parent: [
      { name: 'Dashboard', path: '/parent-dashboard' },
      { name: 'Child Profile', path: '/child-profile' },
      { name: 'Health Records', path: '/health' },
      { name: 'Nutrition', path: '/nutrition' },
      { name: 'Vaccination', path: '/vaccination' },
      { name: 'Attendance', path: '/attendance' },
      { name: 'Alerts & Recommendations', path: '/recommendations' },
    ]
  };

  const activeRole = user?.role === 'admin' ? 'supervisor' : (user?.role || role || 'worker');
  const items = menuItems[activeRole] || menuItems.worker;

  return (
    <div className="sidebar">
      <ul className="sidebar-menu">
        {items.map((item, index) => (
          <li key={index}>
            <a href={item.path}>{item.name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
