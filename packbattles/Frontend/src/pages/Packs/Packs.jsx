import React from 'react'
import { IoMdSearch } from "react-icons/io";
import "./Packs.css";

import { PackCardData } from '../../components/PackCardData';
import PackCard from '../../components/PackCard/PackCard';
import StartNow from '../../components/StartNow/StartNow';

const Packs = () => {
    return (
        <>
            <section className="packs">
                {/* BG */}
                <div className="packs-bg ">
                    <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                    <img className='bg-img' src="./imgs/image 3.png" alt="" />
                </div>
                {/* BG END */}
                <div className="container">
                    <h2 data-aos="fade-down">Packs</h2>

                    <div className="search-container">
                        <div className="d-flex align-items-center justify-content-between">
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

                            <div className="sort" data-aos="fade-right">
                                <label >Sort By</label>

                                <select name="" id="">
                                    <option value="popularity">Popularity</option>
                                    <option value="ascending">Ascending</option>
                                    <option value="descending">Ascending</option>
                                </select>

                            </div>

                        </div>
                    </div>

                    <div className="row pack-cards">
                        {
                            PackCardData?.map((data, index) => (
                                <div className="col-lg-3 col-md-6 " data-aos="fade-up" key={index}>
                                    <PackCard text={data.text} active={data.active} img={data.img} url={data.url} price={data.price} />
                                </div>
                            ))
                        }

                    </div>

                    <div className="load-more-btn text-center">
                        <button id='load-btn' data-aos="zoom-in">Load More</button>
                    </div>

                </div>
            </section>

            {/* PACKS END */}


            {/* START NOW SECTION */}
            <StartNow />



        </>
    )
}

export default Packs