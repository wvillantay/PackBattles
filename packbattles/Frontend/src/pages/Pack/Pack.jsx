import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import OwlCarousel from 'react-owl-carousel';
import 'owl.carousel/dist/assets/owl.carousel.css';
import 'owl.carousel/dist/assets/owl.theme.default.css';

import { useAuth } from '../../context/AuthContext';
import StartNow from '../../components/StartNow/StartNow';
import './Pack.css';

import { API } from '../../api';
import { fmtPackCoins } from '../../utils/currency';

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

const carouselOptions = {
    loop: true,
    margin: 20,
    nav: true,
    dots: false,
    responsive: {
        0:   { items: 1 },
        576: { items: 2 },
        992: { items: 3 },
    },
};

const TEAR_THRESHOLD = 75; // px of upward drag needed to complete the pack tear

// Spin one slot fast→medium→slow, pause on real card, then land.
// setSlots uses the functional updater so no stale-closure issues.
// isActive() returns false when Skip Reveal is triggered — causes the spin to abort cleanly.
const spinSlot = (slotIndex, realCard, poolCards, setSlots, isActive = () => true) => {
    return new Promise(resolve => {
        const rand = () => poolCards[Math.floor(Math.random() * poolCards.length)];

        const phases = [
            { count: 6, ms: 65  },
            { count: 5, ms: 115 },
            { count: 4, ms: 185 },
        ];

        let phaseIdx     = 0;
        let frameInPhase = 0;

        const update = (displayCard, state, frameDelta) => {
            if (!isActive()) return;
            setSlots(prev => {
                const next = [...prev];
                next[slotIndex] = {
                    state,
                    displayCard,
                    frame: next[slotIndex].frame + (frameDelta ?? 1),
                };
                return next;
            });
        };

        update(rand(), 'spinning', 1);

        const tick = () => {
            if (!isActive()) { resolve(); return; }

            frameInPhase++;

            if (frameInPhase >= phases[phaseIdx].count) {
                phaseIdx++;
                frameInPhase = 0;

                if (phaseIdx >= phases.length) {
                    // Dramatic pause showing real card still spinning
                    update(realCard, 'spinning', 1);
                    setTimeout(() => {
                        if (!isActive()) { resolve(); return; }
                        update(realCard, 'landed', 0);
                        setTimeout(resolve, 320);
                    }, 210);
                    return;
                }
            }

            update(rand(), 'spinning', 1);
            setTimeout(tick, phases[phaseIdx].ms);
        };

        setTimeout(tick, phases[0].ms);
    });
};

