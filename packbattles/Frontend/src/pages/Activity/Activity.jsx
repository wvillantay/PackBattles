import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../api';
import './Activity.css';

const TYPE_ICON = {
    upgrade: '⚡',
    trade:   '↔',
    pack:    '📦',
    battle:  '⚔',
};

function relativeTime(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60)  return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs  < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

const Activity = () => {
    const { token } = useAuth();
    const [events,      setEvents]      = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchFeed = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/activity/feed?limit=30`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEvents(res.data);
            setLastUpdated(new Date());
            setError('');
        } catch {
            setError('Failed to load activity feed.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchFeed();
        const timer = setInterval(fetchFeed, 30_000);
        return () => clearInterval(timer);
    }, [fetchFeed]);

    return (
        <section className="activity">
            <div className="packs-bg">
                <img className="bar-img" src="./imgs/Rectangle 15.png" alt="" />
                <img className="bg-img"  src="./imgs/image 3.png"       alt="" />
            </div>

            <div className="container">
                <div className="act-header" data-aos="fade-down">
                    <h2>Live Activity</h2>
                    <p className="act-subtitle">
                        Real-time events from across the community — refreshes every 30 seconds
                    </p>
                    {lastUpdated && (
                        <p className="act-updated">
                            Last updated {relativeTime(lastUpdated.toISOString())}
                        </p>
                    )}
                </div>

                {loading && <p className="act-loading">Loading activity...</p>}
                {error   && <p className="act-error">{error}</p>}

                {!loading && !error && events.length === 0 && (
                    <p className="act-empty">No recent activity found.</p>
                )}

                <div className="act-feed" data-aos="fade-up">
                    {events.map((ev, i) => (
                        <div key={i} className={`act-event act-event--${ev.type}`}>
                            <span className="act-icon">{TYPE_ICON[ev.type] ?? '•'}</span>
                            <div className="act-body">
                                <span className="act-user">{ev.user}</span>
                                {' '}
                                <span className="act-text">{ev.text}</span>
                                {ev.type === 'upgrade' && ev.result === 'success' && (
                                    <span className="act-badge act-badge--win">SUCCESS</span>
                                )}
                            </div>
                            <span className="act-time">{relativeTime(ev.ts)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Activity;
