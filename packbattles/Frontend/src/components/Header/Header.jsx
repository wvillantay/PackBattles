import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { FaBarsStaggered } from "react-icons/fa6";
import { FaTimes } from "react-icons/fa";
import "./Header.css"

// IMPORT SOCIAL ICON
import SocialIcon from '../SocialIcon/SocialIcon';

// LOGO
import logo from "../../assets/img/logo.png";
const Header = () => {

    // MOBILE NAV
    const [nav, setNav] = useState(false);

    // HANDLE SIDE NAVBAR
    const handleNav = () => {
        setNav(!nav);
    }

    window.addEventListener("scroll", (e) => {
        document.getElementById("header").style.backdropFilter = "blur(30px)";
    })


    return (
        <>
            <header id='header'>
                <div className="container">
                    <nav className='d-flex align-items-center navbar-expand-lg w-100 headerNav'>
                        <Link className='logo' to={"/"} data-aos="fade-right">
                            <img src={logo} alt="Packbatles logo" />
                        </Link>

                        <button className='toggler ms-auto d-block d-lg-none' data-aos="fade-left" onClick={handleNav} >
                            {
                                nav ? <FaTimes /> : <FaBarsStaggered />
                            }
                        </button>

                        <div className={`d-lg-flex align-items-center w-100 ${nav ? 'nav-active' : null}`} id='topNav'>
                            <button className='closeNav ms-auto d-block d-lg-none ' onClick={handleNav} >
                                <FaTimes />
                            </button>

                            <ul className='navbar-nav' data-aos="zoom-in">
                                <li>
                                    <NavLink activeclassname="active"  to={"/packs"}>Packs</NavLink>
                                </li>
                                <li>
                                    <NavLink activeclassname="active" to={"/battles"}>Battles</NavLink>
                                </li>
                                <li>
                                    <NavLink activeclassname="active" to={"/events"}>Event</NavLink>
                                </li>
                                <li>
                                    <NavLink activeclassname="active" to={"/upgrade"}>Upgrade</NavLink>
                                </li>
                                <li>
                                    <NavLink activeclassname="active" to={"/trade"}>Trade</NavLink>
                                </li>
                                <li>
                                    <NavLink   >More</NavLink>
                                </li>
                            </ul>
                            <div className="h-social d-none d-xxl-block ms-auto ">
                                <SocialIcon />
                            </div>
                            <div className="header-buttons ms-auto d-flex align-items-center">
                                <Link className='me-3' to={"/login"} data-aos="fade-down">Log In</Link>
                                <Link className='signup-btn' to={"/signup"} data-aos="fade-up">Sign Up</Link>
                            </div>

                        </div>


                    </nav>
                </div>
            </header>
        </>
    )
}

export default Header