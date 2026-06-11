import React, { useEffect, useState } from 'react';
import { IoMdSearch } from 'react-icons/io';
import axios from 'axios';
import './Packs.css';

import PackCard from '../../components/PackCard/PackCard';
import StartNow from '../../components/StartNow/StartNow';

import { API } from '../../api';

const Packs = () => {
    const [packs, setPacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortBy, setSortBy] = useState('ascending');

    useEffect(() => {
        axios
            .get(`${API}/api/packs`)
            .then((res) => setPacks(res.data))
            .catch(() => setError('Failed to load packs. Make sure the backend is running.'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <>
            <section className="packs">
                <div className="packs-bg">
                    <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                    <img className='bg-img' src="./imgs/image 3.png" alt="" />
                </div>
                <div className="container">
                    <h2 data-aos="fade-down">Packs</h2>

                    <div className="search-container">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="search" data-aos="fade-right">
                                <form onSubmit={(e) => e.preventDefault()}>
                                    <div className="input-wrap">
                                        <input type="text" placeholder='Search Packs' />
                                        <span className='search-icon'><IoMdSearch /></span>
                                    </div>
                                </form>
                            </div>
                            <div className="sort" data-aos="fade-right">
                                <label>Sort By</label>
                                <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                                    <option value="popularity">Popularity</option>
                                    <option value="ascending">Ascending</option>
                                    <option value="descending">Descending</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {loading && (
                        <p style={{ color: '#fff', textAlign: 'center', fontSize: '1.6rem', marginTop: '4rem' }}>
                            Loading packs...
                        </p>
                    )}

                    {error && (
                        <div className="alert alert-danger" style={{ fontSize: '1.4rem', marginTop: '2rem' }}>
                            {error}
                        </div>
                    )}

                    <div className="row pack-cards">
                        {[...packs]
                            .sort((a, b) => {
                                if (sortBy === 'ascending')  return Number(a.cost) - Number(b.cost);
                                if (sortBy === 'descending') return Number(b.cost) - Number(a.cost);
                                return 0;
                            })
                            .map((pack, index) => (
                            <div className="col-lg-3 col-md-6" data-aos="fade-up" key={pack.id}>
                                <PackCard
                                    text={pack.name}
                                    img={pack.image_url}
                                    price={pack.cost}
                                    url={`/pack?id=${pack.id}`}
                                    active={index === 0}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <StartNow />
        </>
    );
};

export default Packs;
