import React from 'react'
import "./ModeCard.css"
const ModeCard = ({icon, heading,  name}) => {
  return (
    <>
        <div className="mode-card">
            <div className="d-flex align-items-center">
                <div className="card-icon">
                    <img  src={icon} alt="" />
                </div>
                <h4>{heading}</h4>
            </div>
            <span>{name}</span>
        </div>
    </>
  )
}

export default ModeCard