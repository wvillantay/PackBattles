import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

import { API } from '../../api';
import { fmtPackCoins, fmtPackCoinsShort } from '../../utils/currency';

const Profile = () => {
    const { token, user } = useAuth();

    const [stats,            setStats]            = useState(null);
    const [battles,          setBattles]          = useState([]);
    const [transactions,     setTransactions]     = useState([]);
    const [shipments,        setShipments]        = useState([]);
    const [statsLoading,     setStatsLoading]     = useState(true);
    const [battlesLoading,   setBattlesLoading]   = useState(true);
    const [txLoading,        setTxLoading]        = useState(true);
    const [shipmentsLoading, setShipmentsLoading] = useState(false);
    const [shipmentsLoaded,  setShipmentsLoaded]  = useState(false);
    const [statsError,       setStatsError]       = useState('');
    const [battlesError,     setBattlesError]     = useState('');
    const [txError,          setTxError]          = useState('');
    const [shipmentsError,   setShipmentsError]   = useState('');
    const [activeTab,        setActiveTab]        = useState('battles');

    useEffect(() => {
        axios
            .get(`${API}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setStats(res.data))
            .catch(() => setStatsError('Failed to load profile stats.'))
            .finally(() => setStatsLoading(false));

        axios
            .get(`${API}/api/me/battles`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setBattles(res.data))
            .catch(() => setBattlesError('Failed to load battle history.'))
            .finally(() => setBattlesLoading(false));

        setTxError('');
        axios
            .get(`${API}/api/me/transactions`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setTransactions(res.data))
            .catch(() => setTxError('Failed to load credit history.'))
            .finally(() => setTxLoading(false));
    }, [token]);

    // Lazy-load shipments when the Shipments tab is first opened
    useEffect(() => {
        if (activeTab === 'shipments' && !shipmentsLoaded) {
            setShipmentsLoading(true);
            setShipmentsError('');
            axios
                .get(`${API}/api/me/ship-requests`, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => { setShipments(res.data); setShipmentsLoaded(true); })
                .catch(() => setShipmentsError('Failed to load shipment history.'))
                .finally(() => setShipmentsLoading(false));
        }
    }, [activeTab, token, shipmentsLoaded]);

    const TX_LABEL = {
        pack_open_spend:         'Pack Opened',
        battle_create_spend:     'Battle Created',
        battle_join_spend:       'Battle Joined',
        battle_cancel_refund:    'Battle Refunded',
        admin_credit_adjustment: 'Admin Adjustment',
    };

    const winRate =
        stats && (stats.wins + stats.losses) > 0
            ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
            : null;

    const formatDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString(undefined, {
            month: 'short',
            day:   'numeric',
            year:  'numeric',
        });
    };

    const resultClass = (r) => {
        if (r === 'win')       return 'pf-result-win';
        if (r === 'loss')      return 'pf-result-loss';
        if (r === 'cancelled') return 'pf-result-cancelled';
        return '';
    };

    return (
        <section className="profile">
            <div className="packs-bg">
                <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                <img className="bg-img"  src="./imgs/image 3.png"       alt="" />
            </div>

            <div className="container">

                <div className="pf-header" data-aos="fade-down">
                    <h2>{stats?.name ?? user?.name ?? 'Profile'}</h2>
                    <p className="pf-subtitle">{stats?.email ?? ''}</p>
                </div>

                {statsError && <p className="pf-error">{statsError}</p>}

                {!statsLoading && stats && (
                    <div className="pf-stats-row" data-aos="fade-up">
                        <div className="pf-stat-card">
                            <span className="pf-stat-value pf-stat-credits">{fmtPackCoins(stats.credits)}</span>
                            <span className="pf-stat-label">Pack Coins</span>
                        </div>
                        <div className="pf-stat-card">
                            <span className="pf-stat-value pf-stat-win">{stats.wins}</span>
                            <span className="pf-stat-label">Wins</span>
                        </div>
                        <div className="pf-stat-card">
                            <span className="pf-stat-value pf-stat-loss">{stats.losses}</span>
                            <span className="pf-stat-label">Losses</span>
                        </div>
                        <div className="pf-stat-card">
                            <span className="pf-stat-value">
                                {winRate !== null ? `${winRate}%` : '—'}
                            </span>
                            <span className="pf-stat-label">Win Rate</span>
                        </div>
                    </div>
                )}

                <div className="pf-tabs">
                    <button
                        className={`pf-tab-btn${activeTab === 'battles' ? ' pf-tab-active' : ''}`}
                        onClick={() => setActiveTab('battles')}
                    >
                        Recent Battles
                    </button>
                    <button
                        className={`pf-tab-btn${activeTab === 'transactions' ? ' pf-tab-active' : ''}`}
                        onClick={() => setActiveTab('transactions')}
                    >
                        Credit History
                    </button>
                    <button
                        className={`pf-tab-btn${activeTab === 'shipments' ? ' pf-tab-active' : ''}`}
                        onClick={() => setActiveTab('shipments')}
                    >
                        Shipments
                    </button>
                </div>

                {activeTab === 'battles' && (
                    <div className="pf-history">
                        <h3 className="pf-section-title">Recent Battles</h3>

                        {battlesLoading && <p className="pf-status">Loading battle history...</p>}
                        {battlesError   && <p className="pf-error">{battlesError}</p>}

                        {!battlesLoading && !battlesError && battles.length === 0 && (
                            <p className="pf-status">
                                No battles yet.{' '}
                                <Link to="/battles" className="pf-link">Start one!</Link>
                            </p>
                        )}

                        {battles.length > 0 && (
                            <div className="table-responsive pf-table-wrap">
                                <table className="table pf-table">
                                    <thead>
                                        <tr>
                                            <th>DATE</th>
                                            <th>PACK</th>
                                            <th>VS</th>
                                            <th>RESULT</th>
                                            <th>YOUR TOTAL</th>
                                            <th>THEIR TOTAL</th>
                                            <th></th>
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
                                                                <span className="pf-bot-badge">BOT</span>
                                                            )}
                                                        </p>
                                                    </td>
                                                    <td>
                                                        <span className={`pf-result-badge ${resultClass(b.result)}`}>
                                                            {b.result.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <p className="pf-total">
                                                            {b.my_total != null
                                                                ? fmtPackCoinsShort(b.my_total)
                                                                : '—'}
                                                        </p>
                                                    </td>
                                                    <td>
                                                        <p className="pf-total">
                                                            {b.their_total != null
                                                                ? fmtPackCoinsShort(b.their_total)
                                                                : '—'}
                                                        </p>
                                                    </td>
                                                    <td>
                                                        <Link
                                                            to={`/duel-battle/${b.id}`}
                                                            className="pf-view-btn"
                                                        >
                                                            View
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'transactions' && (
                    <div className="pf-credit-history">
                        <h3 className="pf-section-title">Pack Coin History</h3>

                        {txLoading && <p className="pf-status">Loading credit history...</p>}
                        {txError   && <p className="pf-error">{txError}</p>}

                        {!txLoading && !txError && transactions.length === 0 && (
                            <p className="pf-status">No transactions yet.</p>
                        )}

                        {transactions.length > 0 && (
                            <div className="table-responsive pf-table-wrap">
                                <table className="table pf-table">
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
                                            const isPositive = tx.amount > 0;
                                            const sign       = isPositive ? '+' : '−';
                                            const absAmt     = Math.abs(tx.amount);
                                            return (
                                                <tr key={tx.id}>
                                                    <td><p>{formatDate(tx.created_at)}</p></td>
                                                    <td>
                                                        <p className="pf-tx-type">
                                                            {TX_LABEL[tx.type] || tx.type}
                                                        </p>
                                                    </td>
                                                    <td>
                                                        <p className="pf-tx-note">{tx.note || '—'}</p>
                                                    </td>
                                                    <td>
                                                        <p className={isPositive ? 'pf-tx-amount-pos' : 'pf-tx-amount-neg'}>
                                                            {sign}{fmtPackCoins(absAmt)}
                                                        </p>
                                                    </td>
                                                    <td>
                                                        <p className="pf-tx-balance">
                                                            {tx.balance_after != null ? fmtPackCoins(tx.balance_after) : '—'}
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
                )}

                {activeTab === 'shipments' && (
                    <div className="pf-shipments">
                        <h3 className="pf-section-title">Shipment History</h3>

                        {shipmentsLoading && <p className="pf-status">Loading shipments...</p>}
                        {shipmentsError   && <p className="pf-error">{shipmentsError}</p>}

                        {!shipmentsLoading && !shipmentsError && shipments.length === 0 && (
                            <p className="pf-status">No shipment requests yet.</p>
                        )}

                        {shipments.length > 0 && (
                            <div className="pf-ship-list">
                                {shipments.map(s => (
                                    <div key={s.request_id} className="pf-ship-row">
                                        {s.card_image_url && (
                                            <img
                                                className="pf-ship-thumb"
                                                src={s.card_image_url}
                                                alt={s.card_name}
                                            />
                                        )}
                                        <div className="pf-ship-info">
                                            <p className="pf-ship-name">{s.card_name}</p>
                                            <span className={`pf-ship-badge pf-ship-badge-${s.status}`}>
                                                {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                                            </span>
                                            <p className="pf-ship-date">
                                                Submitted {formatDate(s.created_at)}
                                                {s.shipped_at   && ` · Shipped ${formatDate(s.shipped_at)}`}
                                                {s.rejected_at  && ` · Rejected ${formatDate(s.rejected_at)}`}
                                            </p>
                                            {(s.tracking_number || s.carrier) && (
                                                <p className="pf-ship-tracking">
                                                    {s.carrier && <span className="pf-ship-carrier">{s.carrier}</span>}
                                                    {s.tracking_number && <span className="pf-ship-tn">{s.tracking_number}</span>}
                                                </p>
                                            )}
                                            {s.admin_note && s.status === 'rejected' && (
                                                <p className="pf-ship-note">Note: {s.admin_note}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </section>
    );
};

export default Profile;
