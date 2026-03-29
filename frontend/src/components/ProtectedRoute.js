import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0f]">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-[#8b5cf6] rounded-sm wave-bar" />
          <div className="w-1.5 h-6 bg-[#8b5cf6] rounded-sm wave-bar" />
          <div className="w-1.5 h-6 bg-[#8b5cf6] rounded-sm wave-bar" />
          <div className="w-1.5 h-6 bg-[#8b5cf6] rounded-sm wave-bar" />
          <div className="w-1.5 h-6 bg-[#8b5cf6] rounded-sm wave-bar" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

export default ProtectedRoute;
