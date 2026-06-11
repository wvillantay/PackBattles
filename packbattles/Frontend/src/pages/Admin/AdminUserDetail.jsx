import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

const API = 'http://localhost:8080';

const TX_LABEL = {
    pack_open_spend:      'Pack Opened',
    battle_create_spend:  'Battle Created',
    battle_join_spend:    'Battle Joined',
    battle_cancel_refund: 'Battle Refunded',
};

const AdminUserDetail = () => {
    const { id }    = useParams();
    const { token } = useAuth();

    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        axios
            .get(`${API}/api/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setData(res.data))
            .catch(err => {
                const msg = err.response?.data?.error;
                setError(msg || 'Failed to load user details.');
            })
            .finally(() => setLoading(false));
    }, [id, token]);

    const formatDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
        });
    };

    const resultClass = (r) => {
        if (r === 'win')       return 'admin-result-win';
        if (r === 'loss')      return 'admin-result-loss';
        if (r === 'cancelled') return 'admin-result-cancelled';
        return '';
    };

    const user         = data?.user;
    const battles      = data?.battles      ?? [];
    const transactions = data?.transactions ?? [];

    return (
        <section className="admin-page">
            <div className="packs-bg">
                <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                <img className="bg-img"  src="./imgs/image 3.png"       alt="" />
            </div>
            <div className="container">
                <div className="admin-header">
                    <h2>
                        {loading ? 'User Detail' : (user?.name ?? 'User Detail')}
                        {user?.is_admin && <span className="admin-badge" style={{ marginLeft: '1rem', fontSize: '1.4rem' }}>ADMIN</span>}
                    </h2>
                    <Link to="/admin/users" className="admin-back">← Users</Link>
                </div>

                {loading && <p className="admin-loading">Loading user details...</p>}
                {error   && <p className="admin-error">{error}</p>}

                {!loading && !error && user && (
                    <>
                        {/* Stat cards */}
                        <div className="admin-stat-row">
                            <div className="admin-stat-card">
                                <span className="admin-stat-value admin-stat-credits">{user.credits}</span>
                                <span className="admin-stat-label">Credits</span>
                            </div>
                            <div className="admin-stat-card">
                                <span className="admin-stat-value admin-stat-wins">{user.wins}</span>
                                <span className="admin-stat-label">Wins</span>
                            </div>
                            <div className="admin-stat-card">
                                <span className="admin-stat-value admin-stat-losses">{user.losses}</span>
                                <span className="admin-stat-label">Losses</span>
                            </div>
                        </div>

                        {/* Email + joined */}
                        <div className="admin-meta">
                            <span className="admin-meta-item">
                                <strong>Email:</strong> {user.email}
                            </span>
                            <span className="admin-meta-item">
                                <strong>Joined:</strong> {formatDate(user.created_at)}
                            </span>
                            <span className="admin-meta-item">
                                <strong>ID:</strong> {user.id}
                            </span>
                        </div>

                        {/* Recent battles */}
                        <div className="admin-section">
                            <h3 className="admin-section-title">Recent Battles</h3>

                            {battles.length === 0 ? (
                                <p className="admin-empty">No battles yet.</p>
                            ) : (
                                <div className="table-responsive admin-table-wrap">
                                    <table className="table admin-table">
                                        <thead>
                                            <tr>
                                                <th>DATE</th>
                                                <th>PACK</th>
                                                <th>VS</th>
                                                <th>RESULT</th>
                                                <th>THEIR TOTAL</th>
                                                <th>OPP. TOTAL</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {battles.map(b => {
                                                const dateStr  = formatDate(b.completed_at || b.cancelled_at);
                                                const packLabel = b.pack_quantity > 1
                                                    ? `${b.pack_name} ×${b.pack_quantity}`
                                                    : b.pack_name;

                                                return (
                                                    <tr key={b.id}>
                                                        <td><p>{dateStr}</p></td>
                                                        <td><p>{packLabel}</p></td>
                                                        <td>
                                                            <p>
                                                                {b.opponent_name ?? '—'}
                                                                {b.is_bot_battle && (
                                                                    <span className="admin-badge" style={{ color: '#A35BFF', borderColor: 'rgba(163,91,255,0.3)', background: 'rgba(163,91,255,0.1)' }}>BOT</span>
                                                                )}
                                                            </p>
                                                        </td>
                                                        <td>
                                                            <span className={`admin-result-badge ${resultClass(b.result)}`}>
                                                                {b.result.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <p className="admin-total">
                                                                {b.my_total != null
                                                                    ? `${Number(b.my_total).toFixed(2)} cr`
                                                                    : '—'}
                                                            </p>
                                                        </td>
                                                        <td>
                                                            <p className="admin-total">
                                                                {b.their_total != null
                                                                    ? `${Number(b.their_total).toFixed(2)} cr`
                                                                    : '—'}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Recent transactions */}
                        <div className="admin-section">
                            <h3 className="admin-section-title">Credit History</h3>

                            {transactions.length === 0 ? (
                                <p className="admin-empty">No transactions yet.</p>
                            ) : (
                                <div className="table-responsive admin-table-wrap">
                                    <table className="table admin-table">
                                        <thead>
                                            <tr>
                                                <th>DATE</th>
                                                <th>CATEGORY</th>
                                                <th>NOTE</th>
                                                <th>AMOUNT</th>
                                                <th>BALANCE</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map(tx => {
                                                const isPos  = tx.amount > 0;
                                                const sign   = isPos ? '+' : '−';
                                                const absAmt = Math.abs(tx.amount);
                                                return (
                                                    <tr key={tx.id}>
                                                        <td><p>{formatDate(tx.created_at)}</p></td>
                                                        <td>
                                                            <p className="admin-tx-type">
                                                                {TX_LABEL[tx.type] || tx.type}
                                                            </p>
                                                        </td>
                                                        <td>
                                                            <p className="admin-tx-note">{tx.note || '—'}</p>
                                                        </td>
                                                        <td>
                                                            <p className={isPos ? 'admin-tx-pos' : 'admin-tx-neg'}>
                                                                {sign}{absAmt} cr
                                                            </p>
                                                        </td>
                                                        <td>
                                                            <p className="admin-tx-balance">
                                                                {tx.balance_after != null ? `${tx.balance_after} cr` : '—'}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};

export default AdminUserDetail;
