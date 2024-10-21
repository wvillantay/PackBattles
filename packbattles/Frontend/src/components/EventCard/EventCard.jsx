import React from 'react'
import { Link } from 'react-router-dom'
import "./EventCard.css"
const EventCard = ({data}) => {
    const {img, heading, text, date, btnText, btnUrl} = data;
    return (
        <>
            <div className="event-card">
                <div className="ev-img">
                    <img src={img} alt="" />
                    <span className='label'>{date}</span>
                </div>
                <div className="ev-text px-3">
                    <h4>{heading}</h4>
                    <p>{text}</p>

                    <Link className='ev-btn' to={btnUrl}>{btnText}</Link>
                </div>

            </div>
        </>
    )
}

export default EventCard