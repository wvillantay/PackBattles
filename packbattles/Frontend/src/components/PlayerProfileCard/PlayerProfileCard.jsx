import React from 'react'
import "./PlayerProfileCard.css";
const PlayerProfileCard = ({avatar, name, isWinner}) => {
  return (
    <>
        <div className={`player-pro-card d-flex align-items-center ${isWinner ? "active": null}`}>
            <img src={avatar} alt="" />
            <p className='ms-3'>{name}</p>
        </div>
    </>
  )
}

export default PlayerProfileCard