import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../api';
import './Admin.css';

const RARITY_LABEL = {
    ultra_rare: 'Ultra Rare',
    rare:       'Rare',
    uncommon:   'Uncommon',
    common:     'Common',
};

const AdminCompanyInventory = () => {
    const { token } = useAuth();

    const [cards,   setCards]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [search,  setSearch]  = useState('');

    // edits[card_id] = { qty, fulfillable }  — only set when user changes a value
    const [edits,  setEdits]  = useState({});
    // saving[card_id] = 'idle' | 'saving' | 'saved' | 'error'
    const [saving, setSaving] = useState({});

    const fetchCards = useCallback(() => {
        setLoading(true);
        setError('');
        axios
            .get(`${API}/api/admin/cards-with-inventory`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then(res => setCards(res.data))
            .catch(() => setError('Failed to load card inventory.'))
            .finally(() => setLoading(false));
    }, [token]);

    useEffect(() => { fetchCards(); }, [fetchCards]);

    const getQty = (card) =>
        edits[card.card_id]?.qty !== undefined
            ? edits[card.card_id].qty
            : card.available_quantity;

    const getFulfillable = (card) =>
        edits[card.card_id]?.fulfillable !== undefined
            ? edits[card.card_id].fulfillable
            : card.fulfillable;

    const isEligible = (card) => {
        const qty = getQty(card);
        const ful = getFulfillable(card);
        return qty > 0 || ful;
    };

    const isDirty = (card) => edits[card.card_id] !== undefined;

    const handleQtyChange = (cardId, raw) => {
        const val = parseInt(raw, 10);
        if (isNaN(val) || val < 0) return;
        setEdits(prev => ({ ...prev, [cardId]: { ...prev[cardId], qty: val } }));
        setSaving(prev => ({ ...prev, [cardId]: 'idle' }));
    };

    const handleFulfillableChange = (cardId, checked) => {
        setEdits(prev => ({ ...prev, [cardId]: { ...prev[cardId], fulfillable: checked } }));
        setSaving(prev => ({ ...prev, [cardId]: 'idle' }));
    };

    const handleSave = (card) => {
        const cardId = card.card_id;
        const qty    = getQty(card);
        const ful    = getFulfillable(card);

        setSaving(prev => ({ ...prev, [cardId]: 'saving' }));

        axios
            .post(
                `${API}/api/admin/company-inventory`,
                { card_id: cardId, available_quantity: qty, fulfillable: ful },
                { headers: { Authorization: `Bearer ${token}` } },
            )
            .then(() => {
                // merge saved values back into cards so server state stays fresh
                setCards(prev => prev.map(c =>
                    c.card_id === cardId
                        ? { ...c, available_quantity: qty, fulfillable: ful,
                                  in_inventory: true,
                                  trade_eligible: qty > 0 || ful }
                        : c
                ));
                setEdits(prev => { const n = { ...prev }; delete n[cardId]; return n; });
                setSaving(prev => ({ ...prev, [cardId]: 'saved' }));
                // clear the "Saved" label after 2 s
                setTimeout(() =>
                    setSaving(prev => ({ ...prev, [cardId]: 'idle' })), 2000);
            })
            .catch(() => {
                setSaving(prev => ({ ...prev, [cardId]: 'error' }));
            });
    };

    const filtered = cards.filter(c =>
        c.card_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <section className="admin-page">
            <div className="packs-bg">
                <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                <img className="bg-img"  src="./imgs/image 3.png"       alt="" />
            </div>
            <div className="container">
                <div className="admin-header">
                    <div>
                        <h2>Company Inventory</h2>
                        <p className="admin-subtitle">
                            {cards.length} card{cards.length !== 1 ? 's' : ''} — set quantity and fulfillable status
                        </p>
                    </div>
                    <Link to="/admin" className="admin-back">← Admin</Link>
                </div>

                <div className="admin-filters">
                    <input
                        className="admin-search"
                        type="text"
                        placeholder="Search cards..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <span className="admin-ci-count">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {loading && <p className="admin-loading">Loading cards...</p>}
                {error   && <p className="admin-error">{error}</p>}

                {!loading && !error && (
                    <div className="table-responsive admin-table-wrap">
                        <table className="table admin-table admin-ci-table">
                            <thead>
                                <tr>
                                    <th>CARD</th>
                                    <th>RARITY</th>
                                    <th>VALUE</th>
                                    <th>QTY</th>
                                    <th>FULFILLABLE</th>
                                    <th>ELIGIBLE</th>
                                    <th>SAVE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(card => {
                                    const qty  = getQty(card);
                                    const ful  = getFulfillable(card);
                                    const elig = qty > 0 || ful;
                                    const st   = saving[card.card_id] || 'idle';
                                    const dirty = isDirty(card);

                                    return (
                                        <tr key={card.card_id}>
                                            {/* Card name + optional thumbnail */}
                                            <td>
                                                <div className="admin-ci-card-cell">
                                                    {card.card_image_url && (
                                                        <img
                                                            className="admin-ci-thumb"
                                                            src={card.card_image_url}
                                                            alt={card.card_name}
                                                        />
                                                    )}
                                                    <p className="admin-ci-name">{card.card_name}</p>
                                                </div>
                                            </td>

                                            {/* Rarity */}
                                            <td>
                                                <p className={`admin-ci-rarity admin-ci-rarity-${card.card_rarity}`}>
                                                    {RARITY_LABEL[card.card_rarity] || card.card_rarity}
                                                </p>
                                            </td>

                                            {/* Value */}
                                            <td>
                                                <p className="admin-credits">${card.card_value.toFixed(2)}</p>
                                            </td>

                                            {/* Qty input */}
                                            <td>
                                                <input
                                                    className="admin-input admin-ci-qty-input"
                                                    type="number"
                                                    min="0"
                                                    value={qty}
                                                    onChange={e => handleQtyChange(card.card_id, e.target.value)}
                                                />
                                            </td>

                                            {/* Fulfillable checkbox */}
                                            <td>
                                                <label className="admin-ci-toggle">
                                                    <input
                                                        type="checkbox"
                                                        checked={ful}
                                                        onChange={e => handleFulfillableChange(card.card_id, e.target.checked)}
                                                    />
                                                    <span className="admin-ci-toggle-track" />
                                                </label>
                                            </td>

                                            {/* Trade-eligible badge */}
                                            <td>
                                                <span className={`admin-status-badge ${elig ? 'admin-status-completed' : 'admin-status-cancelled'}`}>
                                                    {elig ? 'Eligible' : 'Not Eligible'}
                                                </span>
                                            </td>

                                            {/* Save button + feedback */}
                                            <td>
                                                <div className="admin-ci-save-cell">
                                                    <button
                                                        className="admin-btn-primary admin-ci-save-btn"
                                                        disabled={!dirty || st === 'saving'}
                                                        onClick={() => handleSave(card)}
                                                    >
                                                        {st === 'saving' ? 'Saving…' : 'Save'}
                                                    </button>
                                                    {st === 'saved' && (
                                                        <span className="admin-ci-feedback admin-ci-feedback-ok">Saved ✓</span>
                                                    )}
                                                    {st === 'error' && (
                                                        <span className="admin-ci-feedback admin-ci-feedback-err">Error</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={7}>
                                            <p className="admin-empty">No cards match your search.</p>
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

export default AdminCompanyInventory;
