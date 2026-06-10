import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

const API = 'http://localhost:8080';

const AdminUsers = () => {
    const { token } = useAuth();
    const [users,   setUsers]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [search,  setSearch]  = useState('');

    useEffect(() => {
        axios
            .get(`${API}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setUsers(res.data))
            .catch(() => setError('Failed to load users.'))
            .finally(() => setLoading(false));
    }, [token]);

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const formatDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
        });
    };

    return (
        <section className="admin-page">
            <div className="packs-bg">
                <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                <img className="bg-img"  src="./imgs/image 3.png"       alt="" />
            </div>
            <div className="container">
                <div className="admin-header">
                    <h2>Users</h2>
                    <Link to="/admin" className="admin-back">← Admin</Link>
                </div>

                <div className="admin-filters">
                    <input
                        className="admin-search"
                        type="text"
                        placeholder="Search by name or email…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {loading && <p className="admin-loading">Loading users...</p>}
                {error   && <p className="admin-error">{error}</p>}

                {!loading && !error && (
                    <div className="table-responsive admin-table-wrap">
                        <table className="table admin-table">
                            <thead>
                                <tr>
                                    <th>NAME</th>
                                    <th>EMAIL</th>
                                    <th>CREDITS</th>
                                    <th>WINS</th>
                                    <th>LOSSES</th>
                                    <th>JOINED</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <p>
                                                {u.name}
                                                {u.is_admin && (
                                                    <span className="admin-badge">ADMIN</span>
                                                )}
                                            </p>
                                        </td>
                                        <td><p>{u.email}</p></td>
                                        <td><p className="admin-credits">{u.credits}</p></td>
                                        <td><p className="admin-wins">{u.wins}</p></td>
                                        <td><p className="admin-losses">{u.losses}</p></td>
                                        <td><p>{formatDate(u.created_at)}</p></td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6}>
                                            <p className="admin-empty">No users match your search.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
};

export default AdminUsers;
