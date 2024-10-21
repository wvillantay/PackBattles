import React from 'react'
import { Link } from 'react-router-dom'
import "./Pack.css"

import OwlCarousel from 'react-owl-carousel';
import 'owl.carousel/dist/assets/owl.carousel.css';
import 'owl.carousel/dist/assets/owl.theme.default.css';

import StartNow from "../../components/StartNow/StartNow"


const Pack = () => {

    // CARD PACK OPTION
    const options = {
        loop: true,
        margin: 20,
        nav: true,
        dots: false,
        responsive: {
            0: {
                items: 1
            },
            576: {
                items: 2
            },
            992: {
                items: 3
            }
        }
    }


    return (
        <>
            <section className='pack'>
                 {/* BG */}
                 <div className="packs-bg ">
                    <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                    <img className='bg-img' src="./imgs/image 3.png" alt="" />
                </div>
                {/* BG END */}
                <div className="container">
                    <h2 className='text-center' data-aos="zoom-in">Pack Name Here</h2>
                    <div className="row">
                        <div className="pk-card mx-auto ">
                            <div className="pack-content text-center">
                                <div className="pack-img " data-aos="fade-up">
                                    <img src="./imgs/karte1 2 (12).png" alt="Pack image" />
                                </div>

                                <div className="pack-btns">
                                    <Link to={"#"} data-aos="fade-up">probability of the case value 15%</Link>
                                    <Link to={"#"} data-aos="fade-up" className='unpack'>Unpack for $200</Link>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CARDS SECTION START */}
            <section className='cards'>
                <div className="container">
                    <div className="row">
                        <div className="col-sm-10 col-9 mx-auto">

                            <OwlCarousel className='owl-theme py-5' {...options}>

                                <div className="item">
                                    <div className="card-pack">
                                        <div className="card-pk-img">
                                            <img src="./imgs/image 29.png" width="100%" alt="Card pack" />
                                            <span className='label'>RARE</span>
                                        </div>
                                        <p>Card Name Here</p>
                                        <Link to={"#"}>$200</Link>

                                    </div>
                                </div>

                                <div className="item">
                                    <div className="card-pack">
                                        <div className="card-pk-img">
                                            <img src="./imgs/image 29.png" width="100%" alt="Card pack" />
                                            <span className='label'>RARE</span>
                                        </div>
                                        <p>Card Name Here</p>
                                        <Link to={"#"}>$200</Link>

                                    </div>
                                </div>


                                <div className="item">
                                    <div className="card-pack">
                                        <div className="card-pk-img">
                                            <img src="./imgs/image 29.png" width="100%" alt="Card pack" />
                                            <span className='label'>RARE</span>
                                        </div>
                                        <p>Card Name Here</p>
                                        <Link to={"#"}>$200</Link>

                                    </div>
                                </div>


                                <div className="item">
                                    <div className="card-pack">
                                        <div className="card-pk-img">
                                            <img src="./imgs/image 29.png" width="100%" alt="Card pack" />
                                            <span className='label'>RARE</span>
                                        </div>
                                        <p>Card Name Here</p>
                                        <Link to={"#"}>$200</Link>

                                    </div>
                                </div>





                            </OwlCarousel>;



                        </div>
                    </div>
                </div>
            </section>
            {/* CARDS SECTION END */}


            {/* STARTED NOW */}
            <StartNow />

        </>
    )
}

export default Pack