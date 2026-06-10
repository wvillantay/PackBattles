import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FaBarsStaggered } from 'react-icons/fa6';
import { FaTimes } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import SocialIcon from '../SocialIcon/SocialIcon';
import logo from '../../assets/img/logo.png';
import './Header.css';

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [nav, setNav] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            document.getElementById('header').style.backdropFilter = 'blur(30px)';
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <header id='header'>
            <div className="container">
                <nav className='d-flex align-items-center navbar-expand-lg w-100 headerNav'>
                    <Link className='logo' to="/" data-aos="fade-right">
                        <img src={logo} alt="PackBattles logo" />
                    </Link>

                    <button className='toggler ms-auto d-block d-lg-none' data-aos="fade-left" onClick={() => setNav(!nav)}>
                        {nav ? <FaTimes /> : <FaBarsStaggered />}
                    </button>

                    <div className={`d-lg-flex align-items-center w-100 ${nav ? 'nav-active' : null}`} id='topNav'>
                        <button className='closeNav ms-auto d-block d-lg-none' onClick={() => setNav(false)}>
                            <FaTimes />
                        </button>

                        <ul className='navbar-nav' data-aos="zoom-in">
                            <li><NavLink activeclassname="active" to="/packs">Packs</NavLink></li>
                            <li><NavLink activeclassname="active" to="/inventory">Inventory</NavLink></li>
                            <li><NavLink activeclassname="active" to="/battles">Battles</NavLink></li>
                            <li><NavLink activeclassname="active" to="/events">Event</NavLink></li>
                            <li><NavLink activeclassname="active" to="/upgrade">Upgrade</NavLink></li>
                            <li><NavLink activeclassname="active" to="/trade">Trade</NavLink></li>
                        </ul>

                        <div className="h-social d-none d-xxl-block ms-auto">
                            <SocialIcon />
                        </div>

                        <div className="header-buttons ms-auto d-flex align-items-center">
                            {user ? (
                                <>
                                    <Link to="/profile" className='me-3 pf-user-link'>
                                        {user.name} &nbsp;·&nbsp; {user.credits} credits
                                    </Link>
                                    <button
                                        className='signup-btn'
                                        onClick={handleLogout}
                                        style={{ cursor: 'pointer', border: 'none' }}
                                    >
                                        Log Out
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link className='me-3' to="/login" data-aos="fade-down">Log In</Link>
                                    <Link className='signup-btn' to="/signup" data-aos="fade-up">Sign Up</Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>
            </div>
        </header>
    );
};

export default Header;
