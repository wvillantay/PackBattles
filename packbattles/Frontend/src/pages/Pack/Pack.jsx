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

const Pack = () => {
    const { token, user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const packId = searchParams.get('id');

    const [pack, setPack]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');
    const [opening, setOpening] = useState(false);
    const [openError, setOpenError] = useState('');
    const [result, setResult]   = useState(null);

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
        setOpening(true);
        try {
            const res = await axios.post(
                `${API}/api/packs/${packId}/open`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            updateUser({ credits: res.data.credits_remaining });
            setResult(res.data);
        } catch (err) {
            setOpenError(err.response?.data?.error || 'Failed to open pack. Try again.');
        } finally {
            setOpening(false);
        }
    };

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

    const canAfford  = Number(user.credits) >= Number(pack.cost);
    const isDisabled = opening || !canAfford;

    return (
        <>
            {/* Result overlay — shown after a successful open */}
            {result && (
                <div className="pack-result-overlay">
                    <div className="pack-result-inner">
                        <h2>Pack Opened!</h2>
                        <p className="pack-result-credits">
                            Credits remaining: <strong>{result.credits_remaining}</strong>
                        </p>
                        <div className="pack-result-cards">
                            {result.cards_received.map((card, i) => (
                                <div key={i} className="result-card-item">
                                    <div className="card-pk-img" style={{ position: 'relative' }}>
                                        <img src={card.image_url} alt={card.name} width="100%" />
                                        <span className="label">
                                            {RARITY_LABEL[card.rarity] || card.rarity.toUpperCase()}
                                        </span>
                                    </div>
                                    <p>{card.name}</p>
                                    <span className="card-value">{card.value} credits</span>
                                </div>
                            ))}
                        </div>
                        <div className="pack-result-actions">
                            <button className="form-btn" onClick={() => setResult(null)}>
                                Open Another
                            </button>
                            <Link to="/packs" className="form-btn form-btn-outline">
                                Back to Packs
                            </Link>
                        </div>
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
                                    <img src={pack.image_url} alt={pack.name} />
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
                                    <button
                                        type="button"
                                        className="pack-open-btn"
                                        onClick={handleOpen}
                                        disabled={isDisabled}
                                    >
                                        {opening
                                            ? 'Opening...'
                                            : canAfford
                                                ? `Open for ${pack.cost} credits`
                                                : `Not enough credits (need ${pack.cost})`}
                                    </button>
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
