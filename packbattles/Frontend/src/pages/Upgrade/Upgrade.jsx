import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { FaPlus } from 'react-icons/fa6';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../api';
import StartNow from '../../components/StartNow/StartNow';
import './Upgrade.css';
import { fmtPackCoins } from '../../utils/currency';

const RARITY_LABEL = {
    ultra_rare: 'Ultra Rare',
    rare:       'Rare',
    uncommon:   'Uncommon',
    common:     'Common',
};

const WHEEL_R    = 80;
const WHEEL_CIRC = 2 * Math.PI * WHEEL_R;

const getAngleFromTop = (e, rect) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    return ((Math.atan2(dy, dx) * 180 / Math.PI) + 90 + 360) % 360;
};

const Upgrade = () => {
    const { token } = useAuth();

    // ── Card selection ──────────────────────────────────────────────────────
    const [inventory,       setInventory]       = useState([]);
    const [targets,         setTargets]         = useState([]);
    const [inputCard,       setInputCard]       = useState(null);
    const [targetCard,      setTargetCard]      = useState(null);
    const [loadingInv,      setLoadingInv]      = useState(true);
    const [loadingTgts,     setLoadingTgts]     = useState(false);

    // ── Upgrade flow ────────────────────────────────────────────────────────
    const [initiating,      setInitiating]      = useState(false);
    const [confirming,      setConfirming]      = useState(false);
    const [pendingData,     setPendingData]     = useState(null);
    const [clientSeedInput, setClientSeedInput] = useState('');
    const [result,          setResult]          = useState(null);
    const [error,           setError]           = useState('');

    // ── Wheel ───────────────────────────────────────────────────────────────
    const [winStartAngle,   setWinStartAngle]   = useState(0);
    const [isDragging,      setIsDragging]      = useState(false);
    const [dragOffset,      setDragOffset]      = useState(0);
    const [spinning,        setSpinning]        = useState(false);
    const [pointerAngle,    setPointerAngle]    = useState(0);
    const [verifyOpen,      setVerifyOpen]      = useState(false);

    const wheelRef  = useRef(null);
    const spinTimer = useRef(null);

    // ── Data loading ────────────────────────────────────────────────────────
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

    // ── Cleanup spin timer on unmount ───────────────────────────────────────
    useEffect(() => {
        return () => { if (spinTimer.current) clearTimeout(spinTimer.current); };
    }, []);

    // ── Drag: window listeners ──────────────────────────────────────────────
    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e) => {
            const rect = wheelRef.current?.getBoundingClientRect();
            if (!rect) return;
            const angle = getAngleFromTop(e, rect);
            setWinStartAngle(((angle - dragOffset) + 360) % 360);
        };
        const onUp = () => setIsDragging(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup',   onUp);
        };
    }, [isDragging, dragOffset]);

    // ── Card selection ──────────────────────────────────────────────────────
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

    const successChance = inputCard && targetCard ? inputCard.value / targetCard.value : null;
    const winArcDeg     = successChance !== null  ? successChance * 360 : 0;
    const winEndAngle   = ((winStartAngle + winArcDeg) % 360);
    const arcLength     = successChance !== null  ? successChance * WHEEL_CIRC : 0;

    // ── Wheel drag start ────────────────────────────────────────────────────
    const handleWheelMouseDown = useCallback((e) => {
        if (!successChance || spinning || result) return;
        const rect = wheelRef.current?.getBoundingClientRect();
        if (!rect) return;
        const clickAngle = getAngleFromTop(e, rect);
        setDragOffset(((clickAngle - winStartAngle) + 360) % 360);
        setIsDragging(true);
        e.preventDefault();
    }, [successChance, spinning, result, winStartAngle]);

    // ── Step 1: POST /api/upgrade/init — commit phase ───────────────────────
    const handleUpgradeClick = async () => {
        if (!inputCard || !targetCard || initiating || confirming) return;
        setInitiating(true);
        setError('');
        try {
            const body = {
                input_card_id:  inputCard.card_id,
                target_card_id: targetCard.card_id,
            };
            if (clientSeedInput.trim()) body.client_seed = clientSeedInput.trim();
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

    // ── Step 2: POST /api/upgrade/confirm — reveal + spin ───────────────────
    const handleConfirm = async () => {
        if (!pendingData || confirming) return;
        const snap     = pendingData;
        const arcStart = winStartAngle;
        setPendingData(null);
        setConfirming(true);
        setError('');
        try {
            const res = await axios.post(
                `${API}/api/upgrade/confirm`,
                { pending_id: snap.pending_id, win_start_angle: arcStart },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setConfirming(false);
            const rollAngle = res.data.roll_angle ?? 0;
            setSpinning(true);
            setPointerAngle(prev => prev + 3 * 360 + rollAngle);
            spinTimer.current = setTimeout(() => {
                setSpinning(false);
                setResult(res.data);
                axios.get(`${API}/api/inventory`, {
                    headers: { Authorization: `Bearer ${token}` },
                }).then(inv => setInventory(inv.data)).catch(() => {});
            }, 3700);
        } catch (err) {
            setConfirming(false);
            const msg = err.response?.data?.error || 'Upgrade failed. Please try again.';
            setError(msg);
        }
    };

    // ── Reset ───────────────────────────────────────────────────────────────
    const handleReset = () => {
        if (spinTimer.current) clearTimeout(spinTimer.current);
        setInputCard(null);
        setTargetCard(null);
        setTargets([]);
        setResult(null);
        setPendingData(null);
        setClientSeedInput('');
        setError('');
        setWinStartAngle(0);
        setPointerAngle(0);
        setSpinning(false);
        setVerifyOpen(false);
    };

    return (
        <>
            <section className="upgrade">
                <div className="packs-bg">
                    <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                    <img className="bg-img"  src="./imgs/image 3.png"      alt="" />
                </div>

                <div className="container">
                    <h2 className="text-center mb-5">Upgrade Room</h2>

                    {error && <p className="up-error">{error}</p>}

                    <div className="row up-layout">

                        {/* ── LEFT: input card ─────────────────────────── */}
                        <div className={result ? 'd-none' : 'col-md-4'}>
                            <p className="up-panel-label">YOUR CARD</p>
                            <div className={`select-box d-flex justify-content-center align-items-center ${inputCard ? 'select-box--filled' : ''}`}>
                                {inputCard ? (
                                    <div className="up-selected-card">
                                        {inputCard.image_url
                                            ? <img src={inputCard.image_url} alt="" className="up-selected-img" />
                                            : <div className="up-selected-img up-thumb-placeholder" />}
                                        <span className={`up-rarity up-rarity-${inputCard.rarity}`}>
                                            {RARITY_LABEL[inputCard.rarity] || inputCard.rarity}
                                        </span>
                                        <p className="up-selected-name">{inputCard.name}</p>
                                        <p className="up-selected-value">{fmtPackCoins(inputCard.value)}</p>
                                        {!result && !spinning && (
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
                            {!result && !spinning && (
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
                                            {card.image_url
                                                ? <img src={card.image_url} alt="" className="up-thumb" />
                                                : <div className="up-thumb up-thumb-placeholder" />}
                                            <div className="up-card-info">
                                                <span className={`up-rarity up-rarity-${card.rarity}`}>
                                                    {RARITY_LABEL[card.rarity] || card.rarity}
                                                </span>
                                                <p className="up-card-name">{card.name}</p>
                                            </div>
                                            <div className="up-card-meta">
                                                {card.quantity > 1 && <span className="up-qty">×{card.quantity}</span>}
                                                <span className="up-card-value">{fmtPackCoins(card.value)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── CENTER: wheel + controls ──────────────────── */}
                        <div className={result ? 'col-12 text-center' : 'col-md-4 text-center'}>
                            <div className={`up-center ${result ? 'up-center--result' : ''}`}>

                                {/* ── Wheel — always visible (frozen at final angle when result is set) ── */}
                                <div className="up-wheel-wrap">
                                    <svg
                                        ref={wheelRef}
                                        className="up-wheel"
                                        viewBox="0 0 200 200"
                                        onMouseDown={!result && !spinning && successChance !== null ? handleWheelMouseDown : undefined}
                                        style={{
                                            cursor: !result && !spinning && successChance !== null
                                                ? (isDragging ? 'grabbing' : 'grab')
                                                : 'default',
                                        }}
                                    >
                                        <defs>
                                            <linearGradient id="up-arc-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%"   stopColor="#A35BFF" />
                                                <stop offset="100%" stopColor="#4ade80" />
                                            </linearGradient>
                                        </defs>

                                        {/* Outer disc */}
                                        <circle cx="100" cy="100" r="94"
                                            fill="rgba(20,8,50,0.55)"
                                            stroke="rgba(255,255,255,0.05)"
                                            strokeWidth="1" />

                                        {/* Track ring */}
                                        <circle cx="100" cy="100" r={WHEEL_R}
                                            fill="none"
                                            stroke="rgba(255,255,255,0.07)"
                                            strokeWidth="18" />

                                        {/* Success arc */}
                                        {successChance !== null && (
                                            <g transform={`rotate(${winStartAngle - 90}, 100, 100)`}>
                                                <circle
                                                    cx="100" cy="100" r={WHEEL_R}
                                                    fill="none"
                                                    stroke="url(#up-arc-grad)"
                                                    strokeWidth="18"
                                                    strokeLinecap="butt"
                                                    strokeDasharray={`${arcLength} ${WHEEL_CIRC}`}
                                                    strokeDashoffset="0"
                                                />
                                            </g>
                                        )}

                                        {/* Empty-state dashed ring */}
                                        {successChance === null && (
                                            <circle cx="100" cy="100" r={WHEEL_R}
                                                fill="none"
                                                stroke="rgba(255,255,255,0.12)"
                                                strokeWidth="2"
                                                strokeDasharray="8 6"
                                            />
                                        )}

                                        {/* Pointer */}
                                        <g style={{
                                            transform: `rotate(${pointerAngle}deg)`,
                                            transformOrigin: '100px 100px',
                                            transition: spinning
                                                ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                                                : 'none',
                                        }}>
                                            <polygon points="100,5 94.5,22 105.5,22"
                                                fill="#ffffff" opacity="0.92" />
                                            <line x1="100" y1="22" x2="100" y2="86"
                                                stroke="rgba(255,255,255,0.6)"
                                                strokeWidth="2"
                                                strokeLinecap="round" />
                                        </g>

                                        {/* Center hub */}
                                        <circle cx="100" cy="100" r="12"
                                            fill="rgba(12,5,35,0.95)"
                                            stroke="rgba(163,91,255,0.55)"
                                            strokeWidth="1.5" />
                                    </svg>

                                    {spinning && (
                                        <p className="up-wheel-spinning-txt">Spinning…</p>
                                    )}
                                    {!spinning && !result && successChance !== null && (
                                        <p className="up-wheel-hint">Drag the arc to position your win zone</p>
                                    )}
                                </div>

                                {result ? (
                                    /* Result panel — beside the wheel on desktop, below on mobile */
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
                                        <div className="up-result-stats">
                                            <div className="up-stat">
                                                <span className="up-stat-label">Chance</span>
                                                <span className="up-stat-val">{(result.success_chance * 100).toFixed(3)}%</span>
                                            </div>
                                            <div className="up-stat">
                                                <span className="up-stat-label">Roll</span>
                                                <span className="up-stat-val up-stat-mono">{result.roll?.toFixed(8)}</span>
                                            </div>
                                            <div className="up-stat">
                                                <span className="up-stat-label">Win Zone</span>
                                                <span className="up-stat-val up-stat-mono">
                                                    {(result.win_start_angle ?? 0).toFixed(1)}°–{(((result.win_start_angle ?? 0) + (result.win_arc_degrees ?? 0)) % 360).toFixed(1)}°
                                                </span>
                                            </div>
                                            <div className="up-stat">
                                                <span className="up-stat-label">Landed</span>
                                                <span className="up-stat-val up-stat-mono">{(result.roll_angle ?? 0).toFixed(1)}°</span>
                                            </div>
                                        </div>

                                        <div className="up-verify-wrap">
                                            <button
                                                className="up-verify-toggle"
                                                onClick={() => setVerifyOpen(v => !v)}
                                            >
                                                {verifyOpen ? '▲' : '▼'}&nbsp;Verify result
                                            </button>
                                            {verifyOpen && (
                                                <div className="up-seed-section">
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
                                            )}
                                        </div>

                                        <button className="up-btn-primary" onClick={handleReset}>
                                            Try Again
                                        </button>
                                    </div>
                                ) : (
                                    /* Controls */
                                    <>
                                        {!spinning && (
                                            <>
                                                {successChance !== null ? (
                                                    <div className="up-chance-display">
                                                        <span className="up-chance-pct">
                                                            {(successChance * 100).toFixed(3)}%
                                                        </span>
                                                        <span className="up-chance-label">success chance</span>
                                                        <span className="up-zone-range">
                                                            {winStartAngle.toFixed(1)}° – {winEndAngle.toFixed(1)}°
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="up-meter-empty">
                                                        <p>{!inputCard ? 'Select a card to upgrade' : 'Select a target card'}</p>
                                                    </div>
                                                )}

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
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ── RIGHT: target card ───────────────────────── */}
                        <div className={result ? 'd-none' : 'col-md-4'}>
                            <p className="up-panel-label">TARGET CARD</p>
                            <div className={`select-box d-flex justify-content-center align-items-center ${targetCard ? 'select-box--filled' : ''}`}>
                                {targetCard ? (
                                    <div className="up-selected-card">
                                        {targetCard.image_url
                                            ? <img src={targetCard.image_url} alt="" className="up-selected-img" />
                                            : <div className="up-selected-img up-thumb-placeholder" />}
                                        <span className={`up-rarity up-rarity-${targetCard.rarity}`}>
                                            {RARITY_LABEL[targetCard.rarity] || targetCard.rarity}
                                        </span>
                                        <p className="up-selected-name">{targetCard.name}</p>
                                        <p className="up-selected-value">{fmtPackCoins(targetCard.value)}</p>
                                        {!result && !spinning && (
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
                            {!result && !spinning && inputCard && (
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
                                            {card.image_url
                                                ? <img src={card.image_url} alt="" className="up-thumb" />
                                                : <div className="up-thumb up-thumb-placeholder" />}
                                            <div className="up-card-info">
                                                <span className={`up-rarity up-rarity-${card.rarity}`}>
                                                    {RARITY_LABEL[card.rarity] || card.rarity}
                                                </span>
                                                <p className="up-card-name">{card.name}</p>
                                            </div>
                                            <div className="up-card-meta">
                                                <span className="up-chance-tag">
                                                    {(card.success_chance * 100).toFixed(3)}%
                                                </span>
                                                <span className="up-card-value">{fmtPackCoins(card.value)}</span>
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
                                <p className="up-modal-card-val">{fmtPackCoins(pendingData.input_value)}</p>
                            </div>
                            <div className="up-modal-arrow">→</div>
                            <div className="up-modal-side">
                                <p className="up-modal-side-label">Target</p>
                                <p className="up-modal-card-name">{pendingData.target_card_name}</p>
                                <p className="up-modal-card-val">{fmtPackCoins(pendingData.target_value)}</p>
                            </div>
                        </div>
                        <p className="up-modal-chance">
                            Success chance: <strong>{(pendingData.success_chance * 100).toFixed(3)}%</strong>
                            &nbsp;·&nbsp; Win zone from <strong>{winStartAngle.toFixed(1)}°</strong>
                        </p>

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
