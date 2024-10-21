import React from 'react'
import logo from "../../assets/img/logo.png";

import SocialIcon from '../SocialIcon/SocialIcon';
import './Footer.css'
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <>
    <footer className='footer'>
        <div className="container">
            <div className="row">
                <div className="col-md-8" >
                    <div className="ft-logo" data-aos="fade-right" >
                        <img src={logo} alt="Packbattles logo" />
                    </div>
                    <div className="ft-social" data-aos="fade-up" >
                        <SocialIcon/>
                    </div>
                </div>

                <div className="col-md-2 col-6" data-aos="fade-down" >
                    <ul>
                        <li><Link>Packs</Link></li>
                        <li><Link>Battles</Link></li>
                        <li><Link>Event</Link></li>
                    </ul>
                </div>

                <div className="col-md-2 col-6" data-aos="fade-left" >
                    <ul>
                        <li><Link>Upgrade</Link></li>
                        <li><Link>Trade</Link></li>
                        <li><Link>More</Link></li>
                    </ul>
                </div>


            </div>

            
        </div>

        <div className="copyright text-center">
            <p  >© 2023 All rights Reserved.</p>
        </div>
        
    </footer>
    </>
  )
}

export default Footer