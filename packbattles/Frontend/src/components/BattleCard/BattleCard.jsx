import React from 'react'
import "./BattleCard.css"
const BattleCard = ({img}) => {
  return (
    <>
        <div className="battleCard">
            <img src={img} width={"100%"} alt="" />
        </div>
    </>
  )
}

export default BattleCard