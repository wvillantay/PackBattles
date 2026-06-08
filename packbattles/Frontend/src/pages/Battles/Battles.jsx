import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { IoMdSearch } from 'react-icons/io';
import StartNow from '../../components/StartNow/StartNow';
import './Battles.css';

const API = 'http://localhost:8080';

const RARITY_COLOR = {
    common:     '#9ca3af',
    uncommon:   '#60a5fa',
    rare:       '#a35bff',
    ultra_rare: '#f59e0b',
};

const QTY_OPTIONS = [1, 2, 3, 5, 10];

const Battles = () => {
    const { token, user, updateUser } = useAuth();

    const [battles, setBattles]               = useState([]);
    const [battlesLoading, setBattlesLoading] = useState(true);
    const [battlesError, setBattlesError]     = useState('');

    const [packs, setPacks]               = useState([]);
    const [packsLoading, setPacksLoading] = useState(false);

    // Create modal
    const [showCreate, setShowCreate]     = useState(false);
    const [selectedPack, setSelectedPack] = useState(null);
    const [selectedQty, setSelectedQty]   = useState(1);
    const [creating, setCreating]         = useState(false);
    const [createError, setCreateError]   = useState('');

    // Join modal
    const [joiningBattle, setJoiningBattle] = useState(null);
    const [joining, setJoining]             = useState(false);
    const [joinError, setJoinError]         = useState('');

    // Result overlay
    const [result, setResult] = useState(null);

    const fetchBattles = () => {
        setBattlesLoading(true);
        setBattlesError('');
        axios
            .get(`${API}/api/battles`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setBattles(res.data))
            .catch(() => setBattlesError('Failed to load battles. Make sure the backend is running.'))
            .finally(() => setBattlesLoading(false));
    };

    const fetchPacks = () => {
        if (packs.length > 0) return;
        setPacksLoading(true);
        axios
            .get(`${API}/api/packs`)
            .then(res => setPacks(res.data))
            .catch(() => {})
            .finally(() => setPacksLoading(false));
    };

    useEffect(() => {
        fetchBattles();
        fetchPacks();
    }, []);

    const openCreateModal = () => {
        setSelectedPack(null);
        setSelectedQty(1);
        setCreateError('');
        setShowCreate(true);
    };

    const handleCreate = () => {
        if (!selectedPack) return;
        const totalCost = Number(selectedPack.cost) * selectedQty;
        setCreating(true);
        setCreateError('');
        axios
            .post(
                `${API}/api/battles`,
                { pack_id: selectedPack.id, pack_quantity: selectedQty },
                { headers: { Authorization: `Bearer ${token}` } },
            )
            .then(() => {
                updateUser({ credits: Number(user.credits) - totalCost });
                setShowCreate(false);
                fetchBattles();
            })
            .catch(err => setCreateError(err.response?.data?.error || 'Failed to create battle.'))
            .finally(() => setCreating(false));
    };

    const handleJoin = () => {
        if (!joiningBattle) return;
        setJoining(true);
        setJoinError('');
        axios
            .post(
                `${API}/api/battles/${joiningBattle.id}/join`,
                {},
                { headers: { Authorization: `Bearer ${token}` } },
            )
            .then(res => {
                updateUser({ credits: Number(user.credits) - Number(joiningBattle.total_cost) });
                setJoiningBattle(null);
                setResult(res.data);
                fetchBattles();
            })
            .catch(err => setJoinError(err.response?.data?.error || 'Failed to join battle.'))
            .finally(() => setJoining(false));
    };

    const totalCreateCost = selectedPack ? Number(selectedPack.cost) * selectedQty : 0;
    const canAffordCreate = selectedPack && Number(user?.credits) >= totalCreateCost;
    const canAffordJoin   = joiningBattle && Number(user?.credits) >= Number(joiningBattle.total_cost);

    return (
        <>
            <section className="battles">
                <div className="packs-bg">
                    <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                    <img className="bg-img"  src="./imgs/image 3.png"      alt="" />
                </div>

                <div className="container">
                    <div className="heading">
                        <h2>Battles</h2>
                        <p>
                            Challenge other players to a Duel Battle &mdash; both players open
                            the same pack and the higher total value wins all cards.
                        </p>
                    </div>

                    <div className="search-container w-100" data-aos="zoom-in">
                        <div className="d-flex flex-wrap flex-sm-nowrap align-items-center justify-content-between">
                            <div className="search" data-aos="fade-right">
                                <form>
                                    <div className="input-wrap">
                                        <input type="text" placeholder="Search Battles" />
                                        <span className="search-icon"><IoMdSearch /></span>
                                    </div>
                                </form>
                            </div>
                            <div className="d-flex align-items-center gap-4">
                                <div className="st-battle">
                                    <button className="m-btn" onClick={openCreateModal}>
                                        Start New Battle
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {battlesLoading && <p className="bt-status">Loading battles...</p>}
                    {battlesError   && <p className="bt-error">{battlesError}</p>}
                    {!battlesLoading && !battlesError && battles.length === 0 && (
                        <p className="bt-empty">No open battles right now &mdash; start one!</p>
                    )}

                    {battles.length > 0 && (
                        <div className="table-responsive battle-table" data-aos="fade-up">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>CREATOR</th>
                                        <th>PACK</th>
                                        <th>COST TO JOIN</th>
                                        <th>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {battles.map(battle => (
                                        <tr key={battle.id}>
                                            <td><p className="round">{battle.creator_name}</p></td>
                                            <td>
                                                <p>
                                                    {battle.pack_name}
                                                    {battle.pack_quantity > 1 && (
                                                        <span className="bt-qty-badge"> ×{battle.pack_quantity}</span>
                                                    )}
                                                </p>
                                            </td>
                                            <td><p>{battle.total_cost} cr</p></td>
                                            <td>
                                                <div className="act-btns">
                                                    {battle.creator_id !== user?.id ? (
                                                        <button
                                                            className="join"
                                                            onClick={() => {
                                                                setJoinError('');
                                                                setJoiningBattle(battle);
                                                            }}
                                                        >
                                                            Join
                                                        </button>
                                                    ) : (
                                                        <span className="bt-own-label">Your battle</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            {/* CREATE BATTLE MODAL */}
            {showCreate && (
                <div
                    className="bt-modal-overlay"
                    onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
                >
                    <div className="bt-modal">
                        <div className="bt-modal-header">
                            <h3>Start New Battle</h3>
                            <button className="bt-modal-close" onClick={() => setShowCreate(false)}>
                                &#10005;
                            </button>
                        </div>
                        <p className="bt-modal-hint">
                            Choose a pack and how many packs to open. You pay now and your draw
                            stays hidden until an opponent joins &mdash; both results reveal
                            simultaneously.
                        </p>

                        {packsLoading && <p className="bt-modal-status">Loading packs...</p>}
                        {!packsLoading && packs.length === 0 && (
                            <p className="bt-modal-status">No packs available.</p>
                        )}

                        <div className="bt-pack-picker">
                            {packs.map(pack => (
                                <div
                                    key={pack.id}
                                    className={`bt-pack-tile${selectedPack?.id === pack.id ? ' selected' : ''}`}
                                    onClick={() => setSelectedPack(pack)}
                                >
                                    <img src={pack.image_url} alt={pack.name} />
                                    <p className="bt-pack-tile-name">{pack.name}</p>
                                    <p className="bt-pack-tile-cost">{pack.cost} cr</p>
                                </div>
                            ))}
                        </div>

                        {selectedPack && (
                            <>
                                <p className="bt-modal-hint" style={{ marginBottom: '0.8rem' }}>
                                    Packs to open:
                                </p>
                                <div className="bt-qty-selector">
                                    {QTY_OPTIONS.map(q => (
                                        <button
                                            key={q}
                                            className={`bt-qty-btn${selectedQty === q ? ' selected' : ''}`}
                                            onClick={() => setSelectedQty(q)}
                                        >
                                            ×{q}
                                        </button>
                                    ))}
                                </div>

                                <div className="bt-modal-cost-row">
                                    <span>Per pack: <strong>{selectedPack.cost} cr</strong></span>
                                    <span>Quantity: <strong>×{selectedQty}</strong></span>
                                    <span>
                                        Total cost:{' '}
                                        <strong style={{ color: canAffordCreate ? '#A35BFF' : '#f87171' }}>
                                            {totalCreateCost} cr
                                        </strong>
                                    </span>
                                    <span>
                                        Your credits:{' '}
                                        <strong style={{ color: canAffordCreate ? '#A35BFF' : '#f87171' }}>
                                            {user?.credits}
                                        </strong>
                                    </span>
                                    {!canAffordCreate && (
                                        <span className="bt-modal-error">Not enough credits.</span>
                                    )}
                                </div>
                            </>
                        )}

                        {createError && <p className="bt-modal-error">{createError}</p>}

                        <div className="bt-modal-actions">
                            <button className="bt-btn-outline" onClick={() => setShowCreate(false)}>
                                Cancel
                            </button>
                            <button
                                className="bt-btn-primary"
                                onClick={handleCreate}
                                disabled={!selectedPack || !canAffordCreate || creating}
                            >
                                {creating ? 'Creating...' : `Create Battle (${totalCreateCost} cr)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* JOIN BATTLE MODAL */}
            {joiningBattle && (
                <div
                    className="bt-modal-overlay"
                    onClick={e => { if (e.target === e.currentTarget) setJoiningBattle(null); }}
                >
                    <div className="bt-modal">
                        <div className="bt-modal-header">
                            <h3>Join Battle</h3>
                            <button className="bt-modal-close" onClick={() => setJoiningBattle(null)}>
                                &#10005;
                            </button>
                        </div>

                        <div className="bt-modal-opponent">
                            <span>Creator: <strong>{joiningBattle.creator_name}</strong></span>
                            <span>Pack: <strong>{joiningBattle.pack_name}</strong></span>
                            {joiningBattle.pack_quantity > 1 && (
                                <span>Packs: <strong>×{joiningBattle.pack_quantity}</strong></span>
                            )}
                        </div>

                        <p className="bt-modal-hint">
                            You and your opponent each open {joiningBattle.pack_quantity > 1
                                ? `${joiningBattle.pack_quantity} packs`
                                : 'the same pack'
                            }. Higher total card value wins all drawn cards from both sides.
                        </p>

                        <div className="bt-modal-cost-row">
                            <span>
                                Entry cost:{' '}
                                <strong style={{ color: canAffordJoin ? '#A35BFF' : '#f87171' }}>
                                    {joiningBattle.total_cost} cr
                                </strong>
                            </span>
                            {joiningBattle.pack_quantity > 1 && (
                                <span>
                                    ({joiningBattle.pack_quantity} × {joiningBattle.pack_cost} cr)
                                </span>
                            )}
                            <span>
                                Your credits:{' '}
                                <strong style={{ color: canAffordJoin ? '#A35BFF' : '#f87171' }}>
                                    {user?.credits}
                                </strong>
                            </span>
                            {!canAffordJoin && (
                                <span className="bt-modal-error">Not enough credits.</span>
                            )}
                        </div>

                        {joinError && <p className="bt-modal-error">{joinError}</p>}

                        <div className="bt-modal-actions">
                            <button className="bt-btn-outline" onClick={() => setJoiningBattle(null)}>
                                Cancel
                            </button>
                            <button
                                className="bt-btn-primary"
                                onClick={handleJoin}
                                disabled={!canAffordJoin || joining}
                            >
                                {joining ? 'Joining...' : `Join for ${joiningBattle.total_cost} cr`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BATTLE RESULT OVERLAY — sticky close bar so it's always reachable */}
            {result && (
                <div className="bt-result-overlay">
                    <div className="bt-result-inner">
                        <div className="bt-result-scroll">
                            <h2 className={result.winner_id === user?.id ? 'bt-result-win' : 'bt-result-lose'}>
                                {result.winner_id === user?.id ? 'You Won!' : 'You Lost'}
                            </h2>

                            <p className="bt-result-pack-name">
                                {result.pack_name}
                                {result.pack_quantity > 1 && ` ×${result.pack_quantity}`} Battle
                                {' '}— {result.total_cost} cr total
                            </p>

                            {result.tiebreaker && (
                                <p className="bt-result-tiebreaker">
                                    It was a tie &mdash; coin flip awarded victory to{' '}
                                    {result.tiebreaker === 'creator'
                                        ? result.creator_name
                                        : result.opponent_name}
                                </p>
                            )}

                            <div className="bt-result-reveals">
                                {/* Creator's draw */}
                                <div className="bt-result-side">
                                    <div className="bt-result-side-header">
                                        <p className="bt-result-player-name">
                                            {result.creator_name}
                                            {result.winner_id === result.creator_id && (
                                                <span className="bt-result-crown"> Winner</span>
                                            )}
                                        </p>
                                        <p className="bt-result-side-total">{result.creator_total} cr</p>
                                    </div>
                                    <div className="bt-result-card-list">
                                        {result.creator_cards.map((card, i) => (
                                            <div key={`c-${i}`} className="bt-result-card">
                                                <img src={card.image_url} alt={card.name} />
                                                <span
                                                    className="bt-result-card-rarity"
                                                    style={{ background: RARITY_COLOR[card.rarity] || '#9ca3af' }}
                                                >
                                                    {card.rarity.replace('_', ' ').toUpperCase()}
                                                </span>
                                                <p>{card.name}</p>
                                                <span className="bt-result-card-value">{card.value} cr</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bt-result-vs-divider">VS</div>

                                {/* Opponent's draw */}
                                <div className="bt-result-side">
                                    <div className="bt-result-side-header">
                                        <p className="bt-result-player-name">
                                            {result.opponent_name}
                                            {result.winner_id === result.opponent_id && (
                                                <span className="bt-result-crown"> Winner</span>
                                            )}
                                        </p>
                                        <p className="bt-result-side-total">{result.opponent_total} cr</p>
                                    </div>
                                    <div className="bt-result-card-list">
                                        {result.opponent_cards.map((card, i) => (
                                            <div key={`o-${i}`} className="bt-result-card">
                                                <img src={card.image_url} alt={card.name} />
                                                <span
                                                    className="bt-result-card-rarity"
                                                    style={{ background: RARITY_COLOR[card.rarity] || '#9ca3af' }}
                                                >
                                                    {card.rarity.replace('_', ' ').toUpperCase()}
                                                </span>
                                                <p>{card.name}</p>
                                                <span className="bt-result-card-value">{card.value} cr</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bt-result-close-bar">
                            <button className="bt-btn-primary" onClick={() => setResult(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <StartNow />
        </>
    );
};

export default Battles;
