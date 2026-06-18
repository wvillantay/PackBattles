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

// ── Marketplace URL helpers ────────────────────────────────────────────────

function cardNumber(providerCardId) {
    if (!providerCardId) return null;
    const last = providerCardId.split('-').pop();
    return /^\d+$/.test(last) ? last : null;
}

function buildSearchStr(card) {
    const parts = [card.card_name];
    if (card.set_name) parts.push(card.set_name);
    const num = cardNumber(card.provider_card_id);
    if (num) parts.push(num);
    return parts.join(' ');
}

function buildLinks(card) {
    const q    = encodeURIComponent(buildSearchStr(card));
    const name = encodeURIComponent(card.card_name);
    return {
        tcgplayer:   `https://www.tcgplayer.com/search/pokemon/product?q=${q}`,
        ebayActive:  `https://www.ebay.com/sch/i.html?_nkw=${q}`,
        ebaySold:    `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`,
        pricecharting: `https://www.pricecharting.com/search-products?q=${name}`,
        cardmarket:  `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${q}&exactMatch=false`,
    };
}

function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Component ──────────────────────────────────────────────────────────────

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

    // at most one Quick Check panel open at a time
    const [expandedCard, setExpandedCard] = useState(null);

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
                setCards(prev => prev.map(c =>
                    c.card_id === cardId
                        ? { ...c, available_quantity: qty, fulfillable: ful,
                                  in_inventory: true,
                                  trade_eligible: qty > 0 || ful }
                        : c
                ));
                setEdits(prev => { const n = { ...prev }; delete n[cardId]; return n; });
                setSaving(prev => ({ ...prev, [cardId]: 'saved' }));
                setTimeout(() =>
                    setSaving(prev => ({ ...prev, [cardId]: 'idle' })), 2000);
            })
            .catch(() => {
                setSaving(prev => ({ ...prev, [cardId]: 'error' }));
            });
    };

    const toggleExpand = (cardId) => {
        setExpandedCard(prev => (prev === cardId ? null : cardId));
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
                                    <th>MARKET</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(card => {
                                    const qty     = getQty(card);
                                    const ful     = getFulfillable(card);
                                    const elig    = qty > 0 || ful;
                                    const st      = saving[card.card_id] || 'idle';
                                    const dirty   = isDirty(card);
                                    const open    = expandedCard === card.card_id;
                                    const links   = buildLinks(card);
                                    const hasMkt  = card.market_price != null;

                                    return (
                                        <React.Fragment key={card.card_id}>
                                            {/* ── Main row ── */}
                                            <tr>
                                                {/* Card name + thumbnail */}
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

                                                {/* Gameplay value + compact market hint */}
                                                <td>
                                                    <p className="admin-credits">${card.card_value.toFixed(2)}</p>
                                                    {hasMkt && (
                                                        <p className="admin-ci-mkt-hint">
                                                            mkt {card.market_price_currency === 'USD' ? '$' : '€'}
                                                            {card.market_price.toFixed(2)}
                                                        </p>
                                                    )}
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

                                                {/* Fulfillable toggle */}
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

                                                {/* Quick Check toggle */}
                                                <td>
                                                    <button
                                                        type="button"
                                                        className={`admin-qc-toggle${open ? ' admin-qc-toggle-open' : ''}`}
                                                        onClick={() => toggleExpand(card.card_id)}
                                                        title="Marketplace Quick Check"
                                                    >
                                                        Check {open ? '▲' : '▼'}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* ── Expanded Quick Check panel ── */}
                                            {open && (
                                                <tr className="admin-qc-row">
                                                    <td colSpan={8}>
                                                        <div className="admin-qc-panel">
                                                            <p className="admin-qc-label">
                                                                Manual Market Check
                                                                <span className="admin-qc-disclaimer">
                                                                    — links open external sites. Prices and availability are not verified.
                                                                </span>
                                                            </p>

                                                            {/* Stored reference prices */}
                                                            <div className="admin-qc-prices">
                                                                <div className="admin-qc-price-chip">
                                                                    <span className="admin-qc-price-label">TCGplayer</span>
                                                                    <span className="admin-qc-price-value">
                                                                        {card.tcgplayer_price_usd != null
                                                                            ? `$${card.tcgplayer_price_usd.toFixed(2)} USD`
                                                                            : '—'}
                                                                    </span>
                                                                </div>
                                                                <div className="admin-qc-price-chip">
                                                                    <span className="admin-qc-price-label">Cardmarket</span>
                                                                    <span className="admin-qc-price-value">
                                                                        {card.cardmarket_price_eur != null
                                                                            ? `€${card.cardmarket_price_eur.toFixed(2)} EUR`
                                                                            : '—'}
                                                                    </span>
                                                                </div>
                                                                <div className="admin-qc-price-chip">
                                                                    <span className="admin-qc-price-label">Market Price</span>
                                                                    <span className="admin-qc-price-value">
                                                                        {card.market_price != null
                                                                            ? `${card.market_price_currency === 'USD' ? '$' : '€'}${card.market_price.toFixed(2)} ${card.market_price_currency || ''}`
                                                                            : '—'}
                                                                    </span>
                                                                </div>
                                                                <div className="admin-qc-price-chip">
                                                                    <span className="admin-qc-price-label">Last Updated</span>
                                                                    <span className="admin-qc-price-value">
                                                                        {fmtDate(card.last_price_update)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Marketplace links */}
                                                            <div className="admin-qc-links">
                                                                <a
                                                                    className="admin-qc-link admin-qc-link-tcg"
                                                                    href={links.tcgplayer}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    TCGplayer
                                                                </a>
                                                                <a
                                                                    className="admin-qc-link admin-qc-link-ebay"
                                                                    href={links.ebayActive}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    eBay Active
                                                                </a>
                                                                <a
                                                                    className="admin-qc-link admin-qc-link-ebay"
                                                                    href={links.ebaySold}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    eBay Sold
                                                                </a>
                                                                <a
                                                                    className="admin-qc-link admin-qc-link-pc"
                                                                    href={links.pricecharting}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    PriceCharting
                                                                </a>
                                                                <a
                                                                    className="admin-qc-link admin-qc-link-cm"
                                                                    href={links.cardmarket}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    Cardmarket
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={8}>
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
