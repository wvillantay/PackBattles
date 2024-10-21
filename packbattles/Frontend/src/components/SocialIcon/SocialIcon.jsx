import React from 'react'
import { FaFacebookF, FaLinkedinIn , FaDiscord , FaTwitter , FaYoutube , FaGithub  } from "react-icons/fa6";
import { Link } from 'react-router-dom';
import "./SocialIcon.css";
const SocialIcon = () => {
  return (
    <>
        <section className='social-icon'>
            <ul className='d-flex align-items-center list-unstyled'>
                <li><Link to="#"><FaFacebookF /></Link></li>
                <li><Link to="#"><FaLinkedinIn /></Link></li>
                <li><Link to="#"><FaDiscord /></Link></li>
                <li><Link to="#"><FaTwitter /></Link></li>
                <li><Link to="#"><FaYoutube /></Link></li>
                <li><Link to="#"><FaGithub /></Link></li>
            </ul>
        </section>
    </>
  )
}

export default SocialIcon