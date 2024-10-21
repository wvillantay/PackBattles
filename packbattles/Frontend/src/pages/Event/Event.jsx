import React from 'react'
import "./Event.css";
import Button from "../../components/Button/Button"
import HowItsWork from '../../components/HowItsWork/HowItsWork';
import StartNow from '../../components/StartNow/StartNow';
const Event = () => {
    return (
        <>
            <section className='event-section'>
                {/* BG */}
                <div className="packs-bg ">
                    <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                    <img className='bg-img' src="./imgs/image 3 (1).png" alt="" />
                </div>
                {/* BG END */}
                <div className="contianer">

                    <div className="d-flex justify-content-center">
                        <div className="event-toggle-wrap" data-aos="fade-down">
                            <button  className='active'>Main</button>
                            <button >Upgrade</button>
                            <button >Game</button>
                            <button >Leaderboard</button>
                        </div>
                    </div>

                    <h2 className='text-center my-5' data-aos="zoom-in">Event Name</h2>

                    <div className="count-down">
                        <div className="count-box" data-aos="fade-right">
                            <h2>3d</h2>
                        </div>
                        <div className="count-box" data-aos="fade-up">
                            <h2>5h</h2>
                        </div>
                        <div className="count-box" data-aos="fade-down">
                            <h2>5m</h2>
                        </div>
                        <div className="count-box" data-aos="fade-left">
                            <h2>6s</h2>
                        </div>
                    </div>

                    <div className="event-btn d-flex align-items-center justify-content-center" data-aos="fade-up">
                        <Button text="Sign Up" url="#" />
                    </div>
                    
                </div>
            </section>

            {/* HOW IT START SECTION */}
            <HowItsWork/>
            

            {/* START NOW SECTION */}
            <StartNow/>
        </>
    )
}

export default Event