import React from 'react'
import "./StartNow.css";
import { Link } from 'react-router-dom';

const StartNow = () => {
    return (
        <>
            <section className='start-now'>
                <div className="container">
                    <div className="start-wrap">
                        <img className='start-bg' src="./imgs/Rectangle 56.svg" alt="Bg image" />
                        <div className="col-md-10 mx-auto">
                            <div className="row align-items-center">
                                <div className="col-md-5 text-center text-md-start" data-aos="fade-down">
                                    <h2>Get started now</h2>
                                    <p>Lorem ipsum dolor sit amet consectetur. Aliquam.</p>
                                    <Link to="#">Start Now</Link>
                                </div>

                                <div className="col-md-6 ms-auto " data-aos="fade-left">
                                    <div className="start-now-img text-center">
                                        <img src="./imgs/Group 40098.png" width={"100%"} alt="Pack im" />
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}

export default StartNow