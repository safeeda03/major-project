import React from 'react';

const Sidebar = ({ role }) => {
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
      { name: 'Recommendations', path: '/recommendations' },
    ]
  };

  const items = menuItems[role] || menuItems.worker;

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