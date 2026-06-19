import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StartNow from '../../components/StartNow/StartNow';
import './Inventory.css';
import { fmtPackCoins } from '../../utils/currency';

import { API } from '../../api';

const RARITY_LABEL = {
    common:     'COMMON',
    uncommon:   'UNCOMMON',
    rare:       'RARE',
    ultra_rare: 'ULTRA RARE',
};

const RARITY_COLOR = {
    common:     '#9ca3af',
    uncommon:   '#60a5fa',
    rare:       '#a35bff',
    ultra_rare: '#f59e0b',
};

const Inventory = () => {
    const { token } = useAuth();
    const [items, setItems]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    // Ship modal state
    const [shipTarget, setShipTarget]   = useState(null);   // inventory item being requested
    const [shipAddress, setShipAddress] = useState('');
    const [shipLoading, setShipLoading] = useState(false);
    const [shipError, setShipError]     = useState('');
    const [shipSuccess, setShipSuccess] = useState('');

    useEffect(() => {
        axios
            .get(`${API}/api/inventory`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => setItems(res.data))
            .catch(() => setError('Failed to load inventory. Make sure the backend is running.'))
            .finally(() => setLoading(false));
    }, [token]);

    const openShipModal = (item) => {
        setShipTarget(item);
        setShipAddress('');
        setShipError('');
        setShipSuccess('');
    };

    const closeShipModal = () => {
        if (shipLoading) return;
        setShipTarget(null);
    };

    const handleShipSubmit = async () => {
        if (!shipTarget) return;
        const addr = shipAddress.trim();
        if (!addr) {
            setShipError('Please enter a shipping address.');
            return;
        }
        setShipLoading(true);
        setShipError('');
        setShipSuccess('');
        try {
            await axios.post(
                `${API}/api/me/ship-requests`,
                { card_id: shipTarget.card_id, shipping_address: addr },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setShipSuccess('Shipment request submitted! Your card is now reserved.');
            // Update local item to show pending badge immediately
            setItems((prev) =>
                prev.map((it) =>
                    it.inventory_id === shipTarget.inventory_id
                        ? { ...it, withdrawal_pending: true, can_ship: false }
                        : it,
                ),
            );
            setTimeout(() => setShipTarget(null), 1800);
        } catch (err) {
            setShipError(err?.response?.data?.error || 'Request failed. Please try again.');
        } finally {
            setShipLoading(false);
        }
    };

    return (
        <>
            <section className="inventory">
                <div className="packs-bg">
                    <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                    <img className="bg-img"  src="./imgs/image 3.png"       alt="" />
                </div>

                <div className="container">
                    <h2 data-aos="fade-down">My Inventory</h2>

                    {loading && (
                        <p className="inv-status">Loading inventory...</p>
                    )}

                    {error && (
                        <div className="alert alert-danger inv-alert">
                            {error}
                        </div>
                    )}

                    {!loading && !error && items.length === 0 && (
                        <div className="inv-empty">
                            <p>You don't own any cards yet.</p>
                            <Link to="/packs" className="inv-cta-btn">
                                Open Packs
                            </Link>
                        </div>
                    )}

                    {!loading && items.length > 0 && (
                        <p className="inv-count" data-aos="fade-up">
                            {items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} cards owned
                        </p>
                    )}

                    <div className="row inv-grid">
                        {items.map((item) => (
                            <div
                                className="col-xl-2 col-lg-3 col-md-4 col-sm-6 col-6"
                                key={item.inventory_id}
                                data-aos="fade-up"
                            >
                                <div className="inv-card">
                                    <div className="inv-card-img">
                                        <img src={item.image_url} alt={item.name} width="100%" />
                                        <span
                                            className="inv-rarity-badge"
                                            style={{ background: RARITY_COLOR[item.rarity] || '#9ca3af' }}
                                        >
                                            {RARITY_LABEL[item.rarity] || item.rarity.toUpperCase()}
                                        </span>
                                        {item.quantity > 1 && (
                                            <span className="inv-qty-badge">x{item.quantity}</span>
                                        )}
                                    </div>
                                    <div className="inv-card-body">
                                        <p className="inv-card-name">{item.name}</p>
                                        <span className="inv-card-value">{fmtPackCoins(item.value)}</span>

                                        {item.withdrawal_pending ? (
                                            <span className="inv-ship-badge">Shipment Pending</span>
                                        ) : item.can_ship ? (
                                            <button
                                                className="inv-ship-btn"
                                                onClick={() => openShipModal(item)}
                                            >
                                                Request Shipment
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <StartNow />

            {/* Ship Request Modal */}
            {shipTarget && (
                <div className="inv-ship-overlay" onClick={closeShipModal}>
                    <div className="inv-ship-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="inv-ship-modal-header">
                            <h3>Request Shipment</h3>
                            <button
                                className="inv-ship-close"
                                onClick={closeShipModal}
                                disabled={shipLoading}
                            >
                                ✕
                            </button>
                        </div>

                        <p className="inv-ship-card-name">{shipTarget.name}</p>

                        <div className="inv-ship-field">
                            <label className="inv-ship-field-label">Shipping Address</label>
                            <textarea
                                className="inv-ship-textarea"
                                placeholder={"Full name\nStreet address\nCity, State, ZIP\nCountry"}
                                value={shipAddress}
                                onChange={(e) => setShipAddress(e.target.value)}
                                rows={4}
                                disabled={shipLoading}
                            />
                        </div>

                        <p className="inv-ship-note">
                            Your address is stored with this request and visible to our team. You cannot edit it after submitting.
                        </p>

                        {shipError   && <p className="inv-ship-error">{shipError}</p>}
                        {shipSuccess && <p className="inv-ship-success">{shipSuccess}</p>}

                        <div className="inv-ship-actions">
                            <button
                                className="inv-ship-cancel-btn"
                                onClick={closeShipModal}
                                disabled={shipLoading}
                            >
                                Cancel
                            </button>
                            <button
                                className="inv-ship-submit-btn"
                                onClick={handleShipSubmit}
                                disabled={shipLoading}
                            >
                                {shipLoading ? 'Submitting…' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Inventory;
