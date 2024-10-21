import React from 'react'
import "./HighBall.css"
import ModeCard from '../../components/ModeCard/ModeCard'
import BattleCard from '../../components/BattleCard/BattleCard'
import PlayerProgress from '../../components/PlayerProgress/PlayerProgress'
const HighBall = () => {
    return (
        <>
            <section className='high-ball'>
                {/* BG */}
                <div className="packs-bg ">
                    <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                    <img className='bg-img' src="./imgs/image 3 (2).png" alt="" />
                </div>
                {/* BG END */}
                <div className="container">

                    <div className="d-flex flex-wrap">

                        <div className="item">
                            <ModeCard icon="../imgs/Group 40146 (1).svg" heading="High Ball" name="Mode" />
                        </div>

                        <div className="item">
                            <ModeCard icon="../imgs/Group 40146.svg" heading="1 of 5" name="Rounds" />
                        </div>

                        <div className="item">
                            <ModeCard icon="../imgs/Group 40148.svg" heading="$200" name="Total Cost" />
                        </div>

                    </div>


                    {/* PLAYER CARD */}
                    <div className="player">
                        <div className="row ">

                            <div className="col-lg-4">
                                {/* PLAYER CARD */}
                                <div className="player-card-outer mx-auto">
                                    <div className="player-card">
                                        <div className="player-name d-flex align-items-center justify-content-between" >
                                            <div className="d-flex align-items-center">
                                                <div className="player-avatar">
                                                    <img src="./imgs/Ellipse 4.svg" alt="" />
                                                </div>
                                                <p className='my-0 ms-4'>Player Name</p>
                                            </div>
                                            <div className="player-battle-btn mt-0">
                                                <button >$200</button>
                                            </div>

                                        </div>

                                        <div className="player-card-pack">

                                            <PlayerProgress progress="5" />

                                            <p className='text-center'>Pack Name Here</p>
                                            <div className="player-battle-card ">
                                                <img src="./imgs/karte1 2 (13).png" alt="" />
                                            </div>

                                            <div className="player-battle-btn">
                                                <button >$0.55</button>
                                            </div>


                                        </div>

                                    </div>

                                  

                                </div>
                                {/* PLAYER CARD END*/}

                            </div>


                            {/* VS SECTION */}
                            <div className="col-lg-4 mx-auto">
                                <div className="players-vs text-center ">
                                    <h2>VS</h2>
                                    <div className="vs-card">
                                        <img className='main-img' width={"100%"} src="./imgs/Group 40135.png" alt="" />
                                    </div>
                                </div>
                            </div>
                            {/* VS SECTION END */}



                            <div className="col-lg-4 ms-auto">
                                {/* PLAYER CARD */}
                                <div className="player-card-outer mx-auto ms-lg-auto">
                                    <div className="player-card d-grid align-items-center">


                                        <div className="loader text-center">
                                            <img src="./imgs/plus (1) (3).png" alt="" />
                                            <p>The lobby is looking for a player</p>
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

export default HighBall