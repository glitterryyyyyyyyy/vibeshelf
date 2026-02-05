// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx'; // Adjust path, ensure .jsx extension

const PrivateRoute = () => {
  const { isAuthenticated, loading } = useAuth(); // <<< CRITICAL: Get loading state

  if (loading) {
    // Render a loading spinner or message while authentication state is being determined
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-gray-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
        <p className="ml-4">Loading authentication...</p>
      </div>
    );
  }

  // If authenticated, render the child routes, otherwise redirect to login
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
