import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StartNow from '../../components/StartNow/StartNow';
import './Inventory.css';
import { fmtPackCoins } from '../../utils/currency';

import { API } from '../../api';

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

const Inventory = () => {
    const { token } = useAuth();
    const [items, setItems]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    useEffect(() => {
        axios
            .get(`${API}/api/inventory`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => setItems(res.data))
            .catch(() => setError('Failed to load inventory. Make sure the backend is running.'))
            .finally(() => setLoading(false));
    }, [token]);

    return (
        <>
            <section className="inventory">
                <div className="packs-bg">
                    <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                    <img className="bg-img"  src="./imgs/image 3.png"       alt="" />
                </div>

                <div className="container">
                    <h2 data-aos="fade-down">My Inventory</h2>

                    {loading && (
                        <p className="inv-status">Loading inventory...</p>
                    )}

                    {error && (
                        <div className="alert alert-danger inv-alert">
                            {error}
                        </div>
                    )}

                    {!loading && !error && items.length === 0 && (
                        <div className="inv-empty">
                            <p>You don't own any cards yet.</p>
                            <Link to="/packs" className="inv-cta-btn">
                                Open Packs
                            </Link>
                        </div>
                    )}

                    {!loading && items.length > 0 && (
                        <p className="inv-count" data-aos="fade-up">
                            {items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} cards owned
                        </p>
                    )}

                    <div className="row inv-grid">
                        {items.map((item) => (
                            <div
                                className="col-xl-2 col-lg-3 col-md-4 col-sm-6 col-6"
                                key={item.inventory_id}
                                data-aos="fade-up"
                            >
                                <div className="inv-card">
                                    <div className="inv-card-img">
                                        <img src={item.image_url} alt={item.name} width="100%" />
                                        <span
                                            className="inv-rarity-badge"
                                            style={{ background: RARITY_COLOR[item.rarity] || '#9ca3af' }}
                                        >
                                            {RARITY_LABEL[item.rarity] || item.rarity.toUpperCase()}
                                        </span>
                                        {item.quantity > 1 && (
                                            <span className="inv-qty-badge">x{item.quantity}</span>
                                        )}
                                    </div>
                                    <div className="inv-card-body">
                                        <p className="inv-card-name">{item.name}</p>
                                        <span className="inv-card-value">{fmtPackCoins(item.value)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <StartNow />
        </>
    );
};

export default Inventory;
