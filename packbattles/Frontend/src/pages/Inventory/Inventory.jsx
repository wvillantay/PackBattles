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
    const [shipTarget, setShipTarget]   = useState(null);
    const [shipLoading, setShipLoading] = useState(false);
    const [shipError, setShipError]     = useState('');
    const [shipSuccess, setShipSuccess] = useState('');

    const EMPTY_FORM = {
        full_name: '', address_line1: '', address_line2: '',
        city: '', state: '', postal_code: '', country: '', phone: '',
    };
    const [shipForm, setShipForm] = useState(EMPTY_FORM);

    const setField = (field) => (e) =>
        setShipForm((prev) => ({ ...prev, [field]: e.target.value }));

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
        setShipForm(EMPTY_FORM);
        setShipError('');
        setShipSuccess('');
    };

    const closeShipModal = () => {
        if (shipLoading) return;
        setShipTarget(null);
    };

    const handleShipSubmit = async () => {
        if (!shipTarget) return;

        // Client-side required field check
        const required = [
            ['full_name',    'Full Name'],
            ['address_line1','Address Line 1'],
            ['city',         'City'],
            ['state',        'State'],
            ['postal_code',  'Postal Code'],
            ['country',      'Country'],
        ];
        for (const [key, label] of required) {
            if (!shipForm[key].trim()) {
                setShipError(`${label} is required.`);
                return;
            }
        }

        setShipLoading(true);
        setShipError('');
        setShipSuccess('');
        try {
            await axios.post(
                `${API}/api/me/ship-requests`,
                {
                    card_id:       shipTarget.card_id,
                    full_name:     shipForm.full_name.trim(),
                    address_line1: shipForm.address_line1.trim(),
                    address_line2: shipForm.address_line2.trim(),
                    city:          shipForm.city.trim(),
                    state:         shipForm.state.trim(),
                    postal_code:   shipForm.postal_code.trim(),
                    country:       shipForm.country.trim(),
                    phone:         shipForm.phone.trim(),
                },
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
                            <label className="inv-ship-field-label">Full Name <span className="inv-ship-req">*</span></label>
                            <input
                                className="inv-ship-input"
                                type="text"
                                placeholder="Recipient full name"
                                value={shipForm.full_name}
                                onChange={setField('full_name')}
                                disabled={shipLoading}
                            />
                        </div>

                        <div className="inv-ship-field">
                            <label className="inv-ship-field-label">Address Line 1 <span className="inv-ship-req">*</span></label>
                            <input
                                className="inv-ship-input"
                                type="text"
                                placeholder="Street address, apt, building"
                                value={shipForm.address_line1}
                                onChange={setField('address_line1')}
                                disabled={shipLoading}
                            />
                        </div>

                        <div className="inv-ship-field">
                            <label className="inv-ship-field-label">Address Line 2 <span className="inv-ship-opt">(optional)</span></label>
                            <input
                                className="inv-ship-input"
                                type="text"
                                placeholder="Suite, unit, floor"
                                value={shipForm.address_line2}
                                onChange={setField('address_line2')}
                                disabled={shipLoading}
                            />
                        </div>

                        <div className="inv-ship-row3">
                            <div className="inv-ship-field">
                                <label className="inv-ship-field-label">City <span className="inv-ship-req">*</span></label>
                                <input
                                    className="inv-ship-input"
                                    type="text"
                                    placeholder="City"
                                    value={shipForm.city}
                                    onChange={setField('city')}
                                    disabled={shipLoading}
                                />
                            </div>
                            <div className="inv-ship-field">
                                <label className="inv-ship-field-label">State / Region <span className="inv-ship-req">*</span></label>
                                <input
                                    className="inv-ship-input"
                                    type="text"
                                    placeholder="State"
                                    value={shipForm.state}
                                    onChange={setField('state')}
                                    disabled={shipLoading}
                                />
                            </div>
                            <div className="inv-ship-field">
                                <label className="inv-ship-field-label">Postal Code <span className="inv-ship-req">*</span></label>
                                <input
                                    className="inv-ship-input"
                                    type="text"
                                    placeholder="ZIP / Postal"
                                    value={shipForm.postal_code}
                                    onChange={setField('postal_code')}
                                    disabled={shipLoading}
                                />
                            </div>
                        </div>

                        <div className="inv-ship-field">
                            <label className="inv-ship-field-label">Country <span className="inv-ship-req">*</span></label>
                            <input
                                className="inv-ship-input"
                                type="text"
                                placeholder="Country"
                                value={shipForm.country}
                                onChange={setField('country')}
                                disabled={shipLoading}
                            />
                        </div>

                        <div className="inv-ship-field">
                            <label className="inv-ship-field-label">Phone <span className="inv-ship-opt">(optional)</span></label>
                            <input
                                className="inv-ship-input"
                                type="tel"
                                placeholder="Contact phone number"
                                value={shipForm.phone}
                                onChange={setField('phone')}
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
