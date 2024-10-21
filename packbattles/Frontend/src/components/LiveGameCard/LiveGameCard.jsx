import React from 'react'
import { Link } from 'react-router-dom'
import "./LiveGameCard.css";
const LiveGameCard = ({ data }) => {
    return (
        <>
            <div className="live-game-card h-100">
                <div className="card-img">
                    <img src={data.img} width={"100%"}  alt="Live Games card " />
                </div>
                <div className="card-text">
                    <div className="d-flex justify-content-between ">
                        <h5 className='m-0'>{data?.name}</h5>
                        <div className="d-flex align-items-center">
                            <img className='g-icon d-inline-block mt-1' src="./imgs/icon.svg" alt="Games Icon" />
                            <span className='d-inline-block'>{data.point}</span>
                        </div>
                    </div>

                    <div className="d-flex align-items-center justify-content-between users">
                        <div className="user">
                            <img src={data.user1} className='user1' alt="Live games user"  />
                        </div>
                        <div className="vs-line">
                            <img src="./imgs/Group 40145.png"  alt="user" />
                        </div>
                        <div className="user">
                            <img src={data.user2} className=' user2' alt="user" />
                        </div>

                    </div>

                    <div className="live-g-btns d-grid gap-3">
                        <Link to={data.join} className='join'>Join</Link>
                        <Link to={data.watch} className='watch'>Watch</Link>
                    </div>

                </div>
            </div>
        </>
    )
}

export default LiveGameCard