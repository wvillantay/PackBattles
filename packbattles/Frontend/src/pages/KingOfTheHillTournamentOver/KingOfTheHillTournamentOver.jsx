import React from 'react'
import "./KingOfTheHillTournamentOver.css"
import BattleCard from '../../components/BattleCard/BattleCard'
import PlayerProgress from '../../components/PlayerProgress/PlayerProgress'
import ModeCard from '../../components/ModeCard/ModeCard'
import PlayerProfileCard from '../../components/PlayerProfileCard/PlayerProfileCard'
import { Link } from 'react-router-dom'
const KingOfTheHillTournamentOver = () => {
    return (
        <>
            {/* BATTLE POPUP */}
            <section className='battle-popup-outer king-of-the-hill-tournamnet-over'>
                <div className="battle-popup">
                    <h2 className='text-center'>Second  Round Over</h2>

                    <div className="d-flex flex-wrap flex-column flex-lg-row align-items-center align-items-lg-end justify-content-center mb-5 pb-5">
                        <div className="d-flex justify-content-center align-items-end  gap-3 me-lg-auto">
                            <div className="player-card ">
                                <p className='text-center fw-bolder my-3'>Winner</p>
                                <PlayerProfileCard avatar="./imgs/Ellipse 4 (5).png" name="Player name" isWinner={true} />

                            </div>
                            <div className="player-card">
                                <PlayerProfileCard avatar="./imgs/Ellipse 4 (6).png" name="Player name" isWinner={false} />

                            </div>
                        </div>



                        <div className="d-flex  justify-content-center align-items-end  gap-3 mt-4 ms-lg-auto">
                            <div className="player-card ">
                                <PlayerProfileCard avatar="./imgs/Ellipse 4 (7).png" name="Player name" isWinner={false} />

                            </div>
                            <div className="player-card">
                                <PlayerProfileCard avatar="./imgs/Ellipse 4 (8).png" name="Player name" isWinner={false} />

                            </div>
                        </div>
                    </div>


                    <div className="d-flex justify-content-center align-items-start gap-3 mt-5 winners pt-5">
                        <div className="player-card ">
                            <PlayerProfileCard avatar="./imgs/Ellipse 4 (5).png" name="Player name" isWinner={true} />
                            <p className='text-center fw-bold mt-3'>Winner</p>
                        </div>
                        <div className="player-card">
                            <PlayerProfileCard avatar="./imgs/Ellipse 4 (7).png" name="Player name" isWinner={false} />

                        </div>
                    </div>


                    <div className="players-vs text-center my-0 mb-0 mt-5">
                        <div className="vs-card">
                            <img className='icon' src="./imgs/Group 40124.png" alt="" />
                            <h4>$370.00</h4>
                            <span>Total Amount Awarded</span>
                        </div>
                    </div>


                    <div className="popup-bottom">
                        <div className="d-flex flex-wrap align-items-center justify-content-center gap-3">
                            <Link className='new'>Create New Battle</Link>
                            <Link>Back to Battle List</Link>
                        </div>
                    </div>


                </div>
            </section>
            {/* BATTLE POPUP END */}


            <section className='king-of-the-hill'>
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

                                            <div className="text-center res">

                                                <div className="player-battle-btn">
                                                    <button >$112</button>
                                                </div>

                                            </div>






                                        </div>

                                    </div>



                                </div>

                                <div className="player-battles-cards d-flex ">
                                    <div className="item">
                                        <BattleCard img={"./imgs/image 30 (8).png"} />
                                    </div>

                                    <div className="item">
                                        <BattleCard img={"./imgs/image 30 (9).png"} />
                                    </div>

                                    <div className="item">
                                        <BattleCard img={"./imgs/image 30 (10).png"} />
                                    </div>

                                    <div className="item">
                                        <BattleCard img={"./imgs/image 30 (11).png"} />
                                    </div>
                                    <div className="item">
                                        <BattleCard img={"./imgs/image 30 (12).png"} />
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

                                            <div className="text-center res">
                                                <p className='my-0'>Winner</p>

                                                <div className="player-battle-btn mt-2">
                                                    <button >$150</button>
                                                </div>
                                            </div>



                                        </div>

                                    </div>



                                </div>

                                <div className="player-battles-cards d-flex ">
                                    <div className="item">
                                        <BattleCard img={"./imgs/image 30 (8).png"} />
                                    </div>

                                    <div className="item">
                                        <BattleCard img={"./imgs/image 30 (9).png"} />
                                    </div>

                                    <div className="item">
                                        <BattleCard img={"./imgs/image 30 (10).png"} />
                                    </div>

                                    <div className="item">
                                        <BattleCard img={"./imgs/image 30 (11).png"} />
                                    </div>
                                    <div className="item">
                                        <BattleCard img={"./imgs/image 30 (12).png"} />
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

export default KingOfTheHillTournamentOver