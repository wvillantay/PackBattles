import React from 'react'
import { Link } from 'react-router-dom'
import "./Button.css"
const Button = (props) => {
    return (
        <>
            <div className="btns">
                <Link to={props.url}>{props.text}</Link>
            </div>
        </>
    )
}

export default Button;