import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../api';
import './Trade.css';

const RARITY_LABEL = {
    ultra_rare: 'Ultra Rare',
    rare:       'Rare',
    uncommon:   'Uncommon',
    common:     'Common',
};

const Trade = () => {
    const { token } = useAuth();

    const [inventory,        setInventory]        = useState([]);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [inventoryError,   setInventoryError]   = useState('');

    const [offeredCard,         setOfferedCard]         = useState(null);
    const [eligibleCards,       setEligibleCards]       = useState([]);
    const [eligibleLoading,     setEligibleLoading]     = useState(false);
    const [eligibleError,       setEligibleError]       = useState('');
    const [selectedReplacement, setSelectedReplacement] = useState(null);

    const [showConfirm, setShowConfirm] = useState(false);
    const [confirming,  setConfirming]  = useState(false);
    const [error,       setError]       = useState('');
    const [success,     setSuccess]     = useState('');

    const [invSearch,  setInvSearch]  = useState('');
    const [eligSearch, setEligSearch] = useState('');

    useEffect(() => {
        setInventoryLoading(true);
        axios
            .get(`${API}/api/inventory`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setInventory(res.data))
            .catch(() => setInventoryError('Failed to load inventory.'))
            .finally(() => setInventoryLoading(false));
    }, [token]);

    useEffect(() => {
        if (!offeredCard) { setEligibleCards([]); return; }
        setEligibleLoading(true);
        setEligibleError('');
        setSelectedReplacement(null);
        axios
            .get(`${API}/api/exchange/eligible?offered_card_id=${offeredCard.card_id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then(res => setEligibleCards(res.data))
            .catch(() => setEligibleError('Failed to load eligible cards.'))
            .finally(() => setEligibleLoading(false));
    }, [offeredCard, token]);

    const handleSelectOffered = (card) => {
        if (offeredCard?.card_id === card.card_id) {
            setOfferedCard(null);
            setSelectedReplacement(null);
        } else {
            setOfferedCard(card);
            setSelectedReplacement(null);
            setError('');
            setSuccess('');
        }
    };

    const handleSelectReplacement = (card) => {
        setSelectedReplacement(prev =>
            prev?.card_id === card.card_id ? null : card
        );
        setError('');
    };

    const handleConfirm = () => {
        setError('');
        setConfirming(true);
        axios
            .post(
                `${API}/api/exchange/confirm`,
                {
                    offered_card_id:     offeredCard.card_id,
                    replacement_card_id: selectedReplacement.card_id,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            .then(() => {
                setSuccess(`Traded ${offeredCard.name} for ${selectedReplacement.name}!`);
                setShowConfirm(false);
                setOfferedCard(null);
                setSelectedReplacement(null);
                setEligibleCards([]);
                axios
                    .get(`${API}/api/inventory`, { headers: { Authorization: `Bearer ${token}` } })
                    .then(res => setInventory(res.data))
                    .catch(() => {});
            })
            .catch(err => {
                setError(err.response?.data?.error || 'Exchange failed. Please try again.');
                setShowConfirm(false);
            })
            .finally(() => setConfirming(false));
    };

    const filteredInventory = inventory.filter(c =>
        c.name.toLowerCase().includes(invSearch.toLowerCase())
    );

    const filteredEligible = eligibleCards.filter(c =>
        c.name.toLowerCase().includes(eligSearch.toLowerCase())
    );

    return (
        <>
            <section className="trade">
                <div className="packs-bg">
                    <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                    <img className="bg-img"  src="./imgs/image 3.png"       alt="" />
                </div>

                <div className="container">
                    <h2 className="text-center" data-aos="fade-down">Trade-In Exchange</h2>
                    <p className="text-center trade-subtitle" data-aos="fade-up">
                        Select a card you own, then choose a replacement of equal or lesser value.
                    </p>

                    {success && (
                        <div className="trade-alert trade-alert-success" data-aos="fade-down">
                            {success}
                        </div>
                    )}
                    {error && (
                        <div className="trade-alert trade-alert-error">{error}</div>
                    )}

                    <div className="row mt-5 pt-3 align-items-center">
                        {/* Offered card slot */}
                        <div className="col-md-4" data-aos="fade-right">
                            <p className="text-center trade-col-label">YOUR CARD</p>
                            <div className={`select-box d-flex justify-content-center align-items-center${offeredCard ? ' select-box--filled' : ''}`}>
                                {offeredCard ? (
                                    <div className="trade-selected-card">
                                        <img src={offeredCard.image_url} alt={offeredCard.name} />
                                        <p className="trade-card-name">{offeredCard.name}</p>
                                        <p className="trade-card-rarity">{RARITY_LABEL[offeredCard.rarity] || offeredCard.rarity}</p>
                                        <p className="trade-card-value">${Number(offeredCard.value).toFixed(2)}</p>
                                        <button className="trade-deselect-btn" onClick={() => handleSelectOffered(offeredCard)}>
                                            ✕ Change
                                        </button>
                                    </div>
                                ) : (
                                    <div className="box-content">
                                        <div className="plus-icon">+</div>
                                        <p>Select a card from your inventory below</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Center arrow + action */}
                        <div className="col-md-4 text-center" data-aos="fade-up">
                            <div className="up-meter mt-5">
                                <img src="./imgs/Group 40106.png" width="100%" alt="" />
                            </div>
                            {offeredCard && selectedReplacement ? (
                                <button
                                    className="trade-btn"
                                    onClick={() => setShowConfirm(true)}
                                    disabled={confirming}
                                >
                                    Confirm Trade
                                </button>
                            ) : (
                                <button className="trade-btn" disabled style={{ opacity: 0.4 }}>
                                    {!offeredCard ? 'Select Your Card' : 'Select Replacement'}
                                </button>
                            )}
                        </div>

                        {/* Replacement slot */}
                        <div className="col-md-4" data-aos="fade-left">
                            <p className="text-center trade-col-label">REPLACEMENT</p>
                            <div className={`select-box d-flex justify-content-center align-items-center${selectedReplacement ? ' select-box--filled' : ''}`}>
                                {selectedReplacement ? (
                                    <div className="trade-selected-card">
                                        <img src={selectedReplacement.image_url} alt={selectedReplacement.name} />
                                        <p className="trade-card-name">{selectedReplacement.name}</p>
                                        <p className="trade-card-rarity">{RARITY_LABEL[selectedReplacement.rarity] || selectedReplacement.rarity}</p>
                                        <p className="trade-card-value">${Number(selectedReplacement.value).toFixed(2)}</p>
                                        <button className="trade-deselect-btn" onClick={() => setSelectedReplacement(null)}>
                                            ✕ Change
                                        </button>
                                    </div>
                                ) : (
                                    <div className="box-content">
                                        <div className="plus-icon">+</div>
                                        <p>{offeredCard ? 'Select a replacement below' : 'Choose your card first'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* INVENTORY SECTION */}
            <section className="ideal-card-wrap">
                <div className="container">
                    <div className="ideal-card-container">
                        <div className="search-container w-100" data-aos="zoom-in">
                            <div className="d-flex flex-wrap flex-sm-nowrap align-items-center justify-content-between">
                                <p className="trade-section-label">YOUR INVENTORY — select to offer</p>
                                <input
                                    type="text"
                                    placeholder="Search cards..."
                                    value={invSearch}
                                    onChange={e => setInvSearch(e.target.value)}
                                    className="trade-search-input"
                                />
                            </div>
                        </div>

                        <div className="trade-card-grid px-4 py-4">
                            {inventoryLoading && <p className="trade-loading">Loading inventory...</p>}
                            {inventoryError   && <p className="trade-error">{inventoryError}</p>}
                            {!inventoryLoading && !inventoryError && filteredInventory.length === 0 && (
                                <p className="trade-empty">
                                    {invSearch ? 'No cards match your search.' : 'Your inventory is empty.'}
                                </p>
                            )}
                            {filteredInventory.map(card => (
                                <div
                                    key={card.card_id}
                                    className={`trade-inv-card${offeredCard?.card_id === card.card_id ? ' trade-inv-card--selected' : ''}`}
                                    onClick={() => handleSelectOffered(card)}
                                >
                                    <div className="trade-inv-card-img">
                                        <img src={card.image_url} alt={card.name} />
                                        {card.quantity > 1 && (
                                            <span className="trade-qty-badge">×{card.quantity}</span>
                                        )}
                                    </div>
                                    <p className="trade-inv-card-name">{card.name}</p>
                                    <p className="trade-inv-card-value">${Number(card.value).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ELIGIBLE REPLACEMENTS SECTION */}
            {offeredCard && (
                <section className="ideal-card-wrap">
                    <div className="container">
                        <div className="ideal-card-container">
                            <div className="search-container w-100" data-aos="zoom-in">
                                <div className="d-flex flex-wrap flex-sm-nowrap align-items-center justify-content-between">
                                    <p className="trade-section-label">
                                        AVAILABLE REPLACEMENTS — value ≤ ${Number(offeredCard.value).toFixed(2)}
                                    </p>
                                    <input
                                        type="text"
                                        placeholder="Search cards..."
                                        value={eligSearch}
                                        onChange={e => setEligSearch(e.target.value)}
                                        className="trade-search-input"
                                    />
                                </div>
                            </div>

                            <div className="trade-card-grid px-4 py-4">
                                {eligibleLoading && <p className="trade-loading">Loading eligible cards...</p>}
                                {eligibleError   && <p className="trade-error">{eligibleError}</p>}
                                {!eligibleLoading && !eligibleError && filteredEligible.length === 0 && (
                                    <p className="trade-empty">
                                        {eligSearch
                                            ? 'No cards match your search.'
                                            : 'No eligible replacement cards available for this card.'}
                                    </p>
                                )}
                                {filteredEligible.map(card => (
                                    <div
                                        key={card.card_id}
                                        className={`trade-inv-card${selectedReplacement?.card_id === card.card_id ? ' trade-inv-card--selected' : ''}`}
                                        onClick={() => handleSelectReplacement(card)}
                                    >
                                        <div className="trade-inv-card-img">
                                            <img src={card.image_url} alt={card.name} />
                                        </div>
                                        <p className="trade-inv-card-name">{card.name}</p>
                                        <p className="trade-inv-card-value">${Number(card.value).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* CONFIRM MODAL */}
            {showConfirm && offeredCard && selectedReplacement && (
                <div className="trade-modal-overlay" onClick={() => !confirming && setShowConfirm(false)}>
                    <div className="trade-modal" onClick={e => e.stopPropagation()}>
                        <h3>Confirm Trade</h3>
                        <p className="trade-modal-subtitle">This exchange cannot be undone.</p>
                        <div className="trade-modal-cards">
                            <div className="trade-modal-card">
                                <p className="trade-modal-card-label">You give</p>
                                <img src={offeredCard.image_url} alt={offeredCard.name} />
                                <p className="trade-modal-card-name">{offeredCard.name}</p>
                                <p className="trade-modal-card-value">${Number(offeredCard.value).toFixed(2)}</p>
                            </div>
                            <div className="trade-modal-arrow">→</div>
                            <div className="trade-modal-card">
                                <p className="trade-modal-card-label">You receive</p>
                                <img src={selectedReplacement.image_url} alt={selectedReplacement.name} />
                                <p className="trade-modal-card-name">{selectedReplacement.name}</p>
                                <p className="trade-modal-card-value">${Number(selectedReplacement.value).toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="trade-modal-actions">
                            <button
                                className="trade-btn"
                                onClick={handleConfirm}
                                disabled={confirming}
                            >
                                {confirming ? 'Processing...' : 'Confirm Exchange'}
                            </button>
                            <button
                                className="trade-cancel-btn"
                                onClick={() => setShowConfirm(false)}
                                disabled={confirming}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Trade;
