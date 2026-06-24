import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ModeCard from '../../components/ModeCard/ModeCard';
import PlayerProfileCard from '../../components/PlayerProfileCard/PlayerProfileCard';
import './DuelBattle.css';

import { API } from '../../api';
import { fmtPackCoins, fmtPackCoinsShort } from '../../utils/currency';

const RARITY_COLOR = {
    common:     '#9ca3af',
    uncommon:   '#60a5fa',
    rare:       '#a35bff',
    ultra_rare: '#f59e0b',
};

// Adaptive timing based on total cards per side.
// sideGap removed — creator and opponent spin simultaneously.
function getTimingConfig(n) {
    if (n <= 5) return {
        fast:     { count: 4, ms: 65 },
        medium:   { count: 3, ms: 120 },
        slow:     { count: 2, ms: 200 },
        pause:    220,
        landWait: 300,
        pairGap:  520,
    };
    if (n <= 10) return {
        fast:     { count: 4, ms: 50 },
        medium:   { count: 3, ms: 95 },
        slow:     { count: 2, ms: 155 },
        pause:    150,
        landWait: 230,
        pairGap:  400,
    };
    if (n <= 25) return {
        fast:     { count: 3, ms: 40 },
        medium:   { count: 2, ms: 75 },
        slow:     { count: 1, ms: 120 },
        pause:    110,
        landWait: 180,
        pairGap:  290,
    };
    return {
        fast:     { count: 2, ms: 30 },
        medium:   { count: 2, ms: 55 },
        slow:     { count: 1, ms: 90 },
        pause:    75,
        landWait: 155,
        pairGap:  230,
    };
}

