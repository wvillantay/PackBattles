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

    // Per-row tracking state (keyed by request_id)
    const [trackingForm,    setTrackingForm]    = useState({});
    const [trackingBusy,    setTrackingBusy]    = useState({});
    const [trackingError,   setTrackingError]   = useState({});
    const [trackingSuccess, setTrackingSuccess] = useState({});

    const fetchRequests = (status) => {
        setLoading(true);
        setError('');
        const params = status !== 'all' ? `?status=${status}` : '';
        axios
            .get(`${API}/api/admin/ship-requests${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setRequests(res.data);
                // Seed tracking form for shipped rows
                setTrackingForm((prev) => {
                    const next = { ...prev };
                    res.data.forEach((r) => {
                        if (r.status === 'shipped' && !next[r.request_id]) {
                            next[r.request_id] = {
                                tracking_number: r.tracking_number || '',
                                carrier:         r.carrier         || '',
                            };
                        }
                    });
                    return next;
                });
            })
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

    const setTrackingField = (reqId, field) => (e) =>
        setTrackingForm((prev) => ({
            ...prev,
            [reqId]: { ...(prev[reqId] || {}), [field]: e.target.value },
        }));

    const handleTrackingSave = async (req) => {
        const form = trackingForm[req.request_id] || {};
        const tn   = (form.tracking_number || '').trim();
        const cr   = (form.carrier         || '').trim();
        if (!tn && !cr) {
            setTrackingError((p) => ({ ...p, [req.request_id]: 'Enter a tracking number or carrier.' }));
            return;
        }
        setTrackingBusy((p)   => ({ ...p, [req.request_id]: true  }));
        setTrackingError((p)  => ({ ...p, [req.request_id]: ''    }));
        setTrackingSuccess((p)=> ({ ...p, [req.request_id]: ''    }));
        try {
            await axios.patch(
                `${API}/api/admin/ship-requests/${req.request_id}/tracking`,
                { tracking_number: tn, carrier: cr },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setTrackingSuccess((p) => ({ ...p, [req.request_id]: 'Tracking saved.' }));
            // Update the row in-place so the table reflects new values
            setRequests((prev) =>
                prev.map((r) =>
                    r.request_id === req.request_id
                        ? { ...r, tracking_number: tn, carrier: cr }
                        : r,
                ),
            );
        } catch (err) {
            setTrackingError((p) => ({
                ...p,
                [req.request_id]: err?.response?.data?.error || 'Save failed.',
            }));
        } finally {
            setTrackingBusy((p) => ({ ...p, [req.request_id]: false }));
        }
    };

    const renderAddress = (req) => {
        // New records: has structured fields (full_name is the indicator)
        if (req.full_name) {
            return (
                <div className="admin-sr-addr-block">
                    <span>{req.full_name}</span>
                    <span>{req.address_line1}</span>
                    {req.address_line2 && <span>{req.address_line2}</span>}
                    <span>{req.city}, {req.state} {req.postal_code}</span>
                    <span>{req.country}</span>
                    {req.phone && <span className="admin-sr-addr-phone">{req.phone}</span>}
                </div>
            );
        }
        // Old records: flat shipping_address string
        return <span className="admin-sr-address">{req.shipping_address || '—'}</span>;
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
                                            <td>{renderAddress(req)}</td>
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
                                                ) : req.status === 'shipped' ? (
                                                    <div className="admin-sr-tracking-wrap">
                                                        <p className="admin-sr-tracking-label">
                                                            {req.tracking_number || req.carrier ? 'Edit Tracking' : 'Add Tracking'}
                                                        </p>
                                                        <input
                                                            className="admin-sr-tracking-input"
                                                            type="text"
                                                            placeholder="Carrier (e.g. USPS)"
                                                            value={trackingForm[req.request_id]?.carrier ?? ''}
                                                            onChange={setTrackingField(req.request_id, 'carrier')}
                                                            disabled={trackingBusy[req.request_id]}
                                                        />
                                                        <input
                                                            className="admin-sr-tracking-input"
                                                            type="text"
                                                            placeholder="Tracking number"
                                                            value={trackingForm[req.request_id]?.tracking_number ?? ''}
                                                            onChange={setTrackingField(req.request_id, 'tracking_number')}
                                                            disabled={trackingBusy[req.request_id]}
                                                        />
                                                        <button
                                                            className="admin-sr-tracking-save-btn"
                                                            onClick={() => handleTrackingSave(req)}
                                                            disabled={trackingBusy[req.request_id]}
                                                        >
                                                            {trackingBusy[req.request_id] ? 'Saving…' : 'Save'}
                                                        </button>
                                                        {trackingError[req.request_id] && (
                                                            <p className="admin-sr-tracking-error">{trackingError[req.request_id]}</p>
                                                        )}
                                                        {trackingSuccess[req.request_id] && (
                                                            <p className="admin-sr-tracking-success">{trackingSuccess[req.request_id]}</p>
                                                        )}
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
