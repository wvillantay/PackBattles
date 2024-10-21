import React from 'react'
import "./HowItsWork.css";
const HowItsWork = () => {
    return (
        <>
            <section className='how-its-work'>
                <div className="container">
                    <h2 className='text-center'>How It Works</h2>
                    <div className="row g-0 work-steps">

                        <div className="col-lg-3 col-sm-6 my-4   ">
                            <div className="work-step ">

                                <div className="step-count" data-aos="fade-right">
                                    <h3>1</h3>
                                </div>
                                <div className="px-3" data-aos="fade-up">

                                    <p className='fw-semibold'>Step 1</p>
                                    <p className='fw-normal'>Lorem ipsum dolor sit amet consectetur. Aliquam.</p>

                                </div>
                            </div>
                        </div>

                        <div className="col-lg-3 col-sm-6 my-4">
                            <div className="work-step ">
                                <div className="step-count" data-aos="fade-down">
                                    <h3>2</h3>
                                </div>
                                <div className="px-3" data-aos="zoom-in">

                                    <p className='fw-semibold'>Step 2</p>
                                    <p className='fw-normal'>Lorem ipsum dolor sit amet consectetur. Aliquam.</p>

                                </div>

                            </div>
                        </div>

                        <div className="col-lg-3 col-sm-6 my-4">
                            <div className="work-step ">
                                <div className="step-count" data-aos="fade-up">
                                    <h3>3</h3>
                                </div>
                                <div className="px-3" data-aos="zoom-out">

                                    <p className='fw-semibold'>Step 3</p>
                                    <p className='fw-normal'>Lorem ipsum dolor sit amet consectetur. Aliquam.</p>

                                </div>

                            </div>
                        </div>

                        <div className="col-lg-3 col-sm-6 my-4">
                            <div className="work-step line-none">
                                <div className="step-count" data-aos="fade-up">
                                    <h3>4</h3>
                                </div>
                                <div className="px-3" data-aos="fade-left">

                                    <p className='fw-semibold'>Step 4</p>
                                    <p className='fw-normal'>Lorem ipsum dolor sit amet consectetur. Aliquam.</p>

                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            </section>


        </>
    )
}

export default HowItsWork