import React from 'react'
import ModeCard from '../../components/ModeCard/ModeCard'

import "./KingOfTheHillSelect.css"
import PlayerProgress from '../../components/PlayerProgress/PlayerProgress'

const KingOfTheHillSelect = () => {
    return (
        <>
            <section className='king-of-the-hill-select'>
                {/* BG */}
                <div className="packs-bg ">
                    <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                    <img className='bg-img' src="./imgs/image 3 (3).png" alt="" />
                </div>
                {/* BG END */}

                <div className="container">
                    {/* TOP CARD */}
                    <div className="d-flex flex-wrap">

                        <div className="item">
                            <ModeCard icon="../imgs/Group 40146 (1).svg" heading="King Of The Hill" name="Mode" />
                        </div>

                        <div className="item">
                            <ModeCard icon="../imgs/Group 40146.svg" heading="1 of 5" name="Rounds" />
                        </div>

                        <div className="item">
                            <ModeCard icon="../imgs/Group 40148.svg" heading="$174.00" name="Total Cost for all players" />
                        </div>

                    </div>
                    {/* TOP CARD */}


                    {/* PLAYER CARD */}
                    <div className="player">
                        <div className="row ">

                            <div className="col-md-4">
                                {/* PLAYER CARD */}
                                <div className="player-card-outer mx-auto">
                                    <div className="player-card">
                                        <div className="player-name d-flex align-items-center" >
                                            <div className="player-avatar">
                                                <img src="./imgs/Ellipse 4.svg" alt="" />
                                            </div>
                                            <p className='my-0 ms-4'>Player Name</p>
                                        </div>

                                        <div className="player-card-pack">

                                            <PlayerProgress progress="30" />

                                            <div className="select-pack-card text-center">
                                                <div className="pack-card-hint">
                                                    <img src="./imgs/plus (2) (1).png" alt="" />
                                                    <p>Select Pack you want to play with</p>
                                                </div>
                                            </div>




                                        </div>

                                    </div>



                                </div>
                                {/* PLAYER CARD END*/}

                            </div>


                            {/* VS SECTION */}
                            <div className="col-md-4 mx-auto">
                                <div className="players-vs text-center ">
                                    <h2>VS</h2>
                                    <div className="vs-card">
                                        <img className='icon' src="./imgs/Group 40124.png" alt="" />
                                        <h4>$174.00</h4>
                                        <span>Total Amount Awarded</span>
                                    </div>
                                </div>
                            </div>
                            {/* VS SECTION END */}



                            <div className="col-md-4 ms-auto">
                                {/* PLAYER CARD */}
                                <div className="player-card-outer mx-auto ms-lg-auto">
                                    <div className="player-card">
                                        <div className="player-name d-flex align-items-center" >
                                            <div className="player-avatar">
                                                <img src="./imgs/Ellipse 4.svg" alt="" />
                                            </div>
                                            <p className='my-0 ms-4'>Player Name</p>
                                        </div>

                                        <div className="player-card-pack">

                                            <PlayerProgress progress="30" />

                                            <div className="select-pack-card text-center">
                                                <div className="pack-card-hint">
                                                    <img src="./imgs/plus (2) (1).png" alt="" />
                                                    <p>Select Pack you want to play with</p>
                                                </div>
                                            </div>



                                        </div>

                                    </div>



                                </div>
                                {/* PLAYER CARD END*/}

                            </div>




                        </div>
                    </div>
                    {/* PLAYER CARD END */}








                </div>

            </section>
        </>
    )
}

export default KingOfTheHillSelect