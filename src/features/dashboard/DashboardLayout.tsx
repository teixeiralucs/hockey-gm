import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Users, Trophy, CalendarDays, ShoppingCart } from 'lucide-react';
import './Dashboard.css';

export const DashboardLayout: React.FC = () => {
  return (
    <div className="dashboard-layout">
      {/* Container Principal onde as telas filhas serão injetadas */}
      <div className="dashboard-content">
        <Outlet />
      </div>

      {/* Navegação Flutuante */}
      <nav className="floating-dock">
        <NavLink to="/dashboard" end className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
          <Home size={24} />
        </NavLink>
        <NavLink to="/dashboard/roster" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
          <Users size={24} />
        </NavLink>
        <NavLink to="/dashboard/standings" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
          <Trophy size={24} />
        </NavLink>
        <NavLink to="/dashboard/calendar" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
          <CalendarDays size={24} />
        </NavLink>
        <NavLink to="/dashboard/shop" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
          <ShoppingCart size={24} />
        </NavLink>
      </nav>
    </div>
  );
};
