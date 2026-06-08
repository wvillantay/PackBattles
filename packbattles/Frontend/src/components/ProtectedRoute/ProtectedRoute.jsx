import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { token, user, loading } = useAuth();

    // Wait while: (a) initial /api/me verification is in flight, OR
    // (b) token exists but user hasn't been populated yet (safety net).
    if (loading || (token && !user)) return null;

    if (!token) return <Navigate to="/login" replace />;

    return children;
};

export default ProtectedRoute;
