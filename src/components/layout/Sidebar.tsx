import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Thermometer, Stethoscope,
  LogOut, ClipboardList, BedDouble, BarChart3,
  UserCog, ChevronLeft, ChevronRight, Activity, Menu, X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { roleBadge } from '../ui/Badge';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard',    label: 'Dashboard',            icon: <LayoutDashboard className="w-5 h-5" />, roles: ['admin','doctor','nurse'] },
  { path: '/patients',     label: 'Patients',             icon: <Users className="w-5 h-5" />,          roles: ['admin','doctor','nurse'] },
  { path: '/temperature',  label: 'Temperature Tracking', icon: <Thermometer className="w-5 h-5" />,    roles: ['admin','nurse'] },
  { path: '/visits',       label: 'Doctor Visits',        icon: <Stethoscope className="w-5 h-5" />,    roles: ['admin','doctor'] },
  { path: '/discharge',    label: 'Discharge Mgmt',       icon: <ClipboardList className="w-5 h-5" />,  roles: ['admin','doctor'] },
  { path: '/beds',         label: 'Bed Management',       icon: <BedDouble className="w-5 h-5" />,      roles: ['admin','nurse'] },
  { path: '/reports',      label: 'Reports & Analytics',  icon: <BarChart3 className="w-5 h-5" />,      roles: ['admin','doctor'] },
  { path: '/users',        label: 'User Management',      icon: <UserCog className="w-5 h-5" />,        roles: ['admin'] },
];

export function Sidebar() {
  const { currentUser, logout } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  if (!currentUser) return null;

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(currentUser.role));

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-navy-700 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Activity className="w-5 h-5 text-white" />
        </div>
        {!collapsed && <span className="text-white font-bold text-lg tracking-tight">CareTrack</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-navy-100 hover:bg-navy-700 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className={`border-t border-navy-700 px-3 py-4 ${collapsed ? '' : ''}`}>
        {!collapsed && (
          <div className="mb-3 px-1">
            <p className="text-white text-sm font-semibold truncate">{currentUser.name}</p>
            <div className="mt-1">{roleBadge(currentUser.role)}</div>
          </div>
        )}
        <button
          onClick={logout}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-navy-200 hover:bg-navy-700 hover:text-white transition-all w-full text-sm ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse btn (desktop only) */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full shadow-sm items-center justify-center text-gray-400 hover:text-gray-600 transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#0f2038] px-4 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base">CareTrack</span>
        </div>
        <div className="flex items-center gap-3">
          {currentUser && <span className="text-navy-200 text-xs">{currentUser.name}</span>}
          <button onClick={() => setMobileOpen(o => !o)} className="text-white">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
          <div className="lg:hidden fixed top-0 left-0 bottom-0 w-64 bg-[#0f2038] z-50 pt-14 relative">
            {sidebarContent}
          </div>
        </>
      )}

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col bg-[#0f2038] relative transition-all duration-200 flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        {sidebarContent}
      </aside>
    </>
  );
}