const Pack = () => {
    const { token, user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const packId = searchParams.get('id');

    const [pack,      setPack]      = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState('');
    const [openError, setOpenError] = useState('');
    const [result,    setResult]    = useState(null);

    // Animation phases: 'idle' | 'opening' | 'torn' | 'revealing' | 'done'
    const [animPhase, setAnimPhase] = useState('idle');
    // Each slot: { state: 'waiting'|'spinning'|'landed', displayCard: null|cardObj, frame: 0 }
    const [slots,         setSlots]         = useState([]);
    const [packImgFailed, setPackImgFailed] = useState(false);
    // null = API not yet returned (neutral glow); string = highest rarity from actual pulled result
    const [resultRarity,  setResultRarity]  = useState(null);

    // Refs for drag coordination — avoid React re-renders on every pointermove
    const flapRef        = useRef(null);
    const lightLeakRef   = useRef(null);
    const isDraggingRef  = useRef(false);
    const startYRef      = useRef(0);
    const apiResolveRef  = useRef(null);  // resolves apiPromise when API returns
    const tearResolveRef = useRef(null);  // resolves tearPromise when drag completes
    const skipRevealRef  = useRef(false); // set true by Skip Reveal to abort in-progress roulette
    const resultRef      = useRef(null);  // stores API result so skip handler can access it
    const sceneRef       = useRef(null);  // for setting --open-progress CSS custom property

    useEffect(() => {
        if (!packId) {
            navigate('/packs');
            return;
        }
        axios
            .get(`${API}/api/packs/${packId}`)
            .then((res) => setPack(res.data))
            .catch(() => setError('Failed to load pack. It may not exist.'))
            .finally(() => setLoading(false));
    }, [packId]);

    // Called when drag threshold is reached or user clicks the pack.
    // Idempotent: the tearResolveRef guard prevents double-firing.
    const completeTear = () => {
        if (!tearResolveRef.current) return;
        isDraggingRef.current = false;
        if (lightLeakRef.current) {
            lightLeakRef.current.style.transition = '';
            lightLeakRef.current.style.opacity    = '1';
            lightLeakRef.current.style.transform  = 'translate(-50%, -50%) scale(1)';
        }
        if (flapRef.current) {
            flapRef.current.style.transition = '';
            flapRef.current.style.transform  = '';
        }
        sceneRef.current?.style.setProperty('--open-progress', '1');
        setAnimPhase('torn');
        tearResolveRef.current();
        tearResolveRef.current = null;
    };

    const onFlapPointerDown = (e) => {
        e.currentTarget.setPointerCapture(e.pointerId); // track drag even if pointer leaves element
        isDraggingRef.current = true;
        startYRef.current     = e.clientY;
    };

    const onFlapPointerMove = (e) => {
        if (!isDraggingRef.current) return;
        const dy       = Math.max(0, startYRef.current - e.clientY); // upward only
        const clamped  = Math.min(dy, 130);
        const progress = Math.min(clamped / TEAR_THRESHOLD, 1);

        if (flapRef.current) {
            flapRef.current.style.transform =
                `translateY(-${clamped}px) rotate(${clamped * 0.04}deg)`;
        }
        if (lightLeakRef.current) {
            lightLeakRef.current.style.opacity   = progress;
            lightLeakRef.current.style.transform =
                `translate(-50%, -50%) scale(${0.3 + progress * 0.7})`;
        }
        sceneRef.current?.style.setProperty('--open-progress', String(progress));

        if (clamped >= TEAR_THRESHOLD) {
            completeTear();
        }
    };

    const onFlapPointerUp = (e) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        const dy = Math.max(0, startYRef.current - e.clientY);

        // Tiny movement (<5 px) = treat as a tap; let the click handler complete the tear
        if (dy < 5) return;

        if (dy >= TEAR_THRESHOLD) { completeTear(); return; }

        // Partial drag released before threshold — snap the flap back
        if (flapRef.current) {
            flapRef.current.style.transition = 'transform 0.3s ease';
            flapRef.current.style.transform  = '';
            setTimeout(() => { if (flapRef.current) flapRef.current.style.transition = ''; }, 300);
        }
        if (lightLeakRef.current) {
            lightLeakRef.current.style.transition = 'opacity 0.3s, transform 0.3s';
            lightLeakRef.current.style.opacity    = '0';
            lightLeakRef.current.style.transform  = 'translate(-50%, -50%) scale(0.3)';
            setTimeout(() => { if (lightLeakRef.current) lightLeakRef.current.style.transition = ''; }, 300);
        }
        sceneRef.current?.style.setProperty('--open-progress', '0');
    };

    const handleOpen = async () => {
        setOpenError('');
        setSlots([]);
        setPackImgFailed(false);
        setResultRarity(null);
        isDraggingRef.current  = false;
        apiResolveRef.current  = null;
        tearResolveRef.current = null;
        skipRevealRef.current  = false;
        resultRef.current      = null;

        // Two promises gate the reveal: one for the API result, one for the user tearing the pack.
        // Promise.all ensures real cards are never shown until BOTH conditions are satisfied.
        const apiPromise  = new Promise(r => { apiResolveRef.current  = r; });
        const tearPromise = new Promise(r => { tearResolveRef.current = r; });

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion) {
            // Skip drag interaction — immediately open the pack and wait for the API
            setAnimPhase('torn');
            tearResolveRef.current();
            tearResolveRef.current = null;
        } else {
            setAnimPhase('opening');
        }

        axios
            .post(`${API}/api/packs/${packId}/open`, {}, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => {
                // Compute highest rarity from the actual pulled cards and apply glow immediately.
                // This updates the seam/light-leak color while the user may still be dragging.
                const RANK = { common: 0, uncommon: 1, rare: 2, ultra_rare: 3 };
                const cards = res.data.cards_received || [];
                const top = cards.reduce(
                    (best, c) => (RANK[c.rarity] ?? 0) > (RANK[best] ?? 0) ? c.rarity : best,
                    'common'
                );
                setResultRarity(top);
                apiResolveRef.current?.({ ok: true, data: res.data });
            })
            .catch(err => { apiResolveRef.current?.({ ok: false, err }); });

        const [apiResult] = await Promise.all([apiPromise, tearPromise]);

        if (!apiResult.ok) {
            setOpenError(apiResult.err?.response?.data?.error || 'Failed to open pack. Try again.');
            setAnimPhase('idle');
            return;
        }

        updateUser({ credits: apiResult.data.credits_remaining });
        resultRef.current = apiResult.data;
        setResult(apiResult.data);

        // Brief hold so ghost silhouettes are visible before the roulette mounts
        await new Promise(r => setTimeout(r, 600));

        const cards     = apiResult.data.cards_received;
        const poolCards = (pack?.pool?.length > 0)
            ? pack.pool.map(e => e.card)
            : cards;

        setSlots(cards.map(() => ({ state: 'waiting', displayCard: null, frame: 0 })));
        setAnimPhase('revealing');

        for (let i = 0; i < cards.length; i++) {
            if (skipRevealRef.current) break;
            await spinSlot(i, cards[i], poolCards, setSlots, () => !skipRevealRef.current);
            if (skipRevealRef.current) break;
            if (i < cards.length - 1) {
                await new Promise(r => setTimeout(r, 140));
            }
        }

        // Skip handler may have already set 'done' and landed all cards
        if (!skipRevealRef.current) {
            setAnimPhase('done');
        }
    };

    // Instantly settles all cards to their backend-returned state, skipping animation.
    // Safe to call any time during 'revealing'; idempotent via skipRevealRef guard.
    const handleSkipReveal = () => {
        if (skipRevealRef.current || !resultRef.current) return;
        skipRevealRef.current = true;
        setSlots(resultRef.current.cards_received.map(card => ({
            state: 'landed',
            displayCard: card,
            frame: 0,
        })));
        setAnimPhase('done');
    };

    const handleReset = () => {
        setResult(null);
        setSlots([]);
        setAnimPhase('idle');
        setPackImgFailed(false);
        setResultRarity(null);
        skipRevealRef.current  = false;
        resultRef.current      = null;
        tearResolveRef.current = null;
        apiResolveRef.current  = null;
        isDraggingRef.current  = false;
    };

    // ── Loading / error early returns ─────────────────────────────────────────
    if (loading) {
        return (
            <section className='pack'>
                <div className="packs-bg">
                    <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                    <img className='bg-img' src="./imgs/image 3.png" alt="" />
                </div>
                <p style={{ color: '#fff', textAlign: 'center', paddingTop: '12rem', fontSize: '1.6rem' }}>
                    Loading...
                </p>
            </section>
        );
    }

    if (error || !pack) {
        return (
            <section className='pack'>
                <div className="packs-bg">
                    <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                    <img className='bg-img' src="./imgs/image 3.png" alt="" />
                </div>
                <div className="container" style={{ paddingTop: '12rem' }}>
                    <div className="alert alert-danger" style={{ fontSize: '1.4rem' }}>
                        {error || 'Pack not found.'}
                    </div>
                    <Link to="/packs" className="form-btn" style={{ display: 'inline-block', marginTop: '1rem' }}>
                        Back to Packs
                    </Link>
                </div>
            </section>
        );
    }

    if (!user) return null;

    const canAfford = Number(user.credits) >= Number(pack.cost);
    const isIdle    = animPhase === 'idle';

    return (
        <>
            {/* Interactive pack opening overlay */}
            {(animPhase === 'opening' || animPhase === 'torn') && (
                <div className="pack-anim-overlay">
                    {/*
                     * Clicking pack-scene (flap or lower body) opens the pack.
                     * Clicking the empty dark background does nothing — no onClick on the overlay.
                     */}
                    <div ref={sceneRef} className={`pack-scene${resultRarity ? ` pack-scene--${resultRarity}` : ''}`}>
                        {/* Drag hint — visible only while pack is waiting to be opened */}
                        {animPhase === 'opening' && (
                            <div className="pack-open-hint">↑ Pull to open</div>
                        )}
                        {/* Top flap — draggable upward during 'opening' */}
                        <div
                            ref={flapRef}
                            className={`pack-flap${animPhase === 'torn' ? ' pack-flap--torn' : ''}`}
                            onPointerDown={animPhase === 'opening' ? onFlapPointerDown : undefined}
                            onPointerMove={animPhase === 'opening' ? onFlapPointerMove : undefined}
                            onPointerUp={animPhase === 'opening'   ? onFlapPointerUp   : undefined}
                            onPointerCancel={animPhase === 'opening' ? onFlapPointerUp : undefined}
                        >
                            {pack.image_url && !packImgFailed
                                ? <img
                                    className="pack-img-half pack-img-top"
                                    src={pack.image_url}
                                    alt=""
                                    draggable={false}
                                    onError={() => setPackImgFailed(true)}
                                  />
                                : <div className="pack-stripe" />}
                            <div className="pack-shine" />
                        </div>
                        {/* Lower body — stationary, reveals gap as flap moves */}
                        <div className="pack-lower">
                            {pack.image_url && !packImgFailed
                                ? <img
                                    className="pack-img-half pack-img-bottom"
                                    src={pack.image_url}
                                    alt=""
                                    draggable={false}
                                  />
                                : <div className="pack-stripe" />}
                            <div className="pack-shine" />
                        </div>
                        <div className="pack-seam-line" />
                        {/* Light leak — opacity/scale driven by JS during drag, full when torn */}
                        <div
                            ref={lightLeakRef}
                            className="pack-light-leak"
                            style={{ opacity: 0, transform: 'translate(-50%, -50%) scale(0.3)' }}
                        />
                        {/* Ghost silhouettes mount only after tear is complete */}
                        {animPhase === 'torn' && (
                            <>
                                <div className="pack-ghost pack-ghost-1" />
                                <div className="pack-ghost pack-ghost-2" />
                                <div className="pack-ghost pack-ghost-3" />
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Result overlay */}
            {(animPhase === 'revealing' || animPhase === 'done') && result && (
                <div className="pack-result-overlay">
                    <div className="pack-result-inner">

                        {animPhase === 'done' && (
                            <>
                                <h2>Pack Opened!</h2>
                                <p className="pack-result-credits">
                                    Pack Coins remaining: <strong>{fmtPackCoins(result.credits_remaining)}</strong>
                                </p>
                            </>
                        )}

                        <div className="pack-result-cards">
                            {slots.map((slot, i) => {
                                if (slot.state === 'waiting') {
                                    return (
                                        <div key={i} className="result-card-item">
                                            <div className="pk-slot-waiting-card" />
                                            <p className="pk-slot-waiting-label">···</p>
                                        </div>
                                    );
                                }

                                if (slot.state === 'spinning') {
                                    return (
                                        <div key={i} className="result-card-item">
                                            <div className="pk-reel-window pk-slot-spinning-card">
                                                <img
                                                    key={slot.frame}
                                                    className="pk-reel-frame"
                                                    src={slot.displayCard.image_url}
                                                    alt=""
                                                />
                                            </div>
                                            <p className="pk-spinning-name">{slot.displayCard.name}</p>
                                        </div>
                                    );
                                }

                                // landed
                                const rarityColor = RARITY_COLOR[slot.displayCard.rarity] || '#9ca3af';
                                return (
                                    <div key={i} className="result-card-item pk-slot-landed">
                                        <div
                                            className="card-pk-img"
                                            style={{
                                                position:  'relative',
                                                border:    `1px solid ${rarityColor}`,
                                                boxShadow: `0 0 18px 5px ${rarityColor}55`,
                                            }}
                                        >
                                            <img src={slot.displayCard.image_url} alt={slot.displayCard.name} width="100%" />
                                            <span className="label">
                                                {RARITY_LABEL[slot.displayCard.rarity] || slot.displayCard.rarity.toUpperCase()}
                                            </span>
                                        </div>
                                        <p>{slot.displayCard.name}</p>
                                        <span className="card-value">{fmtPackCoins(slot.displayCard.value)}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {animPhase === 'revealing' && (
                            <button className="skip-reveal-btn" onClick={handleSkipReveal}>
                                Skip Reveal
                            </button>
                        )}

                        {animPhase === 'done' && (
                            <div className="pack-result-actions">
                                <button className="form-btn" onClick={handleReset}>
                                    Open Another
                                </button>
                                <Link to="/packs" className="form-btn form-btn-outline">
                                    Back to Packs
                                </Link>
                            </div>
                        )}

                    </div>
                </div>
            )}

            <section className='pack'>
                <div className="packs-bg">
                    <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                    <img className='bg-img' src="./imgs/image 3.png" alt="" />
                </div>
                <div className="container">
                    <h2 className='text-center' data-aos="zoom-in">{pack.name}</h2>
                    <div className="row">
                        <div className="pk-card mx-auto">
                            <div className="pack-content text-center">
                                <div className="pack-img" data-aos="fade-up">
                                    <img
                                        src={pack.image_url}
                                        alt={pack.name}
                                    />
                                </div>
                                <div className="pack-btns">
                                    <span className="pack-info-tag" data-aos="fade-up">
                                        {pack.cards_per_open} cards per open · {pack.pool.length} possible cards
                                    </span>
                                    {openError && (
                                        <div className="alert alert-danger" style={{ fontSize: '1.4rem', margin: '1rem 0' }}>
                                            {openError}
                                        </div>
                                    )}
                                    {isIdle && (
                                        <button
                                            type="button"
                                            className="pack-open-btn"
                                            onClick={handleOpen}
                                            disabled={!canAfford}
                                        >
                                            {canAfford
                                                ? `Open for ${fmtPackCoins(pack.cost)}`
                                                : `Not enough Pack Coins (need ${fmtPackCoins(pack.cost)})`}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Card pool carousel */}
            <section className='cards'>
                <div className="container">
                    <div className="row">
                        <div className="col-sm-10 col-9 mx-auto">
                            {pack.pool.length > 0 && (
                                <OwlCarousel className='owl-theme py-5' {...carouselOptions}>
                                    {pack.pool.map((entry, i) => (
                                        <div className="item" key={i}>
                                            <div className="card-pack">
                                                <div className="card-pk-img" style={{ position: 'relative' }}>
                                                    <img src={entry.card.image_url} width="100%" alt={entry.card.name} />
                                                    <span className='label'>
                                                        {RARITY_LABEL[entry.card.rarity] || entry.card.rarity.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p>{entry.card.name}</p>
                                                <span className="card-pool-chance">{entry.chance_percent}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </OwlCarousel>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <StartNow />
        </>
    );
};

export default Pack;
