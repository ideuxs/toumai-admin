import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, Bell, AlertTriangle, LogOut, Menu, X, BarChart2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import '../App.css'; // Global UI variables

const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Listen for real-time auth changes (e.g., logout from another tab, session revoked)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <h1 className="logo-text">Naria Admin</h1>
          </div>
          <button className="mobile-close-btn" onClick={() => setIsSidebarOpen(false)}>
            <X className="icon-sm" />
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${isActive('/admin', true) ? 'active' : ''}`}
            onClick={() => { navigate('/admin'); setIsSidebarOpen(false); }}
          >
            <LayoutDashboard className="nav-icon" />
            <span>Tableau de bord</span>
          </button>
          <button
            className={`nav-item ${isActive('/admin/all') ? 'active' : ''}`}
            onClick={() => { navigate('/admin/all'); setIsSidebarOpen(false); }}
          >
            <List className="nav-icon" />
            <span>Toutes les annonces</span>
          </button>
          <button
            className={`nav-item ${isActive('/reports') ? 'active' : ''}`}
            onClick={() => { navigate('/reports'); setIsSidebarOpen(false); }}
          >
            <AlertTriangle className="nav-icon" />
            <span>Signalements</span>
          </button>
          <button
            className={`nav-item ${isActive('/analytics') ? 'active' : ''}`}
            onClick={() => { navigate('/analytics'); setIsSidebarOpen(false); }}
          >
            <BarChart2 className="nav-icon" />
            <span>Statistiques</span>
          </button>
          <button
            className={`nav-item ${isActive('/global-notifications') ? 'active' : ''}`}
            onClick={() => { navigate('/global-notifications'); setIsSidebarOpen(false); }}
          >
            <Bell className="nav-icon" />
            <span>Notifications Globales</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <LogOut className="nav-icon" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="top-header-left">
            <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="icon-sm" />
            </button>
            <h2 className="page-title">
              {isActive('/admin', true) ? "Vue d'ensemble" :
                isActive('/admin/all') ? "Toutes les annonces" :
                  isActive('/reports') ? "Signalements" :
                    isActive('/analytics') ? "Statistiques" :
                      "Notifications Globales"}
            </h2>
          </div>
          <div className="top-header-right">
            <div className="admin-profile">
              <div className="admin-avatar">A</div>
              <span className="admin-name">Administrateur</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content injected here by React Router */}
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
