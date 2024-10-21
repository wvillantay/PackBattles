import React from 'react'
import "./TestimonialCard.css"
const TestimonialCard = ({data}) => {
  return (
    <>
      <div className="testi-card">
        <div className="stars">
          <img src={data?.stars} alt="stars" />
        </div>
        <p>{data?.text}</p>

        <div className="user-profile d-flex align-items-center justify-content-center">
          <img src={data?.userProfile} alt="User" />
          <p>{data?.username}</p>
        </div>

      </div>
    </>
  )
}

export default TestimonialCard