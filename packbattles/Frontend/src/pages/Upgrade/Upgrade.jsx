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

    const [inventory,       setInventory]       = useState([]);
    const [targets,         setTargets]         = useState([]);
    const [inputCard,       setInputCard]       = useState(null);
    const [targetCard,      setTargetCard]      = useState(null);
    const [loadingInv,      setLoadingInv]      = useState(true);
    const [loadingTgts,     setLoadingTgts]     = useState(false);
    const [initiating,      setInitiating]      = useState(false);
    const [confirming,      setConfirming]      = useState(false);
    const [pendingData,     setPendingData]     = useState(null);
    const [clientSeedInput, setClientSeedInput] = useState('');
    const [result,          setResult]          = useState(null);
    const [error,           setError]           = useState('');

    useEffect(() => {
        setLoadingInv(true);
        axios
            .get(`${API}/api/inventory`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setInventory(res.data))
            .catch(() => setError('Failed to load inventory.'))
            .finally(() => setLoadingInv(false));
    }, [token]);

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
        if (result) return;
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

    const chancePercent = successChance !== null
        ? Math.round(successChance * 100)
        : null;

    // Step 1: POST /api/upgrade/init — commit phase
    const handleUpgradeClick = async () => {
        if (!inputCard || !targetCard || initiating || confirming) return;
        setInitiating(true);
        setError('');
        try {
            const body = {
                input_card_id:  inputCard.card_id,
                target_card_id: targetCard.card_id,
            };
            if (clientSeedInput.trim()) {
                body.client_seed = clientSeedInput.trim();
            }
            const res = await axios.post(
                `${API}/api/upgrade/init`,
                body,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setPendingData(res.data);
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to initiate upgrade. Please try again.';
            setError(msg);
        } finally {
            setInitiating(false);
        }
    };

    // Step 2: POST /api/upgrade/confirm — reveal + execute phase
    const handleConfirm = async () => {
        if (!pendingData || confirming) return;
        const snap = pendingData;
        setPendingData(null);
        setConfirming(true);
        setError('');
        try {
            const res = await axios.post(
                `${API}/api/upgrade/confirm`,
                { pending_id: snap.pending_id },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setResult(res.data);
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
        setPendingData(null);
        setClientSeedInput('');
        setError('');
    };

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
                                            &nbsp;·&nbsp; Roll: {result.roll?.toFixed(8)}
                                        </p>

                                        {/* Provably fair verification */}
                                        <div className="up-seed-section">
                                            <p className="up-seed-title">Provably Fair Verification</p>
                                            <div className="up-seed-row">
                                                <span className="up-seed-label">Server Seed</span>
                                                <span className="up-seed-value up-seed-mono">{result.server_seed}</span>
                                            </div>
                                            <div className="up-seed-row">
                                                <span className="up-seed-label">Server Hash</span>
                                                <span className="up-seed-value up-seed-mono">{result.server_seed_hash}</span>
                                            </div>
                                            <div className="up-seed-row">
                                                <span className="up-seed-label">Client Seed</span>
                                                <span className="up-seed-value up-seed-mono">{result.client_seed}</span>
                                            </div>
                                            <div className="up-seed-row">
                                                <span className="up-seed-label">Nonce</span>
                                                <span className="up-seed-value">{result.nonce}</span>
                                            </div>
                                            <p className="up-seed-formula">
                                                SHA256(server_seed:client_seed:nonce)[:8] / 0x100000000
                                            </p>
                                        </div>

                                        <button className="up-btn-primary" onClick={handleReset}>
                                            Try Again
                                        </button>
                                    </div>
                                ) : (
                                    <>
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

                                        {inputCard && targetCard && (
                                            <div className="up-client-seed-wrap">
                                                <label className="up-client-seed-label" htmlFor="up-client-seed">
                                                    Client seed <span>(optional)</span>
                                                </label>
                                                <input
                                                    id="up-client-seed"
                                                    className="up-client-seed-input"
                                                    type="text"
                                                    placeholder="auto-generated"
                                                    maxLength={128}
                                                    value={clientSeedInput}
                                                    onChange={e => setClientSeedInput(e.target.value)}
                                                />
                                            </div>
                                        )}

                                        <button
                                            className="up-btn-primary up-upgrade-btn"
                                            disabled={!inputCard || !targetCard || initiating || confirming}
                                            onClick={handleUpgradeClick}
                                        >
                                            {initiating ? 'Preparing…' : confirming ? 'Upgrading…' : 'Upgrade'}
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

            {/* Confirmation modal — shown after /init succeeds */}
            {pendingData && (
                <div className="up-modal-overlay" onClick={() => setPendingData(null)}>
                    <div className="up-modal" onClick={e => e.stopPropagation()}>
                        <h3>Confirm Upgrade</h3>
                        <p className="up-modal-warn">This upgrade cannot be undone.</p>
                        <div className="up-modal-cards">
                            <div className="up-modal-side">
                                <p className="up-modal-side-label">You risk</p>
                                <p className="up-modal-card-name">{pendingData.input_card_name}</p>
                                <p className="up-modal-card-val">${pendingData.input_value?.toFixed(2)}</p>
                            </div>
                            <div className="up-modal-arrow">→</div>
                            <div className="up-modal-side">
                                <p className="up-modal-side-label">Target</p>
                                <p className="up-modal-card-name">{pendingData.target_card_name}</p>
                                <p className="up-modal-card-val">${pendingData.target_value?.toFixed(2)}</p>
                            </div>
                        </div>
                        <p className="up-modal-chance">
                            Success chance: <strong>{Math.round(pendingData.success_chance * 100)}%</strong>
                        </p>

                        {/* Provably fair hash commitment */}
                        <div className="up-modal-hash-wrap">
                            <p className="up-modal-hash-label">Server Seed Hash (SHA256)</p>
                            <p className="up-modal-hash-value">{pendingData.server_seed_hash}</p>
                            <p className="up-modal-hash-note">
                                The server pre-committed to this outcome before you confirmed.
                            </p>
                            <p className="up-modal-hash-sub">
                                Client seed:&nbsp;
                                <span className="up-mono">{pendingData.client_seed}</span>
                                &nbsp;·&nbsp;Nonce: {pendingData.nonce}
                            </p>
                        </div>

                        <p className="up-modal-note">Your card is removed win or lose.</p>
                        <div className="up-modal-actions">
                            <button className="up-btn-secondary" onClick={() => setPendingData(null)}>
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
