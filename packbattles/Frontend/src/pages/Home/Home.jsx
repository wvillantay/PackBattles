import React from 'react'
import Button from '../../components/Button/Button.jsx'
import "./Home.css";
import OwlCarousel from 'react-owl-carousel';
import 'owl.carousel/dist/assets/owl.carousel.css';
import 'owl.carousel/dist/assets/owl.theme.default.css';


// IMPORT IMAGES
import bgImage from "../../assets/img/image 3.png";

import heroImg from "../../assets/img/hero-image.png";

import pokemon from "../../assets/img/pokemon.png";
import yuGi from "../../assets/img/pngegg (35) 5.png";
import magic from "../../assets/img/magic.png";
import digimon from "../../assets/img/digimon.png";
import SectionHeader from '../../components/SectionHeader/SectionHeader.jsx';
import PackCard from '../../components/PackCard/PackCard.jsx';
import elipse from "../../assets/img/Ellipse 5.png";

import upgradeImg from "../../assets/img/image 20.png";
import upgradeImg1 from "../../assets/img/Frame.png";
import upgradeImg2 from "../../assets/img/image 29.png";

// PACK CARD DATA
import { PackCardData } from "../../components/PackCardData.js"

// GAMES CARD DATA
import { GamesCardData } from "../../components/gamesCardData.js"
import { Link } from 'react-router-dom';
import EventCard from '../../components/EventCard/EventCard.jsx';
import { EventCardData } from '../../components/EventCardData.js';
import LiveGameCard from '../../components/LiveGameCard/LiveGameCard.jsx';
import { LiveGamesData } from '../../components/LiveGamesData.js';
import StartNow from '../../components/StartNow/StartNow.jsx';
import TestimonialCard from '../../components/TestimonialCard/TestimonialCard.jsx';
import { TestimonialCardData } from '../../components/TestimonialCardData.js';

