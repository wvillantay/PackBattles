import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import OwlCarousel from 'react-owl-carousel';
import 'owl.carousel/dist/assets/owl.carousel.css';
import 'owl.carousel/dist/assets/owl.theme.default.css';

import { useAuth } from '../../context/AuthContext';
import StartNow from '../../components/StartNow/StartNow';
import './Pack.css';

const API = 'http://localhost:8080';

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

// Spin one slot fast→medium→slow, pause on real card, then land.
// setSlots uses the functional updater so no stale-closure issues.
const spinSlot = (slotIndex, realCard, poolCards, setSlots) => {
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
            frameInPhase++;

            if (frameInPhase >= phases[phaseIdx].count) {
                phaseIdx++;
                frameInPhase = 0;

                if (phaseIdx >= phases.length) {
                    // Dramatic pause showing real card still spinning
                    update(realCard, 'spinning', 1);
                    setTimeout(() => {
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

    // Animation phases: 'idle' | 'shaking' | 'flashing' | 'revealing' | 'done'
    const [animPhase, setAnimPhase] = useState('idle');
    // Each slot: { state: 'waiting'|'spinning'|'landed', displayCard: null|cardObj, frame: 0 }
    const [slots, setSlots] = useState([]);

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

    const handleOpen = async () => {
        setOpenError('');
        setAnimPhase('shaking');
        setSlots([]);

        // Shake for at least 1.4 s while the API fires exactly once in parallel.
        const [, apiResult] = await Promise.all([
            new Promise(r => setTimeout(r, 1400)),
            axios
                .post(
                    `${API}/api/packs/${packId}/open`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } },
                )
                .then(res => ({ ok: true,  data: res.data }))
                .catch(err => ({ ok: false, err })),
        ]);

        if (!apiResult.ok) {
            setOpenError(apiResult.err.response?.data?.error || 'Failed to open pack. Try again.');
            setAnimPhase('idle');
            return;
        }

        updateUser({ credits: apiResult.data.credits_remaining });
        setResult(apiResult.data);

        // Flash
        setAnimPhase('flashing');
        await new Promise(r => setTimeout(r, 450));

        // Build decoy pool from pack.pool (already in state — no extra API call)
        const cards     = apiResult.data.cards_received;
        const poolCards = (pack?.pool?.length > 0)
            ? pack.pool.map(e => e.card)
            : cards;

        setSlots(cards.map(() => ({ state: 'waiting', displayCard: null, frame: 0 })));
        setAnimPhase('revealing');

        for (let i = 0; i < cards.length; i++) {
            await spinSlot(i, cards[i], poolCards, setSlots);
            if (i < cards.length - 1) {
                await new Promise(r => setTimeout(r, 140));
            }
        }

        setAnimPhase('done');
    };

    const handleReset = () => {
        setResult(null);
        setSlots([]);
        setAnimPhase('idle');
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
            {/* Full-screen flash between shake and first card reveal */}
            {animPhase === 'flashing' && (
                <div className="pack-open-flash" />
            )}

            {/* Result overlay */}
            {(animPhase === 'revealing' || animPhase === 'done') && result && (
                <div className="pack-result-overlay">
                    <div className="pack-result-inner">

                        {animPhase === 'done' && (
                            <>
                                <h2>Pack Opened!</h2>
                                <p className="pack-result-credits">
                                    Credits remaining: <strong>{result.credits_remaining}</strong>
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
                                        <span className="card-value">{slot.displayCard.value} credits</span>
                                    </div>
                                );
                            })}
                        </div>

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
                                        className={animPhase === 'shaking' ? 'pack-shaking' : ''}
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
                                                ? `Open for ${pack.cost} credits`
                                                : `Not enough credits (need ${pack.cost})`}
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
