import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../api';
import './Admin.css';

const RARITY_OPTIONS = [
    { value: 'common',     label: 'Common' },
    { value: 'uncommon',   label: 'Uncommon' },
    { value: 'rare',       label: 'Rare' },
    { value: 'ultra_rare', label: 'Ultra Rare' },
];

// Best-effort mapping from TCGdex rarity strings to our 4-value enum.
// Admin can always override the pre-fill via the dropdown.
const TCGDEX_RARITY_MAP = {
    'common':                'common',
    'uncommon':              'uncommon',
    'rare':                  'rare',
    'rare holo':             'rare',
    'rare holo v':           'ultra_rare',
    'rare holo vmax':        'ultra_rare',
    'rare holo vstar':       'ultra_rare',
    'rare ultra':            'ultra_rare',
    'amazing rare':          'ultra_rare',
    'rare rainbow':          'ultra_rare',
    'rare secret':           'ultra_rare',
    'illustration rare':     'rare',
    'special illustration rare': 'ultra_rare',
    'hyper rare':            'ultra_rare',
    'promo':                 'rare',
};

function mapRarity(tcgRarity) {
    if (!tcgRarity) return '';
    return TCGDEX_RARITY_MAP[tcgRarity.toLowerCase()] || '';
}

const EMPTY_FORM = {
    name: '',
    rarity: '',
    value: '',
    admin_price_override: '',
    admin_override_note: '',
};

