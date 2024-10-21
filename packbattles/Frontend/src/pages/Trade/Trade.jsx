import React from 'react'
import { FaPlus } from 'react-icons/fa6';
import { IoMdSearch } from "react-icons/io"
import "./Trade.css"
import { Link } from 'react-router-dom';
import { IdealCardData } from '../../components/IdealCardData';
import HowItsWork from "../../components/HowItsWork/HowItsWork"
import StartNow from '../../components/StartNow/StartNow';
const Trade = () => {
    return (
        <>
            <section className='trade'>
                {/* BG */}
                <div className="packs-bg ">
                    <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                    <img className='bg-img' src="./imgs/image 3.png" alt="" />
                </div>
                {/* BG END */}
                <div className="container">
                    <h2 className='text-center' data-aos="fade-down">Trade</h2>

                    <div className="row mt-5 pt-5">

                        <div className="col-md-4" data-aos="fade-right">
                            <p className='text-center'>INVENTORY</p>
                            <div className="select-box d-flex justify-content-center align-items-center">
                                <div className="box-content">
                                    <div className="plus-icon">
                                        <FaPlus />
                                    </div>
                                    <p>Select Card you want to trade</p>
                                </div>
                            </div>
                            <h3 className='text-center'>$0.00</h3>


                        </div>

                        <div className="col-md-4 text-center" data-aos="fade-up">
                            <div className="up-meter mt-5">
                                <img src="./imgs/Group 40106.png" width={"100%"} alt="" />
                            </div>
                            <button className='trade-btn'>Trade</button>
                        </div>

                        <div className="col-md-4" data-aos="fade-left">
                            <p className='text-center'>EXCHANGE</p>

                            <div className="select-box ">
                                <div className="img-wrap">
                                    <img src="./imgs/image 29 (1).png" width={"100%"} alt="" />
                                </div>
                                {/* <div className="box-content">
                                        <div className="plus-icon">
                                            <FaPlus />
                                        </div>
                                        <p>Select Card you want to obtain</p>
                                    </div> */}
                            </div>
                            <h3 className='text-center'>$0.00</h3>
                        </div>

                    </div>


                </div>
            </section>

            {/* TRADE IDEAL CARDS SECTION START */}
            <section className='ideal-card-wrap'>
                <div className="container">
                    <div className="ideal-card-container">

                        {/* SEARCH CONTAINER START */}
                        <div className="search-container w-100" data-aos="zoom-in">
                            <div className="d-flex flex-wrap flex-sm-nowrap align-items-center justify-content-between ">
                                {/* SEARCH  */}
                                <div className="search " data-aos="fade-right">
                                    <form >
                                        <div className="input-wrap">
                                            <input type="text" placeholder='Search Packs' />
                                            <span className='search-icon'>
                                                <IoMdSearch />
                                            </span>
                                        </div>
                                    </form>
                                </div>

                                {/* FILTER */}
                                <div className="d-flex align-items-center gap-4">

                                    <div className="sort" data-aos="fade-right">

                                        <select name="" id="">
                                            <option value="popularity">Popularity</option>
                                            <option value="ascending">Ascending</option>
                                            <option value="descending">Ascending</option>
                                        </select>

                                    </div>
                                    <div className="sort" data-aos="fade-right">
                                        <label >
                                            Cost &gt;
                                        </label>

                                        <input className='fil-input' type="number" placeholder='$0' />

                                    </div>

                                    <div className="sort">
                                        <label >Sort By Price</label>
                                        <button className='sbp'>
                                            <img src="./imgs/bi_sort-up.png" alt="" />
                                        </button>
                                    </div>

                                </div>

                            </div>
                        </div>
                        {/* SEARCH CONTAINER END */}

                        {/* IDEAL CARD  START */}
                        <div className="row px-4">

                            <div className="col-lg-6 text-center" data-aos="fade-right">
                                <div className="ideal-card">

                                    <img className='line-top' src="./imgs/Vector 26.svg" alt="" />
                                    <img className='line-down' src="./imgs/Vector 27.svg" alt="" />

                                    <p>Ideal Card</p>
                                    <div className="ideal-card-img">
                                        <img src="./imgs/image 29 (2).png" width={"100%"} alt="" />
                                    </div>
                                    <h3>$200</h3>
                                </div>
                            </div>

                            {/* IDEAL CARDS   */}
                            <div className="col-lg-6">
                                <div className="row">
                                    {
                                        IdealCardData?.map((data, index) => (
                                            <div className="col-sm-4 col-6 text-center ideal-sm-card my-4" data-aos="fade-up" key={index} >
                                                <div className="ideal-card-img">
                                                    <img src={data.img} alt="" />
                                                </div>
                                                <p>{data.name}</p>
                                                <Link>${data.price}</Link>
                                            </div>
                                        ))
                                    }

                                </div>
                            </div>
                            {/* IDEAL CARDS END  */}

                        </div>
                        {/* IDEAL CARD  END */}


                    </div>
                </div>
            </section>
            {/* TRADE IDEAL CARDS SECTION END */}


            {/* HOW ITS WORK */}
            <HowItsWork/>

            {/* START Now */}
            <StartNow/>

        </>
    )
}

export default Trade