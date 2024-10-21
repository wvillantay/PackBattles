import React from 'react'
import "./DiceRoll.css"
import ModeCard from '../../components/ModeCard/ModeCard'
import BattleCard from '../../components/BattleCard/BattleCard'
import PlayerProgress from '../../components/PlayerProgress/PlayerProgress'
const DiceRoll = () => {
    return (
        <>
            <section className='dice-roll '>
                {/* BG */}
                <div className="packs-bg ">
                    <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                    <img className='bg-img' src="./imgs/image 3 (2).png" alt="" />
                </div>
                {/* BG END */}
                <div className="container">

                    <div className="d-flex flex-wrap">

                        <div className="item">
                            <ModeCard icon="../imgs/Group 40146 (1).svg" heading="Dice Roll" name="Mode" />
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

                            <div className="col-lg-4 mb-5">
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
                                                <button >$100</button>
                                            </div>

                                        </div>

                                        <div className="player-card-pack">

                                            <PlayerProgress progress="30" />

                                            <img src="./imgs/Group 40135 (1).png" width={"100%"} alt="" />

                                            <div className="d-flex justify-content-center mt-5">
                                                <button className='m-btn px-5'>Roll Dices</button>
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


                                    <div className="vs-card ">
                                        <div className="player-battle-card2 mx-auto">
                                            <img src="./imgs/karte1 2 (13).png" alt="" />
                                        </div>

                                        <div className="player-battle-btn mb-4">
                                            <button >$0.55</button>
                                        </div>

                                        <span >Reward Pack</span>

                                    </div>
                                </div>
                            </div>
                            {/* VS SECTION END */}



                            <div className="col-lg-4 ms-auto mt-5 mt-lg-0">
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
                                                <button >$100</button>
                                            </div>

                                        </div>

                                        <div className="player-card-pack">

                                            <PlayerProgress progress="30" />

                                            <img src="./imgs/Group 40135 (1).png" width={"100%"} alt="" />

                                            <div className="d-flex justify-content-center mt-5">
                                                <button className='m-btn px-5'>Roll Dices</button>
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

export default DiceRoll