const Home = () => {

    // TESTIMONIAL RESPONSIVE
    const options = {
        loop: true,
        margin: 10,
        nav: true,
        dots: false,
        responsive: {
            0: {
                items: 1
            },
            576: {
                items: 2
            }
        }
    }

    return (
        <>

            {/* HERO SECTION START */}
            <section className='hero-section'>
                <img className='h-bg-image' src={bgImage} alt="header bg image" />
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-lg-5">
                            <div className="hero-text">
                                <h1 data-aos="fade-right">An interesting and catchy title</h1>
                                <p data-aos="fade-up">Lorem ipsum dolor sit amet consectetur. Urna risus a tempus velit sed turpis tellus. </p>
                                <div className="mt-5" data-aos="fade-up-left">
                                    <Button text={"Open Box"} url={"#"} />
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-7">
                            <div className="hero-img" data-aos="fade-left">
                                <img src={heroImg} alt="Pack images" width={"100%"} />
                            </div>
                        </div>

                    </div>
                </div>

                {/* LOGOS SECTION START */}
                <section className='logos'>
                    <div className="container">
                        <div className="row align-items-center">

                            <div className="col-md-3 col-6">
                                <div className="logo-card blind-normal" >
                                    <img src={pokemon} alt="pokemon logo" data-aos="fade-up"/>
                                </div>
                            </div>

                            <div className="col-md-3 col-6" >
                                <div className="logo-card">
                                    <img src={yuGi} alt="yuGi logo" data-aos="zoom-in" />
                                </div>
                            </div>

                            <div className="col-md-3 col-6" >
                                <div className="logo-card">
                                    <img src={magic} alt="Magic logo" data-aos="fade-down" />
                                </div>
                            </div>

                            <div className="col-md-3 col-6" >
                                <div className="logo-card">
                                    <img src={digimon} alt="digimon logo" data-aos="fade-left" />
                                </div>
                            </div>

                        </div>
                    </div>
                </section>
                {/* LOGOS SECTION END */}


            </section>
            {/* HERO SECTION END */}


            {/* FEATURED PACK SECTION START */}
            <section className='feature-pack'>
                <img className='elipse' src={elipse} alt='Elipse circle' data-aos="fade-down"/>
                <SectionHeader heading={"Featured Packs"} btnText={"See More"} btnUrl={"#"} />
                <div className="container">
                    <div className="row pack-cards">
                        {
                            PackCardData.slice(0,4).map((data, index) => (
                                <div className="col-lg-3 col-md-6 " data-aos="fade-up" key={index}>
                                    <PackCard price="200" text={data.text} active={data.active} img={data.img} url={data.url} />
                                </div>
                            ))
                        }

                    </div>
                </div>
            </section>
            {/* FEATURED PACK SECTION END */}

            {/* ROOM SECTION START */}
            <section className='room-section'>
                <img className='line-blur-img' src="./imgs/Rectangle 26.png" alt="" />
                <div className="container">


                    <div className="row align-items-center">
                        <div className="col-lg-5">
                            <div className="room-text">
                                <h2 data-aos="fade-down" >Upgrade Room</h2>
                                <p data-aos="fade-right" >Lorem ipsum dolor sit amet consectetur. Feugiat feugiat phasellus neque facilisi nec massa. Velit amet lectus ut pellentesque amet egestas ornare ipsum sed. Venenatis faucibus fermentum pellentesque egestas. Elementum at.</p>
                                <div className="mt-5" data-aos="fade-up" >
                                    <Button text="Upgrade Cards" url="#" />
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-7 my-5">
                            <div className="row justify-content-center text-center align-items-center">
                                <div className="col-3 " data-aos="fade-up" >
                                    <img src={upgradeImg} width={"100%"} alt="upgrade room img" />
                                </div>

                                <div className="col-6 text-center ">
                                    <img src={upgradeImg1} width={"100%"} alt="" data-aos="fade-down"  />

                                    <button className='room-btn' data-aos="fade-right" >Upgrade</button>

                                </div>

                                <div className="col-3 ">
                                    <img src={upgradeImg2} width={"100%"} data-aos="fade-left"  alt="" />
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="row flex-row-reverse align-items-center">
                        <div className="col-lg-5 ">
                            <div className="room-text">
                                <h2 data-aos="fade-down" >Trade Cards</h2>
                                <p data-aos="fade-left" >Lorem ipsum dolor sit amet consectetur. Feugiat feugiat phasellus neque facilisi nec massa. Velit amet lectus ut pellentesque amet egestas ornare ipsum sed. Venenatis faucibus fermentum pellentesque egestas. Elementum at.</p>
                                <div className="mt-5" data-aos="fade-up" >
                                    <Button text="Trade Cards" url="#" />
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-7 my-5 pe-5">
                            <div className="row justify-content-center text-center align-items-center">
                                <div className="col-3 " data-aos="fade-right" >
                                    <img src={upgradeImg} width={"100%"} alt="upgrade room img" />
                                </div>

                                <div className="col-6 text-center " >
                                    <img src="./imgs/Group 40106.png" data-aos="fade-down"  width={"100%"} alt="" />

                                    <button className='room-btn' data-aos="fade-right" >Trade</button>

                                </div>

                                <div className="col-3 " data-aos="fade-up" >
                                    <img src={upgradeImg2} width={"100%"} alt="" />
                                </div>
                            </div>
                        </div>

                    </div>


                </div>
                <img className='line-blur-img2' src="./imgs/Rectangle 25.png" alt="" />
            </section>
            {/* ROOM SECTION END */}

            {/* GAMES SECTION START */}
            <section className='games' >
                <img className='gm-elipse' src="./imgs/Ellipse 10.png" alt="" />
                <img className='line-bar1' src="./imgs/Rectangle 49.png" alt="" />
                <img className='line-bar2' src="./imgs/Rectangle 47.png" alt="" />
                <div className="container">
                    <h2 className='text-center' data-aos="zoom-in" >Games</h2>
                    <div className="row">

                        {
                            GamesCardData.map((data, index) => (
                                <div className="col-md-4 col-sm-6 my-3 px-3" data-aos="fade-up"  key={index}>
                                    <div className="games-card h-100">
                                        <div className="game-card-img">
                                            <img src={data.img} width={"100%"} alt="King of the hail" />
                                        </div>
                                        <p>{data.text}</p>
                                    </div>
                                </div>
                            ))
                        }



                    </div>
                </div>
            </section>
            {/* GAMES SECTION END */}



            {/* EVENT SECTION START */}
            <section className='events'>
                <SectionHeader heading={"Latest Events"} btnText={"See All"} btnUrl={"#"} />
                <div className="container">
                    <div className="row">
                        {
                            EventCardData?.slice(0,3).map((data, index) => (
                                <div className="col-lg-4 col-sm-6 my-5" data-aos="zoom-in"  key={index}>
                                    <EventCard data={data} />
                                </div>
                            ))
                        }

                    </div>
                </div>
            </section>
            {/* EVENT SECTION END */}


            {/* LIVE GAMES SECTION START */}
            <section className='live-games'>
                <SectionHeader heading={"Live Games"} btnText={"See More"} btnUrl={"#"} />
                <div className="container">
                    <div className="row">
                        {
                            LiveGamesData?.map((data, index) => (
                                <div className="col-lg-3 col-sm-6 my-4" data-aos="fade-left"  key={index}>
                                    <LiveGameCard data={data} />
                                </div>
                            ))
                        }

                    </div>
                </div>
            </section>
            {/* LIVE GAMES SECTION END */}


            {/* PLAY WITH US SECTION START */}
            <section className='play-with-up'>
                <div className="container">
                    <h2 className='text-center my-5' data-aos="zoom-in" >Why play with us</h2>
                    <div className="row mt-5 pt-5">
                        <div className="col-xl-8 col-lg-10 mx-auto">
                            <div className="row mt-5">

                                <div className="col-md-4 my-3" data-aos="fade-down" >
                                    <div className="play-with-us-card  text-center h-100">
                                        <img src="./imgs/icon (1).svg" alt="" />
                                        <h6>Benefit Title</h6>
                                        <p>Lorem ipsum dolor sit amet consectetur. Aliquam.</p>
                                    </div>
                                </div>

                                <div className="col-md-4 my-3" data-aos="fade-up" >
                                    <div className="play-with-us-card  text-center h-100">
                                        <img src="./imgs/icon (2).svg" alt="" />
                                        <h6>Benefit Title</h6>
                                        <p>Lorem ipsum dolor sit amet consectetur. Aliquam.</p>
                                    </div>
                                </div>

                                <div className="col-md-4 my-3" data-aos="fade-left" >
                                    <div className="play-with-us-card  text-center h-100">
                                        <img src="./imgs/icon (3).svg" alt="" />
                                        <h6>Benefit Title</h6>
                                        <p>Lorem ipsum dolor sit amet consectetur. Aliquam.</p>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* PLAY WITH US SECTION END */}


            {/* TETIMONIAL SECTION START */}
            <section className='testimonial'>
                <div className="container">
                    <h2>What our players says</h2>
                    <div className="sliders">

                        <OwlCarousel className='owl-theme' {...options}>
                            {
                                TestimonialCardData?.map((data, index) => (
                                    <div className="item" key={index} data-aos="zoom-in" >
                                        <TestimonialCard data={data} />
                                    </div>

                                ))
                            }

                        </OwlCarousel>;
                    </div>


                </div>
            </section>
            {/* TETIMONIAL SECTION END */}



            {/* START NOW SECTION START */}
            <StartNow />
            {/* START NOW SECTION END*/}






        </>
    )
}

export default Home