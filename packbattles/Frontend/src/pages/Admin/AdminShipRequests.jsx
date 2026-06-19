import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../api';
import './Admin.css';

const STATUS_FILTERS = ['all', 'pending', 'shipped', 'rejected'];

const AdminShipRequests = () => {
    const { token } = useAuth();

    const [requests, setRequests]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState('');
    const [statusFilter, setFilter] = useState('pending');

    // Reject modal state
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectNote, setRejectNote]     = useState('');
    const [rejectLoading, setRejectLoading] = useState(false);
    const [rejectError, setRejectError]     = useState('');
    const [rejectSuccess, setRejectSuccess] = useState('');

    // Per-row action loading/error
    const [rowBusy, setRowBusy]   = useState({});
    const [rowError, setRowError] = useState({});

    const fetchRequests = (status) => {
        setLoading(true);
        setError('');
        const params = status !== 'all' ? `?status=${status}` : '';
        axios
            .get(`${API}/api/admin/ship-requests${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => setRequests(res.data))
            .catch(() => setError('Failed to load ship requests.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchRequests(statusFilter);
    }, [statusFilter, token]);

    const handleFilterChange = (f) => {
        setFilter(f);
    };

    const handleShip = async (req) => {
        setRowBusy((p) => ({ ...p, [req.request_id]: true }));
        setRowError((p) => ({ ...p, [req.request_id]: '' }));
        try {
            await axios.patch(
                `${API}/api/admin/ship-requests/${req.request_id}/ship`,
                {},
                { headers: { Authorization: `Bearer ${token}` } },
            );
            fetchRequests(statusFilter);
        } catch (err) {
            setRowError((p) => ({
                ...p,
                [req.request_id]: err?.response?.data?.error || 'Ship failed.',
            }));
        } finally {
            setRowBusy((p) => ({ ...p, [req.request_id]: false }));
        }
    };

    const openRejectModal = (req) => {
        setRejectTarget(req);
        setRejectNote('');
        setRejectError('');
        setRejectSuccess('');
    };

    const closeRejectModal = () => {
        if (rejectLoading) return;
        setRejectTarget(null);
    };

    const handleRejectSubmit = async () => {
        if (!rejectTarget) return;
        setRejectLoading(true);
        setRejectError('');
        setRejectSuccess('');
        try {
            await axios.patch(
                `${API}/api/admin/ship-requests/${rejectTarget.request_id}/reject`,
                { admin_note: rejectNote.trim() || undefined },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setRejectSuccess('Request rejected. Inventory returned.');
            fetchRequests(statusFilter);
            setTimeout(() => setRejectTarget(null), 1500);
        } catch (err) {
            setRejectError(err?.response?.data?.error || 'Reject failed. Please try again.');
        } finally {
            setRejectLoading(false);
        }
    };

    const fmtDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
        });
    };

    return (
        <>
            <section className="admin-page">
                <div className="packs-bg">
                    <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                    <img className="bg-img"  src="./imgs/image 3.png"       alt="" />
                </div>
                <div className="container">
                    <div className="admin-header">
                        <div>
                            <h2>Ship Requests</h2>
                            <p className="admin-subtitle">Review and process card shipment requests.</p>
                        </div>
                    </div>

                    {/* Status filters */}
                    <div className="admin-sr-filters">
                        {STATUS_FILTERS.map((f) => (
                            <button
                                key={f}
                                className={`admin-sr-filter-btn${statusFilter === f ? ' admin-sr-filter-active' : ''}`}
                                onClick={() => handleFilterChange(f)}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                        {!loading && (
                            <span className="admin-sr-count">{requests.length} request{requests.length !== 1 ? 's' : ''}</span>
                        )}
                    </div>

                    {loading && <p className="admin-empty">Loading…</p>}
                    {error   && <p className="admin-empty" style={{ color: '#f87171' }}>{error}</p>}

                    {!loading && !error && requests.length === 0 && (
                        <p className="admin-empty">No {statusFilter !== 'all' ? statusFilter : ''} requests found.</p>
                    )}

                    {!loading && !error && requests.length > 0 && (
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Card</th>
                                        <th>User</th>
                                        <th>Shipping Address</th>
                                        <th>Status</th>
                                        <th>Submitted</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map((req) => (
                                        <tr key={req.request_id}>
                                            <td>
                                                <div className="admin-ci-card-cell">
                                                    {req.card_image_url && (
                                                        <img
                                                            className="admin-ci-thumb"
                                                            src={req.card_image_url}
                                                            alt={req.card_name}
                                                        />
                                                    )}
                                                    <span className="admin-ci-name">{req.card_name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <p style={{ margin: 0, color: '#fff' }}>{req.user_name}</p>
                                                <p style={{ margin: 0, fontSize: '1.15rem', color: 'rgba(255,255,255,0.45)' }}>{req.user_email}</p>
                                            </td>
                                            <td>
                                                <span className="admin-sr-address">{req.shipping_address}</span>
                                            </td>
                                            <td>
                                                <span className={`admin-sr-status-${req.status}`} style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                                                    {req.status}
                                                </span>
                                                {req.admin_note && (
                                                    <p style={{ margin: '0.3rem 0 0', fontSize: '1.1rem', color: 'rgba(255,255,255,0.38)' }}>
                                                        Note: {req.admin_note}
                                                    </p>
                                                )}
                                            </td>
                                            <td>{fmtDate(req.created_at)}</td>
                                            <td>
                                                {req.status === 'pending' ? (
                                                    <div className="admin-sr-actions">
                                                        <button
                                                            className="admin-sr-ship-btn"
                                                            disabled={rowBusy[req.request_id]}
                                                            onClick={() => handleShip(req)}
                                                        >
                                                            {rowBusy[req.request_id] ? 'Shipping…' : 'Ship'}
                                                        </button>
                                                        <button
                                                            className="admin-sr-reject-btn"
                                                            disabled={rowBusy[req.request_id]}
                                                            onClick={() => openRejectModal(req)}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.2rem' }}>—</span>
                                                )}
                                                {rowError[req.request_id] && (
                                                    <p style={{ margin: '0.3rem 0 0', fontSize: '1.1rem', color: '#f87171' }}>
                                                        {rowError[req.request_id]}
                                                    </p>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            {/* Reject Modal */}
            {rejectTarget && (
                <div className="admin-sr-overlay" onClick={closeRejectModal}>
                    <div className="admin-sr-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-sr-modal-header">
                            <h3>Reject Request</h3>
                            <button
                                className="admin-sr-modal-close"
                                onClick={closeRejectModal}
                                disabled={rejectLoading}
                            >
                                ✕
                            </button>
                        </div>

                        <p className="admin-sr-modal-card">{rejectTarget.card_name}</p>
                        <p style={{ margin: 0, fontSize: '1.2rem', color: 'rgba(255,255,255,0.5)' }}>
                            Requested by <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{rejectTarget.user_name}</strong>
                        </p>

                        <div className="admin-sr-modal-field">
                            <label className="admin-sr-modal-label">Reason (optional)</label>
                            <textarea
                                className="admin-sr-modal-textarea"
                                placeholder="Explain why this request is being rejected…"
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                rows={3}
                                disabled={rejectLoading}
                            />
                        </div>

                        {rejectError   && <p className="admin-sr-modal-error">{rejectError}</p>}
                        {rejectSuccess && <p className="admin-sr-modal-success">{rejectSuccess}</p>}

                        <div className="admin-sr-modal-actions">
                            <button
                                className="admin-btn-secondary"
                                onClick={closeRejectModal}
                                disabled={rejectLoading}
                            >
                                Cancel
                            </button>
                            <button
                                className="admin-sr-reject-btn"
                                onClick={handleRejectSubmit}
                                disabled={rejectLoading}
                                style={{ padding: '0.7rem 1.8rem', fontSize: '1.3rem' }}
                            >
                                {rejectLoading ? 'Rejecting…' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminShipRequests;
