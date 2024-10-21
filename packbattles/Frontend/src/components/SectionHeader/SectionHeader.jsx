import React from 'react'
import Button from '../Button/Button'

import "./SectionHeader.css"

const SectionHeader = ({ heading, btnText, btnUrl }) => {
    return (
        <>
            <section className='section-header'>
                <div className="container">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2>{heading}</h2>

                        <Button text={btnText} url={btnUrl} />

                    </div>
                </div>
            </section>
        </>
    )
}

export default SectionHeader