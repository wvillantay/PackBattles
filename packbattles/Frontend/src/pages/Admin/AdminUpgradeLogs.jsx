import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../api';
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

const AdminUpgradeLogs = () => {
    const { token } = useAuth();
    const [logs,    setLogs]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [filter,  setFilter]  = useState('all');
    const [limit,   setLimit]   = useState(50);
    const [openId,  setOpenId]  = useState(null);

    useEffect(() => {
        setLoading(true);
        setError('');
        axios.get(`${API}/api/admin/upgrade-logs?limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => setLogs(res.data))
            .catch(() => setError('Failed to load upgrade logs.'))
            .finally(() => setLoading(false));
    }, [token, limit]);

    const visible = filter === 'all'
        ? logs
        : logs.filter(l => l.result === filter);

    const toggleSeeds = (id) => setOpenId(prev => prev === id ? null : id);

    return (
        <section className="admin-page">
            <div className="packs-bg">
                <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                <img className="bg-img"  src="./imgs/image 3.png"       alt="" />
            </div>
            <div className="container">
                <div className="admin-header">
                    <div>
                        <h2>Upgrade Logs</h2>
                        <p className="admin-subtitle">All upgrade attempts — provably fair audit trail</p>
                    </div>
                    <Link to="/admin" className="admin-back">← Admin</Link>
                </div>

                <div className="admin-filters">
                    {[
                        { key: 'all',     label: 'All' },
                        { key: 'success', label: '✓ Success' },
                        { key: 'fail',    label: '✗ Failed' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            className={`admin-sr-filter-btn${filter === key ? ' admin-sr-filter-active' : ''}`}
                            onClick={() => setFilter(key)}
                        >
                            {label}
                        </button>
                    ))}
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
                        {visible.length} record{visible.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {loading && <p className="admin-loading">Loading upgrade logs...</p>}
                {error   && <p className="admin-error">{error}</p>}
                {!loading && !error && visible.length === 0 && (
                    <p className="admin-empty">No upgrade logs found.</p>
                )}

                {!loading && !error && visible.length > 0 && (
                    <div className="admin-table-wrap table-responsive">
                        <table className="table admin-table">
                            <thead>
                                <tr>
                                    <th>USER</th>
                                    <th>INPUT → TARGET</th>
                                    <th>ODDS</th>
                                    <th>RESULT</th>
                                    <th>DATE</th>
                                    <th>SEEDS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map(log => (
                                    <React.Fragment key={log.id}>
                                        <tr>
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
                                                <p className="admin-ul-cards">
                                                    {log.input_card_name}
                                                    <span className="admin-ul-arrow"> → </span>
                                                    {log.target_card_name}
                                                </p>
                                            </td>
                                            <td>
                                                <p>
                                                    {log.success_chance != null
                                                        ? `${(log.success_chance * 100).toFixed(1)}%`
                                                        : '—'}
                                                </p>
                                            </td>
                                            <td>
                                                <span className={`admin-result-badge ${log.result === 'success' ? 'admin-result-win' : 'admin-result-loss'}`}>
                                                    {log.result === 'success' ? 'SUCCESS' : 'FAILED'}
                                                </span>
                                            </td>
                                            <td>
                                                <p title={fmtDate(log.created_at)}>
                                                    {relTime(log.created_at)}
                                                </p>
                                            </td>
                                            <td>
                                                <button
                                                    className={`admin-qc-toggle${openId === log.id ? ' admin-qc-toggle-open' : ''}`}
                                                    onClick={() => toggleSeeds(log.id)}
                                                >
                                                    {openId === log.id ? 'Hide' : 'Show'}
                                                </button>
                                            </td>
                                        </tr>
                                        {openId === log.id && (
                                            <tr className="admin-qc-row">
                                                <td colSpan={6}>
                                                    <div className="admin-qc-panel admin-seeds-panel">
                                                        <p className="admin-qc-label">
                                                            Provably Fair Verification
                                                        </p>
                                                        <div className="admin-seeds-grid">
                                                            <div className="admin-seeds-item">
                                                                <span className="admin-seeds-key">Server Seed</span>
                                                                <code className="admin-seeds-val">{log.server_seed}</code>
                                                            </div>
                                                            <div className="admin-seeds-item">
                                                                <span className="admin-seeds-key">Server Seed Hash</span>
                                                                <code className="admin-seeds-val">{log.server_seed_hash}</code>
                                                            </div>
                                                            <div className="admin-seeds-item">
                                                                <span className="admin-seeds-key">Client Seed</span>
                                                                <code className="admin-seeds-val">{log.client_seed}</code>
                                                            </div>
                                                            <div className="admin-seeds-item">
                                                                <span className="admin-seeds-key">Nonce</span>
                                                                <code className="admin-seeds-val">{log.nonce}</code>
                                                            </div>
                                                            <div className="admin-seeds-item">
                                                                <span className="admin-seeds-key">Roll</span>
                                                                <code className="admin-seeds-val">{log.roll}</code>
                                                            </div>
                                                            <div className="admin-seeds-item">
                                                                <span className="admin-seeds-key">Win Start Angle</span>
                                                                <code className="admin-seeds-val">{log.win_start_angle}°</code>
                                                            </div>
                                                            <div className="admin-seeds-item">
                                                                <span className="admin-seeds-key">Win Arc</span>
                                                                <code className="admin-seeds-val">{log.win_arc_degrees}°</code>
                                                            </div>
                                                            <div className="admin-seeds-item">
                                                                <span className="admin-seeds-key">Roll Angle</span>
                                                                <code className="admin-seeds-val">{log.roll_angle}°</code>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
};

export default AdminUpgradeLogs;
