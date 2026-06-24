import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../api';
import { fmtPackCoins } from '../../utils/currency';
import './Admin.css';

function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function relTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

const AdminExchangeLogs = () => {
    const { token } = useAuth();
    const [logs,    setLogs]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [limit,   setLimit]   = useState(50);

    useEffect(() => {
        setLoading(true);
        setError('');
        axios.get(`${API}/api/admin/exchange-logs?limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => setLogs(res.data))
            .catch(() => setError('Failed to load exchange logs.'))
            .finally(() => setLoading(false));
    }, [token, limit]);

    return (
        <section className="admin-page">
            <div className="packs-bg">
                <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                <img className="bg-img"  src="./imgs/image 3.png"       alt="" />
            </div>
            <div className="container">
                <div className="admin-header">
                    <div>
                        <h2>Exchange Logs</h2>
                        <p className="admin-subtitle">Full history of card trades and exchanges</p>
                    </div>
                    <Link to="/admin" className="admin-back">← Admin</Link>
                </div>

                <div className="admin-filters">
                    <select
                        className="admin-select"
                        value={limit}
                        onChange={e => setLimit(Number(e.target.value))}
                    >
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                    </select>
                    <span className="admin-sr-count">
                        {logs.length} record{logs.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {loading && <p className="admin-loading">Loading exchange logs...</p>}
                {error   && <p className="admin-error">{error}</p>}
                {!loading && !error && logs.length === 0 && (
                    <p className="admin-empty">No exchange logs found.</p>
                )}

                {!loading && !error && logs.length > 0 && (
                    <div className="admin-table-wrap table-responsive">
                        <table className="table admin-table">
                            <thead>
                                <tr>
                                    <th>USER</th>
                                    <th>OFFERED</th>
                                    <th>VALUE</th>
                                    <th>RECEIVED</th>
                                    <th>VALUE</th>
                                    <th>DATE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td>
                                            <Link
                                                to={`/admin/users/${log.user_id}`}
                                                className="admin-view-btn"
                                                style={{ fontSize: '1.15rem', padding: '0.3rem 0.8rem' }}
                                            >
                                                View User
                                            </Link>
                                        </td>
                                        <td>
                                            <p style={{ color: '#fff', fontWeight: 500 }}>
                                                {log.offered_card_name || '—'}
                                            </p>
                                        </td>
                                        <td>
                                            <p className="admin-tx-neg">
                                                {log.offered_value != null ? fmtPackCoins(log.offered_value) : '—'}
                                            </p>
                                        </td>
                                        <td>
                                            <p style={{ color: '#fff', fontWeight: 500 }}>
                                                {log.received_card_name || '—'}
                                            </p>
                                        </td>
                                        <td>
                                            <p className="admin-credits">
                                                {log.received_value != null ? fmtPackCoins(log.received_value) : '—'}
                                            </p>
                                        </td>
                                        <td>
                                            <p title={fmtDate(log.created_at)}>
                                                {relTime(log.created_at)}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
};

export default AdminExchangeLogs;