const DuelBattle = () => {
    const { id }          = useParams();
    const { token, user, updateUser } = useAuth();
    const navigate        = useNavigate();
    const location        = useLocation();

    // ── Fetch / poll state ────────────────────────────────────────────────────
    const [battle,    setBattle]    = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState('');
    const [showPopup,    setShowPopup]    = useState(false);
    const [cancelling,    setCancelling]    = useState(false);
    const [cancelError,   setCancelError]   = useState('');
    const [isBotBattling, setIsBotBattling] = useState(false);
    const [botError,      setBotError]      = useState('');
    const [joining,       setJoining]       = useState(false);
    const [joinError,     setJoinError]     = useState('');

    // ── Pack pool for roulette cycling (read-only, fetched once) ─────────────
    const [packPool,      setPackPool]      = useState([]);
    const [packImageUrl,  setPackImageUrl]  = useState('');

    // ── Join animation state (joiner only) ───────────────────────────────────
    const [joinAnimating, setJoinAnimating] = useState(false);

    // ── Reveal state: how many cards have fully landed per side ───────────────
    const [revealedCreator,  setRevealedCreator]  = useState(0);
    const [revealedOpponent, setRevealedOpponent] = useState(0);
    const [revealDone,       setRevealDone]       = useState(false);

    // ── Simultaneous slot spin state ──────────────────────────────────────────
    // spinIndex: which pair index both sides are currently spinning (-1 = none)
    // spinCreatorCard / spinOpponentCard: the decoy card shown in each active slot
    const [spinIndex,        setSpinIndex]        = useState(-1);
    const [spinCreatorCard,  setSpinCreatorCard]  = useState(null);
    const [spinOpponentCard, setSpinOpponentCard] = useState(null);

    // Frame counters drive the reel img `key`, forcing a remount on every
    // frame change so the slide-in CSS animation replays fresh each time.
    const frameCreatorRef  = useRef(0);
    const frameOpponentRef = useRef(0);

    const pollingRef          = useRef(null);
    const timerCreatorRef     = useRef(null); // creator's spin chain timer
    const timerOpponentRef    = useRef(null); // opponent's spin chain timer
    const timerPairRef        = useRef(null); // pair-gap / initial-delay timer
    const revealStartedRef    = useRef(false);
    const wasAlreadyCompleted = useRef(false); // true when initial fetch returns completed — skip animation
    const joinResultRef       = useRef(null);  // stores join API result during pack-open animation
    const joinAnimTimerRef    = useRef(null);  // setTimeout that fires setBattle after animation
    // True while the join pack-open animation is playing. Blocks in-flight poll responses
    // from calling setBattle and bypassing the animation.
    const joinAnimatingRef    = useRef(false);

    // ── Fetch battle, then pack pool ──────────────────────────────────────────
    useEffect(() => {
        let active = true;

        const fetchBattle = () =>
            axios.get(`${API}/api/battles/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

        fetchBattle()
            .then(async res => {
                if (!active) return;
                const battleData = res.data;

                // Pre-fetch pack pool so it's ready before the first spin.
                let pool = [];
                try {
                    const pr = await axios.get(`${API}/api/packs/${battleData.pack_id}`);
                    if (active) {
                        pool = pr.data.pool.map(e => e.card);
                        setPackImageUrl(pr.data.image_url || '');
                    }
                } catch (e) { /* graceful fallback: drawn cards used instead */ }

                if (!active) return;
                setPackPool(pool);

                if (battleData.status === 'completed') {
                    if (location?.state?.joinResult) {
                        // User just joined from the battles list. The navigation state
                        // carries the signal to show the pack-open animation instead of
                        // displaying results immediately. Clear the nav state so a
                        // subsequent reload doesn't re-trigger the animation.
                        window.history.replaceState({}, '', window.location.href);

                        // Start animation; keep loading=true so the page doesn't render
                        // the completed battle underneath the overlay. setBattle and
                        // setLoading are called from the timer when animation ends.
                        joinResultRef.current    = battleData;
                        joinAnimatingRef.current = true;
                        setJoinAnimating(true);
                        joinAnimTimerRef.current = setTimeout(() => {
                            if (!active) return;
                            joinAnimatingRef.current = false;
                            setJoinAnimating(false);
                            if (!revealStartedRef.current) {
                                setBattle(joinResultRef.current);
                            }
                            joinResultRef.current = null;
                            setLoading(false);
                        }, 2000);
                        return; // skip normal setBattle / setLoading / polling setup
                    }

                    // Battle was already over when this page opened (history / direct link).
                    // Set refs BEFORE setBattle so the animation useEffect sees
                    // revealStartedRef.current === true and exits without starting timers.
                    wasAlreadyCompleted.current = true;
                    revealStartedRef.current    = true;
                    setRevealedCreator(battleData.creator_cards.length);
                    setRevealedOpponent(battleData.opponent_cards.length);
                    setRevealDone(true);
                }

                setBattle(battleData);
                setLoading(false);

                if (battleData.status === 'open') {
                    pollingRef.current = setInterval(() => {
                        fetchBattle()
                            .then(r => {
                                if (!active) return;
                                if (r.data.status === 'completed' || r.data.status === 'cancelled') {
                                    clearInterval(pollingRef.current);
                                    pollingRef.current = null;
                                    // Guard: don't overwrite if reveal already started OR if the
                                    // join animation is playing (joinAnimatingRef). An in-flight
                                    // poll HTTP response can arrive during the 2-second animation
                                    // window even after clearInterval() has been called.
                                    if (!revealStartedRef.current && !joinAnimatingRef.current) {
                                        if (r.data.status === 'completed' && !wasAlreadyCompleted.current) {
                                            // Fresh completion via poll — show opening animation before releasing
                                            // the result to the slot-spin reveal (same flow as the joiner path).
                                            joinResultRef.current    = r.data;
                                            joinAnimatingRef.current = true;
                                            setJoinAnimating(true);
                                            joinAnimTimerRef.current = setTimeout(() => {
                                                if (!active) return;
                                                joinAnimatingRef.current = false;
                                                setJoinAnimating(false);
                                                if (!revealStartedRef.current) setBattle(joinResultRef.current);
                                                joinResultRef.current = null;
                                            }, 2000);
                                        } else {
                                            setBattle(r.data);
                                        }
                                    }
                                }
                            })
                            .catch(() => {});
                    }, 3500);
                }
            })
            .catch(() => {
                if (!active) return;
                setError('Battle not found or you do not have access.');
                setLoading(false);
            });

        return () => {
            active = false;
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            clearTimeout(joinAnimTimerRef.current);
            joinAnimatingRef.current = false;
        };
    }, [id]);

    // ── Simultaneous pair-by-pair slot reveal ─────────────────────────────────
    useEffect(() => {
        if (!battle || battle.status !== 'completed' || revealStartedRef.current) return;
        revealStartedRef.current = true;

        let active = true;
        const N      = battle.creator_cards.length;
        const timing = getTimingConfig(N);
        const pool   = packPool.length > 0
            ? packPool
            : [...battle.creator_cards, ...battle.opponent_cards];

        const rand = () => pool[Math.floor(Math.random() * pool.length)];

        // Each side has its own timer ref and frame counter ref so they run
        // in parallel without stomping each other.
        const sideConfig = {
            creator:  { timerRef: timerCreatorRef,  frameRef: frameCreatorRef,  setCard: setSpinCreatorCard,  getReal: (i) => battle.creator_cards[i],  lock: (i) => setRevealedCreator(i + 1)  },
            opponent: { timerRef: timerOpponentRef, frameRef: frameOpponentRef, setCard: setSpinOpponentCard, getReal: (i) => battle.opponent_cards[i], lock: (i) => setRevealedOpponent(i + 1) },
        };

        // Spin one slot: cycles fast→medium→slow, pauses on real card, then locks.
        const runSpin = (side, cardIndex, onLanded) => {
            if (!active) return;
            const { timerRef, frameRef, setCard, getReal, lock } = sideConfig[side];

            const sched = (fn, delay) => { timerRef.current = setTimeout(fn, delay); };

            const nextFrame = (card) => {
                frameRef.current += 1;
                setCard(card);
            };

            const phases = [timing.fast, timing.medium, timing.slow];

            const runPhase = (phaseIdx, frameIdx) => {
                if (!active) return;

                if (phaseIdx >= phases.length) {
                    // All cycling done — show real card for dramatic pause
                    nextFrame(getReal(cardIndex));
                    sched(() => {
                        if (!active) return;
                        lock(cardIndex);   // card moves from spinning slot to landed grid
                        setCard(null);     // clear this side's spin card
                        sched(onLanded, timing.landWait);
                    }, timing.pause);
                    return;
                }

                const phase = phases[phaseIdx];
                nextFrame(rand());

                sched(() => {
                    if (frameIdx + 1 >= phase.count) runPhase(phaseIdx + 1, 0);
                    else                              runPhase(phaseIdx, frameIdx + 1);
                }, phase.ms);
            };

            runPhase(0, 0);
        };

        // Reveal one pair: both sides spin at the same time.
        // When both have landed, wait pairGap then advance.
        const revealPair = (pairIndex) => {
            if (!active) return;
            if (pairIndex >= N) { setRevealDone(true); return; }

            setSpinIndex(pairIndex);

            let landedCount = 0;
            const onLanded = () => {
                landedCount += 1;
                if (landedCount < 2) return;
                // Both sides have landed
                if (!active) return;
                setSpinIndex(-1);
                timerPairRef.current = setTimeout(() => revealPair(pairIndex + 1), timing.pairGap);
            };

            runSpin('creator',  pairIndex, onLanded);
            runSpin('opponent', pairIndex, onLanded);
        };

        // Brief initial pause so the page settles before first pair spins.
        timerPairRef.current = setTimeout(() => revealPair(0), 600);

        return () => {
            active = false;
            clearTimeout(timerCreatorRef.current);
            clearTimeout(timerOpponentRef.current);
            clearTimeout(timerPairRef.current);
        };
    }, [battle]);

    // ── Show popup once all cards have landed ─────────────────────────────────
    useEffect(() => {
        if (revealDone && !wasAlreadyCompleted.current) setShowPopup(true);
    }, [revealDone]);

    // ── Skip — instantly show all server-drawn cards ──────────────────────────
    const skipReveal = () => {
        clearTimeout(timerCreatorRef.current);
        clearTimeout(timerOpponentRef.current);
        clearTimeout(timerPairRef.current);
        if (!battle) return;
        setSpinIndex(-1);
        setSpinCreatorCard(null);
        setSpinOpponentCard(null);
        setRevealedCreator(battle.creator_cards.length);
        setRevealedOpponent(battle.opponent_cards.length);
        setRevealDone(true);
    };

    // ── Cancel open battle (creator only) ────────────────────────────────────
    const handleCancel = async () => {
        setCancelling(true);
        setCancelError('');
        try {
            await axios.post(
                `${API}/api/battles/${id}/cancel`,
                {},
                { headers: { Authorization: `Bearer ${token}` } },
            );
            updateUser({ credits: Number(user.credits) + Number(battle.total_cost) });
            navigate('/battles');
        } catch (err) {
            setCancelError(err.response?.data?.error || 'Cancel failed. Please try again.');
            setCancelling(false);
        }
    };

    // ── Battle Bot (creator only) ─────────────────────────────────────────────
    const handleBotJoin = async () => {
        setIsBotBattling(true);
        setBotError('');
        try {
            const res = await axios.post(
                `${API}/api/battles/${id}/bot-join`,
                {},
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            // Guard: if an in-flight poll already delivered the completed data
            // and started the reveal, don't overwrite battle (would kill timers).
            if (!revealStartedRef.current) {
                // Show opening animation before releasing the result to slot-spin,
                // same as the poll path and the joiner-from-battles-list path.
                joinResultRef.current    = res.data;
                joinAnimatingRef.current = true;
                setIsBotBattling(false);
                setJoinAnimating(true);
                joinAnimTimerRef.current = setTimeout(() => {
                    joinAnimatingRef.current = false;
                    setJoinAnimating(false);
                    if (!revealStartedRef.current) setBattle(joinResultRef.current);
                    joinResultRef.current = null;
                }, 2000);
            }
        } catch (err) {
            setIsBotBattling(false);
            // 400 means race (human joined or cancelled) — polling will update UI naturally
            if (err.response?.status !== 400) {
                setBotError('Bot join failed. Please try again.');
            }
        }
    };

    // ── Join from spectator view ──────────────────────────────────────────────
    const handleJoin = async () => {
        setJoining(true);
        setJoinError('');
        try {
            const res = await axios.post(
                `${API}/api/battles/${id}/join`,
                {},
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            updateUser({ credits: Number(user.credits) - Number(battle?.total_cost) });

            // Guard: if an in-flight poll already called setBattle and started the
            // reveal before this join response arrived, skip the animation — the
            // slot-spin is already running.
            if (revealStartedRef.current) {
                setJoining(false);
                return;
            }

            // Store result; set the animation ref BEFORE setJoinAnimating so that
            // any in-flight poll response that lands between now and the animation
            // finishing is blocked from calling setBattle.
            joinResultRef.current   = res.data;
            joinAnimatingRef.current = true;
            setJoining(false);
            setJoinAnimating(true);
            joinAnimTimerRef.current = setTimeout(() => {
                joinAnimatingRef.current = false;
                setJoinAnimating(false);
                if (!revealStartedRef.current) {
                    setBattle(joinResultRef.current);
                }
                joinResultRef.current = null;
            }, 2000);
        } catch (err) {
            setJoinError(err.response?.data?.error || 'Join failed. Please try again.');
            setJoining(false);
        }
    };

    // ── Join animation overlay helper (reused in both early-return and normal render) ──
    const renderJoinAnim = () => (
        <div className="db-join-anim-overlay">
            <div className="db-join-pack-scene">
                <div className="db-join-flap">
                    {packImageUrl
                        ? <img className="db-join-img db-join-img-top" src={packImageUrl} alt="" draggable={false} />
                        : <div className="db-join-stripe" />}
                    <div className="db-join-shine" />
                </div>
                <div className="db-join-lower">
                    {packImageUrl
                        ? <img className="db-join-img db-join-img-bottom" src={packImageUrl} alt="" draggable={false} />
                        : <div className="db-join-stripe" />}
                    <div className="db-join-shine" />
                </div>
                <div className="db-join-seam-line" />
                <div className="db-join-light-leak" />
                <p className="db-join-hint">Opening battle pack...</p>
            </div>
        </div>
    );

    // ── Loading / error early returns ─────────────────────────────────────────

    // Navigated here from battles list after joining: show animation before the
    // completed battle data is released to the normal render. loading stays true
    // during this window — the overlay covers the page background.
    if (loading && joinAnimating) {
        return (
            <>
                <section className="duel-battle">
                    <div className="packs-bg">
                        <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                        <img className="bg-img"  src="./imgs/image 3.png"      alt="" />
                    </div>
                </section>
                {renderJoinAnim()}
            </>
        );
    }

    if (loading) {
        return (
            <section className="duel-battle">
                <div className="packs-bg">
                    <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                    <img className="bg-img"  src="./imgs/image 3.png"      alt="" />
                </div>
                <div className="container">
                    <p className="db-status-text db-status-waiting">Loading battle room...</p>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="duel-battle">
                <div className="packs-bg">
                    <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                    <img className="bg-img"  src="./imgs/image 3.png"      alt="" />
                </div>
                <div className="container">
                    <p className="db-error-text">{error}</p>
                    <Link to="/battles" className="db-back-link">Back to Battles</Link>
                </div>
            </section>
        );
    }

    // ── Derived values ────────────────────────────────────────────────────────
    const isCompleted  = battle.status === 'completed';
    const isCancelled  = battle.status === 'cancelled';
    const isCreator    = user?.id === battle.creator_id;
    const isOpponent   = user?.id === battle.opponent_id;
    const isSpectator   = !isCreator && !isOpponent;
    const canAffordJoin = Number(user?.credits) >= Number(battle.total_cost);
    const isRevealing   = isCompleted && !revealDone;
    const creatorWins  = revealDone && battle.winner_side === 'creator';
    const opponentWins = revealDone && (battle.winner_side === 'opponent' || battle.winner_side === 'bot');
    const winner       = revealDone ? (creatorWins ? battle.creator_name : battle.opponent_name) : null;
    const loser        = revealDone ? (creatorWins ? battle.opponent_name : battle.creator_name) : null;
    const totalAwarded = revealDone
        ? (Number(battle.creator_total) + Number(battle.opponent_total)).toFixed(2)
        : null;

    // Running totals only advance when BOTH cards in a pair have landed.
    const committedCount = Math.min(revealedCreator, revealedOpponent);
    const runningCreatorTotal = isCompleted
        ? battle.creator_cards.slice(0, committedCount).reduce((s, c) => s + Number(c.value), 0).toFixed(2)
        : '0.00';
    const runningOpponentTotal = isCompleted
        ? battle.opponent_cards.slice(0, committedCount).reduce((s, c) => s + Number(c.value), 0).toFixed(2)
        : '0.00';

    // ── Cancelled state ───────────────────────────────────────────────────────
    if (isCancelled) {
        return (
            <section className="duel-battle">
                <div className="packs-bg">
                    <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                    <img className="bg-img"  src="./imgs/image 3.png"      alt="" />
                </div>
                <div className="container">
                    <p className="db-status-text db-status-waiting">Battle Cancelled</p>
                    <p className="db-cancelled-hint">
                        {isCreator
                            ? 'Your battle was cancelled and your Pack Coins have been refunded.'
                            : 'The creator cancelled this battle before anyone joined.'}
                    </p>
                    <Link to="/battles" className="db-back-link">Back to Battles</Link>
                </div>
            </section>
        );
    }

    // ── Card grid renderer ────────────────────────────────────────────────────
    // Three slot states per card position i:
    //   landed   (i < lockedCount)  — real card, rarity border + land animation
    //   spinning (i === spinIndex)  — vertical reel cycling decoy cards
    //   waiting  (everything else) — dim dashed placeholder
    //
    // The reel img key encodes the frame counter, so each frame change remounts
    // the img element and replays the `db-reel-slide` animation fresh.
    const renderCardGrid = (side) => {
        const cards      = side === 'creator' ? battle.creator_cards : battle.opponent_cards;
        const locked     = side === 'creator' ? revealedCreator      : revealedOpponent;
        const activeCard = side === 'creator' ? spinCreatorCard      : spinOpponentCard;
        const frameKey   = side === 'creator' ? frameCreatorRef.current : frameOpponentRef.current;

        return (
            <div className="db-card-grid">
                {cards.map((card, i) => {
                    const isLanded   = i < locked;
                    const isSpinning = !isLanded && i === spinIndex && activeCard !== null;
                    const rarityColor = RARITY_COLOR[card.rarity] || '#9ca3af';

                    let cls = 'db-card';
                    if (isLanded)        cls += ' db-card-landed';
                    else if (isSpinning) cls += ' db-card-spinning';
                    else                 cls += ' db-card-waiting';

                    return (
                        <div
                            key={isLanded ? `l${i}` : i}
                            className={cls}
                            style={isLanded ? { '--rarity-color': rarityColor } : undefined}
                        >
                            {isLanded ? (
                                <>
                                    <img src={card.image_url} alt={card.name} />
                                    <span
                                        className="db-card-rarity"
                                        style={{ background: rarityColor }}
                                    >
                                        {card.rarity.replace('_', ' ').toUpperCase()}
                                    </span>
                                    <p className="db-card-name">{card.name}</p>
                                    <span className="db-card-value">{fmtPackCoinsShort(card.value)}</span>
                                </>
                            ) : isSpinning ? (
                                <>
                                    <div className="db-reel-window">
                                        <img
                                            key={`reel-${side}-${frameKey}`}
                                            className="db-reel-frame"
                                            src={activeCard.image_url}
                                            alt=""
                                        />
                                    </div>
                                    <p className="db-card-name">{activeCard.name}</p>
                                </>
                            ) : (
                                <div className="db-card-placeholder" />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <section className="duel-battle">
                <div className="packs-bg">
                    <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                    <img className="bg-img"  src="./imgs/image 3.png"      alt="" />
                </div>

                <div className="container">

                    {/* Top summary */}
                    <div className="d-flex flex-wrap">
                        <div className="item">
                            <ModeCard icon="../imgs/Group 40146 (1).svg" heading="Duel Battle" name="Mode" />
                        </div>
                        <div className="item">
                            <ModeCard icon="../imgs/Group 40146.svg" heading={`×${battle.pack_quantity}`} name="Packs" />
                        </div>
                        <div className="item">
                            <ModeCard icon="../imgs/Group 40148.svg" heading={fmtPackCoins(battle.total_cost)} name="Total Cost" />
                        </div>
                    </div>

                    {/* Status */}
                    <p className={`db-status-text ${revealDone ? 'db-status-done' : 'db-status-waiting'}`}>
                        {revealDone
                            ? `Battle over — ${winner} wins!`
                            : isCompleted
                                ? 'Revealing cards...'
                                : 'Waiting for an opponent to join...'}
                    </p>

                    {revealDone && battle.tiebreaker && (
                        <p className="db-tiebreaker">
                            It was a tie &mdash; coin flip awarded the win to {winner}
                        </p>
                    )}

                    {isRevealing && (
                        <div className="db-skip-row">
                            <button className="db-skip-btn" onClick={skipReveal}>
                                Skip Reveal
                            </button>
                        </div>
                    )}

                    {/* Player panels */}
                    <div className="player">
                        <div className="row">

                            {/* LEFT — Creator */}
                            <div className="col-md-4">
                                <div className={`player-card-outer mx-auto${creatorWins ? ' db-winner-glow' : ''}`}>
                                    <div className="player-card">
                                        <div className="player-name d-flex align-items-center">
                                            <div className="player-avatar">
                                                <img src="./imgs/Ellipse 4.svg" alt="" />
                                            </div>
                                            <p className="my-0 ms-4">{battle.creator_name}</p>
                                            {creatorWins && <span className="db-winner-label ms-2">Winner</span>}
                                        </div>

                                        <div className="player-card-pack">
                                            {!isCompleted ? (
                                                <div className="db-sealed">
                                                    <div className="db-sealed-icon" />
                                                    <p className="db-sealed-title">
                                                        {isCreator ? 'Your draw is sealed' : 'Draw hidden'}
                                                    </p>
                                                    <p className="db-sealed-hint">
                                                        {isCreator
                                                            ? 'Cards reveal simultaneously when an opponent joins.'
                                                            : "Creator's draw is sealed until the battle begins."}
                                                    </p>
                                                    <p className="db-sealed-pack">
                                                        {battle.pack_name} ×{battle.pack_quantity}
                                                    </p>
                                                    {isCreator && (
                                                        <>
                                                            {cancelError && (
                                                                <p className="db-cancel-error">{cancelError}</p>
                                                            )}
                                                            <button
                                                                className="db-cancel-btn"
                                                                onClick={handleCancel}
                                                                disabled={cancelling || isBotBattling}
                                                            >
                                                                {cancelling ? 'Cancelling...' : 'Cancel Battle'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    {committedCount > 0 && (
                                                        <div className="db-total-badge">
                                                            {revealDone
                                                                ? fmtPackCoinsShort(battle.creator_total)
                                                                : `${fmtPackCoinsShort(runningCreatorTotal)}...`}
                                                        </div>
                                                    )}
                                                    {renderCardGrid('creator')}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CENTER — VS */}
                            <div className="col-md-4 mx-auto">
                                <div className="players-vs text-center">
                                    <h2>VS</h2>
                                    {revealDone ? (
                                        <div className="vs-card">
                                            <img className="icon" src="./imgs/Group 40124.png" alt="" />
                                            <h4>{fmtPackCoins(totalAwarded)}</h4>
                                            <span>Total Amount Awarded</span>
                                        </div>
                                    ) : isCompleted ? (
                                        <div className="db-vs-waiting">
                                            <div className="db-waiting-dots">
                                                <span /><span /><span />
                                            </div>
                                            <p>Revealing...</p>
                                        </div>
                                    ) : (
                                        /* Lobby: show what pack is being played */
                                        <div className="db-vs-lobby">
                                            {packImageUrl && (
                                                <img
                                                    className="db-lobby-pack-img"
                                                    src={packImageUrl}
                                                    alt={battle.pack_name}
                                                />
                                            )}
                                            <p className="db-lobby-pack-name">{battle.pack_name}</p>
                                            <p className="db-lobby-pack-meta">
                                                ×{battle.pack_quantity}&nbsp;&nbsp;·&nbsp;&nbsp;{fmtPackCoins(battle.total_cost)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT — Opponent */}
                            <div className="col-md-4 ms-auto">
                                <div className={`player-card-outer mx-auto ms-lg-auto${opponentWins ? ' db-winner-glow' : ''}`}>
                                    {!isCompleted ? (
                                        <div className="player-card db-waiting-card">
                                            <div className="player-name d-flex align-items-center">
                                                <div className="player-avatar db-avatar-empty" />
                                                <p className="my-0 ms-4 db-waiting-name">Waiting...</p>
                                            </div>
                                            <div className="player-card-pack">
                                                <div className="db-waiting">
                                                    <div className="db-waiting-dots">
                                                        <span /><span /><span />
                                                    </div>
                                                    <p className="db-waiting-text">Waiting for opponent</p>
                                                    <p className="db-waiting-hint">
                                                        Anyone can join from the{' '}
                                                        <Link to="/battles" className="db-battles-link">battles list</Link>
                                                        {' '}for {fmtPackCoins(battle.total_cost)}
                                                    </p>
                                                    {isCreator && (
                                                        <>
                                                            {botError && (
                                                                <p className="db-cancel-error">{botError}</p>
                                                            )}
                                                            <button
                                                                className="db-bot-btn"
                                                                onClick={handleBotJoin}
                                                                disabled={isBotBattling || cancelling}
                                                            >
                                                                {isBotBattling ? 'Finding bot...' : 'Battle Bot'}
                                                            </button>
                                                        </>
                                                    )}
                                                    {!isCreator && (
                                                        <>
                                                            {joinError && (
                                                                <p className="db-join-error">{joinError}</p>
                                                            )}
                                                            <button
                                                                className="db-join-btn"
                                                                onClick={handleJoin}
                                                                disabled={joining || !canAffordJoin}
                                                            >
                                                                {joining
                                                                    ? 'Joining...'
                                                                    : `Join Battle for ${fmtPackCoins(battle.total_cost)}`}
                                                            </button>
                                                            {!canAffordJoin && (
                                                                <p className="db-join-afford">Not enough Pack Coins to join.</p>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="player-card">
                                            <div className="player-name d-flex align-items-center">
                                                <div className="player-avatar">
                                                    <img src="./imgs/Ellipse 4.svg" alt="" />
                                                </div>
                                                <p className="my-0 ms-4">{battle.opponent_name}</p>
                                                {opponentWins && <span className="db-winner-label ms-2">Winner</span>}
                                            </div>
                                            <div className="player-card-pack">
                                                {committedCount > 0 && (
                                                    <div className="db-total-badge">
                                                        {revealDone
                                                            ? fmtPackCoinsShort(battle.opponent_total)
                                                            : `${fmtPackCoinsShort(runningOpponentTotal)}...`}
                                                    </div>
                                                )}
                                                {renderCardGrid('opponent')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </section>

            {/* BATTLE OPENING ANIMATION OVERLAY — all players see this before slot-spin reveal */}
            {joinAnimating && renderJoinAnim()}

            {/* BATTLE OVER POPUP — only after full reveal */}
            {showPopup && revealDone && (
                <div className="battle-popup-outer">
                    <div className="battle-popup">
                        <h2 className="text-center">Battle is Over</h2>

                        <div className="players-vs text-center my-0 mb-0">
                            <div className="vs-card">
                                <img className="icon" src="./imgs/Group 40124.png" alt="" />
                                <h4>{fmtPackCoins(totalAwarded)}</h4>
                                <span>Total Amount Awarded</span>
                            </div>
                        </div>

                        <div className="d-flex flex-wrap justify-content-center align-items-end gap-3">
                            <div className="player-card">
                                <p className="text-center fw-bolder my-3">Winner</p>
                                <PlayerProfileCard
                                    avatar="./imgs/Ellipse 4 (5).png"
                                    name={winner}
                                    isWinner={true}
                                />
                            </div>
                            <div className="player-card">
                                <PlayerProfileCard
                                    avatar="./imgs/Ellipse 4 (6).png"
                                    name={loser}
                                    isWinner={false}
                                />
                            </div>
                        </div>

                        <div className="popup-bottom">
                            <div className="d-flex flex-wrap align-items-center justify-content-center gap-3">
                                <button
                                    className="db-popup-btn db-popup-btn-primary"
                                    onClick={() => navigate('/battles')}
                                >
                                    Create New Battle
                                </button>
                                <button
                                    className="db-popup-btn db-popup-btn-secondary"
                                    onClick={() => setShowPopup(false)}
                                >
                                    View Battle Room
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DuelBattle;
