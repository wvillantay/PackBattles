import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminRoute = ({ children }) => {
    const { token, user, loading } = useAuth();

    if (loading || (token && !user)) return null;
    if (!token) return <Navigate to="/login" replace />;
    if (!user?.is_admin) return <Navigate to="/" replace />;

    return children;
};

export default AdminRoute;
