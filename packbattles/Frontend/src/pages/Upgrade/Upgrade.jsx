import React from 'react'
import "./Upgrade.css"
import { FaPlus } from "react-icons/fa6";
import StartNow from "../../components/StartNow/StartNow"
const Upgrade = () => {
    return (
        <>
            <section className='upgrade'>
                {/* BG */}
                <div className="packs-bg ">
                    <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                    <img className='bg-img' src="./imgs/image 3.png" alt="" />
                </div>
                {/* BG END */}
                <div className="container">
                    <h2 className='text-center mb-5'>Upgrade Room</h2>

                    <div className="row ">

                        <div className="col-md-4">
                            <div className="select-box d-flex justify-content-center align-items-center">
                                <div className="box-content">
                                    <div className="plus-icon">
                                        <FaPlus />
                                    </div>
                                    <p>Select Card you want to upgrade</p>
                                </div>
                            </div>
                            <div className="updrade-btns">
                                <button>Select All</button>
                                <button className='active'>Random</button>
                            </div>
                            <div className="u-cards">
                                <div className="row">
                                    <div className="col-3">
                                        <div className="u-card p-2">
                                            <img src="./imgs/image 30.png" width={"100%"} alt="" />
                                        </div>
                                    </div>
                                    <div className="col-3">
                                        <div className="u-card p-2">
                                            <img src="./imgs/image 30 (1).png" width={"100%"} alt="" />
                                        </div>
                                    </div>
                                    <div className="col-3">
                                        <div className="u-card p-2">
                                            <img src="./imgs/image 30 (2).png" width={"100%"} alt="" />
                                        </div>
                                    </div>
                                    <div className="col-3">
                                        <div className="u-card p-2">
                                            <img src="./imgs/image 30 (3).png" width={"100%"} alt="" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-4 text-center">
                            <div className="up-meter mt-5 pt-5">
                                <img src="./imgs/Frame.png" width={"100%"} alt="" />
                            </div>
                        </div>

                        <div className="col-md-4">
                            <div className="select-box d-flex justify-content-center align-items-center">
                                <div className="box-content">
                                    <div className="plus-icon">
                                        <FaPlus />
                                    </div>
                                    <p>Select Card you want to obtain</p>
                                </div>
                            </div>
                            <div className="updrade-btns ">
                                <button className='btn-full'>Upgrade Card</button>
                            </div>
                            <div className="u-x-btn">
                               <button>1.5x</button>
                               <button>2x</button>
                               <button className='active'>5x</button>
                               <button>10x</button>
                               <button>20x</button>
                            </div>
                        </div>

                    </div>

                </div>
            </section>

            {/* START NOW */}
            <StartNow/>
        </>
    )
}

export default Upgrade