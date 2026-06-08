import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:8080';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('pb_token'));
    const [loading, setLoading] = useState(true);

    // On mount: if a stored token exists, verify it and restore user state.
    // If the token is expired or invalid, clear it so the user isn't stuck.
    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }
        axios
            .get(`${API}/api/me`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                // setUser and setLoading in the same callback → same microtask → always batched.
                // Using .finally() put them in separate microtasks, creating a window where
                // loading=false but user=null, which caused Pack.jsx to render with !user=true.
                setUser(res.data);
                setLoading(false);
            })
            .catch(() => {
                localStorage.removeItem('pb_token');
                setToken(null);
                setLoading(false);
            });
    }, []);

    const login = (newToken, newUser) => {
        localStorage.setItem('pb_token', newToken);
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        localStorage.removeItem('pb_token');
        setToken(null);
        setUser(null);
    };

    const updateUser = (partial) => setUser((prev) => ({ ...prev, ...partial }));

    return (
        <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
