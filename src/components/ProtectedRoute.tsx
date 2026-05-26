import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { getCurrentAdminProfile } from '../services/authService';

const ProtectedRoute: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'forbidden'>('loading');

  useEffect(() => {
    let mounted = true;

    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        setStatus('unauthenticated');
        return;
      }

      const admin = await getCurrentAdminProfile();

      if (!mounted) return;

      setStatus(admin ? 'authenticated' : 'forbidden');
    };

    checkAdminAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setStatus('unauthenticated');
        return;
      }

      checkAdminAccess();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <p className="loading-text">Vérification de la session...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/" replace />;
  }

  if (status === 'forbidden') {
    supabase.auth.signOut();
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
