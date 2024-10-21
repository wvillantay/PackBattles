import React from 'react'
import "./PlayerProgress.css"
const PlayerProgress = ({progress}) => {
    return (
        <>
            <div className="player-progress">
                <div className="progress-inner" style={ {width: `${progress}%`}}></div>
            </div>

        </>
    )
}

export default PlayerProgress