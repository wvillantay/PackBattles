import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { FaPlus } from 'react-icons/fa6';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../api';
import StartNow from '../../components/StartNow/StartNow';
import './Upgrade.css';

const RARITY_LABEL = {
    ultra_rare: 'Ultra Rare',
    rare:       'Rare',
    uncommon:   'Uncommon',
    common:     'Common',
};

const Upgrade = () => {
    const { token } = useAuth();

    const [inventory,    setInventory]    = useState([]);
    const [targets,      setTargets]      = useState([]);
    const [inputCard,    setInputCard]    = useState(null);
    const [targetCard,   setTargetCard]   = useState(null);
    const [loadingInv,   setLoadingInv]   = useState(true);
    const [loadingTgts,  setLoadingTgts]  = useState(false);
    const [confirming,   setConfirming]   = useState(false);
    const [showModal,    setShowModal]    = useState(false);
    const [result,       setResult]       = useState(null); // { ok, result, input_card_name, target_card_name, success_chance }
    const [error,        setError]        = useState('');

    // Load user inventory on mount
    useEffect(() => {
        setLoadingInv(true);
        axios
            .get(`${API}/api/inventory`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setInventory(res.data))
            .catch(() => setError('Failed to load inventory.'))
            .finally(() => setLoadingInv(false));
    }, [token]);

    // Load eligible targets whenever input card changes
    useEffect(() => {
        if (!inputCard) { setTargets([]); setTargetCard(null); return; }
        setLoadingTgts(true);
        setTargetCard(null);
        setError('');
        axios
            .get(`${API}/api/upgrade/targets?input_card_id=${inputCard.card_id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then(res => setTargets(res.data))
            .catch(() => setError('Failed to load upgrade targets.'))
            .finally(() => setLoadingTgts(false));
    }, [inputCard, token]);

    const selectInput = useCallback((card) => {
        if (result) return; // locked after result
        setInputCard(prev => prev?.card_id === card.card_id ? null : card);
        setError('');
        setResult(null);
    }, [result]);

    const selectTarget = useCallback((card) => {
        if (result) return;
        setTargetCard(prev => prev?.card_id === card.card_id ? null : card);
        setError('');
    }, [result]);

    const successChance = inputCard && targetCard
        ? inputCard.value / targetCard.value
        : null;

    const handleUpgradeClick = () => {
        if (!inputCard || !targetCard || confirming) return;
        setShowModal(true);
    };

    const handleConfirm = async () => {
        if (!inputCard || !targetCard) return;
        setShowModal(false);
        setConfirming(true);
        setError('');
        try {
            const res = await axios.post(
                `${API}/api/upgrade/confirm`,
                { input_card_id: inputCard.card_id, target_card_id: targetCard.card_id },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setResult(res.data);
            // Refresh inventory so quantities are accurate
            const inv = await axios.get(`${API}/api/inventory`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setInventory(inv.data);
        } catch (err) {
            const msg = err.response?.data?.error || 'Upgrade failed. Please try again.';
            setError(msg);
        } finally {
            setConfirming(false);
        }
    };

    const handleReset = () => {
        setInputCard(null);
        setTargetCard(null);
        setTargets([]);
        setResult(null);
        setError('');
    };

    const chancePercent = successChance !== null
        ? Math.round(successChance * 100)
        : null;

    return (
        <>
            <section className="upgrade">
                {/* Background */}
                <div className="packs-bg">
                    <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                    <img className="bg-img"  src="./imgs/image 3.png"      alt="" />
                </div>

                <div className="container">
                    <h2 className="text-center mb-5">Upgrade Room</h2>

                    {error && <p className="up-error">{error}</p>}

                    <div className="row up-layout">

                        {/* ── LEFT: input card selection ── */}
                        <div className="col-md-4">
                            <p className="up-panel-label">YOUR CARD</p>

                            {/* Selected slot */}
                            <div className={`select-box d-flex justify-content-center align-items-center ${inputCard ? 'select-box--filled' : ''}`}>
                                {inputCard ? (
                                    <div className="up-selected-card">
                                        <span className={`up-rarity up-rarity-${inputCard.rarity}`}>
                                            {RARITY_LABEL[inputCard.rarity] || inputCard.rarity}
                                        </span>
                                        <p className="up-selected-name">{inputCard.name}</p>
                                        <p className="up-selected-value">${inputCard.value.toFixed(2)}</p>
                                        {!result && (
                                            <button className="up-deselect" onClick={() => setInputCard(null)}>
                                                ✕ Change
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="box-content">
                                        <div className="plus-icon"><FaPlus /></div>
                                        <p>Select a card from your inventory</p>
                                    </div>
                                )}
                            </div>

                            {/* Inventory list */}
                            {!result && (
                                <div className="up-card-list">
                                    {loadingInv && <p className="up-hint">Loading inventory…</p>}
                                    {!loadingInv && inventory.length === 0 && (
                                        <p className="up-hint">You have no cards to upgrade.</p>
                                    )}
                                    {!loadingInv && inventory.map(card => (
                                        <div
                                            key={card.card_id}
                                            className={`up-card-item ${inputCard?.card_id === card.card_id ? 'up-card-item--selected' : ''}`}
                                            onClick={() => selectInput(card)}
                                        >
                                            <div className="up-card-info">
                                                <span className={`up-rarity up-rarity-${card.rarity}`}>
                                                    {RARITY_LABEL[card.rarity] || card.rarity}
                                                </span>
                                                <p className="up-card-name">{card.name}</p>
                                            </div>
                                            <div className="up-card-meta">
                                                {card.quantity > 1 && (
                                                    <span className="up-qty">×{card.quantity}</span>
                                                )}
                                                <span className="up-card-value">${card.value.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── CENTER: chance + action ── */}
                        <div className="col-md-4 text-center">
                            <div className="up-center">
                                {result ? (
                                    /* Result overlay */
                                    <div className={`up-result up-result--${result.result}`}>
                                        <p className="up-result-label">
                                            {result.result === 'success' ? 'SUCCESS' : 'FAILED'}
                                        </p>
                                        {result.result === 'success' ? (
                                            <>
                                                <p className="up-result-msg">You received</p>
                                                <p className="up-result-card">{result.target_card_name}</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="up-result-msg">You lost</p>
                                                <p className="up-result-card">{result.input_card_name}</p>
                                            </>
                                        )}
                                        <p className="up-result-chance">
                                            Chance was {Math.round(result.success_chance * 100)}%
                                        </p>
                                        <button className="up-btn-primary" onClick={handleReset}>
                                            Try Again
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Chance meter */}
                                        <div className="up-meter">
                                            {chancePercent !== null ? (
                                                <>
                                                    <svg className="up-meter-ring" viewBox="0 0 120 120">
                                                        <defs>
                                                            <linearGradient id="up-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                                <stop offset="0%"   stopColor="#A35BFF" />
                                                                <stop offset="100%" stopColor="#4ade80" />
                                                            </linearGradient>
                                                        </defs>
                                                        <circle cx="60" cy="60" r="50"
                                                            className="up-meter-track" />
                                                        <circle cx="60" cy="60" r="50"
                                                            className="up-meter-fill"
                                                            strokeDasharray={`${chancePercent * 3.14159} 314.159`}
                                                            strokeDashoffset="0"
                                                        />
                                                    </svg>
                                                    <div className="up-meter-text">
                                                        <span className="up-chance-pct">{chancePercent}%</span>
                                                        <span className="up-chance-label">success chance</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="up-meter-empty">
                                                    <p>{!inputCard ? 'Select a card to upgrade' : 'Select a target card'}</p>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            className="up-btn-primary up-upgrade-btn"
                                            disabled={!inputCard || !targetCard || confirming}
                                            onClick={handleUpgradeClick}
                                        >
                                            {confirming ? 'Upgrading…' : 'Upgrade'}
                                        </button>
                                        {inputCard && targetCard && (
                                            <p className="up-hint up-hint--center">
                                                You will lose <strong>{inputCard.name}</strong> regardless of outcome.
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ── RIGHT: target card selection ── */}
                        <div className="col-md-4">
                            <p className="up-panel-label">TARGET CARD</p>

                            {/* Selected slot */}
                            <div className={`select-box d-flex justify-content-center align-items-center ${targetCard ? 'select-box--filled' : ''}`}>
                                {targetCard ? (
                                    <div className="up-selected-card">
                                        <span className={`up-rarity up-rarity-${targetCard.rarity}`}>
                                            {RARITY_LABEL[targetCard.rarity] || targetCard.rarity}
                                        </span>
                                        <p className="up-selected-name">{targetCard.name}</p>
                                        <p className="up-selected-value">${targetCard.value.toFixed(2)}</p>
                                        {!result && (
                                            <button className="up-deselect" onClick={() => setTargetCard(null)}>
                                                ✕ Change
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="box-content">
                                        <div className="plus-icon"><FaPlus /></div>
                                        <p>{inputCard ? 'Select a target card' : 'Choose your card first'}</p>
                                    </div>
                                )}
                            </div>

                            {/* Target list */}
                            {!result && inputCard && (
                                <div className="up-card-list">
                                    {loadingTgts && <p className="up-hint">Loading targets…</p>}
                                    {!loadingTgts && targets.length === 0 && (
                                        <p className="up-hint">No upgrade targets available for this card.</p>
                                    )}
                                    {!loadingTgts && targets.map(card => (
                                        <div
                                            key={card.card_id}
                                            className={`up-card-item ${targetCard?.card_id === card.card_id ? 'up-card-item--selected' : ''}`}
                                            onClick={() => selectTarget(card)}
                                        >
                                            <div className="up-card-info">
                                                <span className={`up-rarity up-rarity-${card.rarity}`}>
                                                    {RARITY_LABEL[card.rarity] || card.rarity}
                                                </span>
                                                <p className="up-card-name">{card.name}</p>
                                            </div>
                                            <div className="up-card-meta">
                                                <span className="up-chance-tag">
                                                    {Math.round(card.success_chance * 100)}%
                                                </span>
                                                <span className="up-card-value">${card.value.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </section>

            {/* Confirmation modal */}
            {showModal && inputCard && targetCard && (
                <div className="up-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="up-modal" onClick={e => e.stopPropagation()}>
                        <h3>Confirm Upgrade</h3>
                        <p className="up-modal-warn">This upgrade cannot be undone.</p>
                        <div className="up-modal-cards">
                            <div className="up-modal-side">
                                <p className="up-modal-side-label">You risk</p>
                                <p className="up-modal-card-name">{inputCard.name}</p>
                                <p className="up-modal-card-val">${inputCard.value.toFixed(2)}</p>
                            </div>
                            <div className="up-modal-arrow">→</div>
                            <div className="up-modal-side">
                                <p className="up-modal-side-label">Target</p>
                                <p className="up-modal-card-name">{targetCard.name}</p>
                                <p className="up-modal-card-val">${targetCard.value.toFixed(2)}</p>
                            </div>
                        </div>
                        <p className="up-modal-chance">
                            Success chance: <strong>{chancePercent}%</strong>
                        </p>
                        <p className="up-modal-note">
                            Your card is removed win or lose.
                        </p>
                        <div className="up-modal-actions">
                            <button className="up-btn-secondary" onClick={() => setShowModal(false)}>
                                Cancel
                            </button>
                            <button className="up-btn-primary" onClick={handleConfirm}>
                                Confirm Upgrade
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <StartNow />
        </>
    );
};

export default Upgrade;
