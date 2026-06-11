import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

import { API } from '../../api';

const STATUS_OPTIONS = [
    { value: '',          label: 'All Statuses' },
    { value: 'open',      label: 'Open' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
    { value: '',      label: 'All Types' },
    { value: 'bot',   label: 'Bot' },
    { value: 'human', label: 'Human' },
];

const AdminBattles = () => {
    const { token } = useAuth();
    const [battles,      setBattles]      = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter,   setTypeFilter]   = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        if (typeFilter)   params.set('type',   typeFilter);
        axios
            .get(`${API}/api/admin/battles?${params}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setBattles(res.data))
            .catch(() => setError('Failed to load battles.'))
            .finally(() => setLoading(false));
    }, [token, statusFilter, typeFilter]);

    const formatDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
        });
    };

    const statusClass = (s) => {
        if (s === 'completed') return 'admin-status-completed';
        if (s === 'cancelled') return 'admin-status-cancelled';
        if (s === 'open')      return 'admin-status-open';
        return '';
    };

    return (
        <section className="admin-page">
            <div className="packs-bg">
                <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                <img className="bg-img"  src="./imgs/image 3.png"       alt="" />
            </div>
            <div className="container">
                <div className="admin-header">
                    <h2>Battles</h2>
                    <Link to="/admin" className="admin-back">← Admin</Link>
                </div>

                <div className="admin-filters">
                    <select
                        className="admin-select"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        {STATUS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    <select
                        className="admin-select"
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                    >
                        {TYPE_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {loading && <p className="admin-loading">Loading battles...</p>}
                {error   && <p className="admin-error">{error}</p>}

                {!loading && !error && (
                    <div className="table-responsive admin-table-wrap">
                        <table className="table admin-table">
                            <thead>
                                <tr>
                                    <th>DATE</th>
                                    <th>CREATOR</th>
                                    <th>PACK</th>
                                    <th>STATUS</th>
                                    <th>TYPE</th>
                                    <th>WINNER</th>
                                </tr>
                            </thead>
                            <tbody>
                                {battles.map(b => (
                                    <tr key={b.id}>
                                        <td><p>{formatDate(b.created_at)}</p></td>
                                        <td><p>{b.creator_name}</p></td>
                                        <td>
                                            <p>
                                                {b.pack_name}
                                                {b.pack_quantity > 1 && (
                                                    <span className="admin-qty">×{b.pack_quantity}</span>
                                                )}
                                            </p>
                                        </td>
                                        <td>
                                            <span className={`admin-status-badge ${statusClass(b.status)}`}>
                                                {b.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            {b.is_bot_battle
                                                ? <span className="admin-type-badge admin-type-bot">BOT</span>
                                                : <span className="admin-type-badge admin-type-human">HUMAN</span>
                                            }
                                        </td>
                                        <td><p>{b.winner_name ?? '—'}</p></td>
                                    </tr>
                                ))}
                                {battles.length === 0 && (
                                    <tr>
                                        <td colSpan={6}>
                                            <p className="admin-empty">No battles found.</p>
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

export default AdminBattles;
