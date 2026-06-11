import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

const API = 'http://localhost:8080';

const TX_LABEL = {
    pack_open_spend:         'Pack Opened',
    battle_create_spend:     'Battle Created',
    battle_join_spend:       'Battle Joined',
    battle_cancel_refund:    'Battle Refunded',
    admin_credit_adjustment: 'Admin Adjustment',
};

const TYPE_OPTIONS = [
    { value: '',                        label: 'All Types' },
    { value: 'pack_open_spend',         label: 'Pack Opened' },
    { value: 'battle_create_spend',     label: 'Battle Created' },
    { value: 'battle_join_spend',       label: 'Battle Joined' },
    { value: 'battle_cancel_refund',    label: 'Battle Refunded' },
    { value: 'admin_credit_adjustment', label: 'Admin Adjustment' },
];

const AdminTransactions = () => {
    const { token } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState('');
    const [typeFilter,   setTypeFilter]   = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        const params = new URLSearchParams();
        if (typeFilter) params.set('type', typeFilter);
        axios
            .get(`${API}/api/admin/transactions?${params}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setTransactions(res.data))
            .catch(() => setError('Failed to load transactions.'))
            .finally(() => setLoading(false));
    }, [token, typeFilter]);

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
                    <h2>Transactions</h2>
                    <Link to="/admin" className="admin-back">← Admin</Link>
                </div>

                <div className="admin-filters">
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

                {loading && <p className="admin-loading">Loading transactions...</p>}
                {error   && <p className="admin-error">{error}</p>}

                {!loading && !error && (
                    <div className="table-responsive admin-table-wrap">
                        <table className="table admin-table">
                            <thead>
                                <tr>
                                    <th>DATE</th>
                                    <th>USER</th>
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
                                            <td><p>{tx.user_name}</p></td>
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
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={6}>
                                            <p className="admin-empty">No transactions found.</p>
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

export default AdminTransactions;
