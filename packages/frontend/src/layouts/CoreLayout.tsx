import React, { useState } from 'react';
import { Menu, X, AlertTriangle, LayoutDashboard, Settings, User, LogOut } from 'lucide-react';
import { Outlet, Link } from 'react-router-dom';

export interface CoreLayoutProps {
  children?: React.ReactNode;
}

export function CoreLayout({ children }: CoreLayoutProps = {}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-gray-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">IncidentTrack</span>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          <Link to="/incidents" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            <AlertTriangle className="h-5 w-5 text-gray-400" />
            Incidents
          </Link>
          <Link to="/responsable" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            <LayoutDashboard className="h-5 w-5 text-gray-400" />
            Responsable
          </Link>
          <Link to="/admin" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            <Settings className="h-5 w-5 text-gray-400" />
            Admin
          </Link>
        </nav>
      </div>

      {/* Main Content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
          <button 
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 justify-end px-4">
            <div className="relative">
              <button 
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1 pr-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <User className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-700">Profile</span>
              </button>

              {/* Profile Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">Jane Doe</p>
                    <p className="text-xs text-gray-500">jane@example.com</p>
                  </div>
                  <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </a>
                  <a href="#" className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="mx-auto max-w-7xl">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