const AdminCardImport = () => {
    const { token } = useAuth();

    const [query,         setQuery]         = useState('');
    const [results,       setResults]       = useState([]);
    const [searching,     setSearching]     = useState(false);
    const [searchError,   setSearchError]   = useState('');
    const [searched,      setSearched]      = useState(false);

    const [selected,      setSelected]      = useState(null);
    const [form,          setForm]          = useState(EMPTY_FORM);
    const [importing,     setImporting]     = useState(false);
    const [importError,   setImportError]   = useState('');
    const [importSuccess, setImportSuccess] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setSearchError('');
        setSearched(false);
        setSearching(true);
        setResults([]);
        setSelected(null);
        setImportError('');
        setImportSuccess(null);

        axios
            .get(`${API}/api/admin/tcgdex/search`, {
                params: { q: query.trim() },
                headers: { Authorization: `Bearer ${token}` },
            })
            .then(res => { setResults(res.data); setSearched(true); })
            .catch(err => {
                const msg = err.response?.data?.error || 'Search failed. TCGdex may be unavailable.';
                setSearchError(msg);
                setSearched(true);
            })
            .finally(() => setSearching(false));
    };

    const handleSelect = (card) => {
        setSelected(card);
        setImportError('');
        setImportSuccess(null);
        setForm({
            name:                card.name || '',
            rarity:              mapRarity(card.rarity),
            value:               '',
            admin_price_override: '',
            admin_override_note:  '',
        });
    };

    const handleImport = (e) => {
        e.preventDefault();
        if (!selected) return;
        setImportError('');
        setImporting(true);

        const payload = {
            provider_card_id: selected.provider_card_id,
            rarity:           form.rarity,
            value:            form.value,
        };
        if (form.name.trim()) payload.name = form.name.trim();
        if (form.admin_price_override !== '') payload.admin_price_override = form.admin_price_override;
        if (form.admin_override_note.trim()) payload.admin_override_note = form.admin_override_note.trim();

        axios
            .post(`${API}/api/admin/cards/import`, payload, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then(res => {
                setImportSuccess(res.data);
                setSelected(null);
                setForm(EMPTY_FORM);
            })
            .catch(err => {
                const msg = err.response?.data?.error || 'Import failed.';
                setImportError(msg);
            })
            .finally(() => setImporting(false));
    };

    const canImport = form.rarity && form.value !== '' && !importing;

    return (
        <section className="admin-page">
            <div className="packs-bg">
                <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                <img className="bg-img"  src="./imgs/image 3.png"       alt="" />
            </div>
            <div className="container">
                <div className="admin-header">
                    <div>
                        <h2>Card Import</h2>
                        <p className="admin-subtitle">
                            Search TCGdex and import cards into the catalog
                        </p>
                    </div>
                    <Link to="/admin" className="admin-back">← Admin</Link>
                </div>

                {importSuccess && (
                    <div className="admin-import-banner">
                        <span>
                            ✓ <strong>{importSuccess.name}</strong> imported successfully.
                        </span>
                        <Link to="/admin/company-inventory" className="admin-import-banner-link">
                            Set inventory →
                        </Link>
                    </div>
                )}

                <div className="admin-import-layout">

                    {/* ── Left panel: search + results ── */}
                    <div className="admin-import-left">
                        <form className="admin-import-search-row" onSubmit={handleSearch}>
                            <input
                                className="admin-search admin-import-search-input"
                                type="text"
                                placeholder="Search TCGdex by card name…"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="admin-btn-primary"
                                disabled={searching || !query.trim()}
                            >
                                {searching ? 'Searching…' : 'Search'}
                            </button>
                        </form>

                        {searchError && <p className="admin-error">{searchError}</p>}

                        {searched && !searching && results.length === 0 && !searchError && (
                            <p className="admin-empty">No results for "{query}". Try a different name.</p>
                        )}

                        <div className="admin-import-results">
                            {results.map(card => (
                                <button
                                    key={card.provider_card_id}
                                    type="button"
                                    className={`admin-import-result-row${
                                        selected?.provider_card_id === card.provider_card_id
                                            ? ' admin-import-result-active'
                                            : ''
                                    }`}
                                    onClick={() => handleSelect(card)}
                                >
                                    {card.image_url && (
                                        <img
                                            className="admin-import-result-thumb"
                                            src={card.image_url}
                                            alt={card.name}
                                        />
                                    )}
                                    <div className="admin-import-result-info">
                                        <span className="admin-import-result-name">{card.name}</span>
                                        <span className="admin-import-result-meta">
                                            {card.set_code ? `${card.set_code} · ` : ''}{card.rarity || '—'}
                                        </span>
                                    </div>
                                    {card.market_price != null && (
                                        <span className="admin-import-result-price">
                                            {card.market_price_currency === 'USD' ? '$' : '€'}
                                            {card.market_price.toFixed(2)}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Right panel: preview + import form ── */}
                    <div className="admin-import-right">
                        {!selected && (
                            <div className="admin-import-empty-state">
                                <p>Select a card from search results to preview and import.</p>
                            </div>
                        )}

                        {selected && (
                            <form className="admin-import-form" onSubmit={handleImport}>

                                {/* Card image */}
                                {selected.image_url && (
                                    <div className="admin-import-preview-img-wrap">
                                        <img
                                            className="admin-import-preview-img"
                                            src={selected.image_url}
                                            alt={selected.name}
                                        />
                                    </div>
                                )}

                                {/* Read-only provider metadata */}
                                <div className="admin-import-meta">
                                    <div className="admin-import-meta-row">
                                        <span className="admin-import-meta-label">TCGdex ID</span>
                                        <span className="admin-import-meta-value">{selected.provider_card_id}</span>
                                    </div>
                                    {selected.set_name && (
                                        <div className="admin-import-meta-row">
                                            <span className="admin-import-meta-label">Set</span>
                                            <span className="admin-import-meta-value">{selected.set_name}</span>
                                        </div>
                                    )}
                                    {selected.rarity && (
                                        <div className="admin-import-meta-row">
                                            <span className="admin-import-meta-label">TCGdex Rarity</span>
                                            <span className="admin-import-meta-value">{selected.rarity}</span>
                                        </div>
                                    )}
                                    {selected.tcgplayer_price_usd != null && (
                                        <div className="admin-import-meta-row">
                                            <span className="admin-import-meta-label">TCGplayer</span>
                                            <span className="admin-import-meta-value admin-credits">
                                                ${selected.tcgplayer_price_usd.toFixed(2)} USD
                                            </span>
                                        </div>
                                    )}
                                    {selected.cardmarket_price_eur != null && (
                                        <div className="admin-import-meta-row">
                                            <span className="admin-import-meta-label">Cardmarket</span>
                                            <span className="admin-import-meta-value admin-credits">
                                                €{selected.cardmarket_price_eur.toFixed(2)} EUR
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Admin-editable fields */}
                                <div className="admin-import-fields">

                                    <label className="admin-import-field">
                                        <span className="admin-import-field-label">Name</span>
                                        <input
                                            className="admin-input"
                                            type="text"
                                            value={form.name}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            placeholder="Override card name (optional)"
                                        />
                                    </label>

                                    <label className="admin-import-field">
                                        <span className="admin-import-field-label">
                                            Rarity <span className="admin-import-required">*</span>
                                        </span>
                                        <select
                                            className="admin-select"
                                            value={form.rarity}
                                            onChange={e => setForm(f => ({ ...f, rarity: e.target.value }))}
                                            required
                                        >
                                            <option value="">— select rarity —</option>
                                            {RARITY_OPTIONS.map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="admin-import-field">
                                        <span className="admin-import-field-label">
                                            Gameplay Value (credits){' '}
                                            <span className="admin-import-required">*</span>
                                        </span>
                                        <input
                                            className="admin-input"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.value}
                                            onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                                            placeholder="e.g. 25.00"
                                            required
                                        />
                                        <span className="admin-import-hint">
                                            Sets the gameplay credit value. Not overridden by market prices.
                                        </span>
                                    </label>

                                    <label className="admin-import-field">
                                        <span className="admin-import-field-label">Admin Price Override</span>
                                        <input
                                            className="admin-input"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.admin_price_override}
                                            onChange={e => setForm(f => ({ ...f, admin_price_override: e.target.value }))}
                                            placeholder="Optional — overrides market price display"
                                        />
                                    </label>

                                    <label className="admin-import-field">
                                        <span className="admin-import-field-label">Override Note</span>
                                        <input
                                            className="admin-input"
                                            type="text"
                                            value={form.admin_override_note}
                                            onChange={e => setForm(f => ({ ...f, admin_override_note: e.target.value }))}
                                            placeholder="Optional — reason for override"
                                        />
                                    </label>
                                </div>

                                {importError && <p className="admin-error">{importError}</p>}

                                <button
                                    type="submit"
                                    className="admin-btn-primary admin-import-submit"
                                    disabled={!canImport}
                                >
                                    {importing ? 'Importing…' : 'Import Card'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AdminCardImport;
