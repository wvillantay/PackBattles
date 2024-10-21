import React from 'react'
import { IoMdSearch } from 'react-icons/io'
import "./Events.css"
import { EventCardData } from '../../components/EventCardData'
import EventCard from '../../components/EventCard/EventCard'
import StartNow from '../../components/StartNow/StartNow'
const Events = () => {
    return (
        <>
            <section className='events-section'>
                {/* BG */}
                <div className="packs-bg ">
                    <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                    <img className='bg-img' src="./imgs/image 3.png" alt="" />
                </div>
                {/* BG END */}
                <div className="container">
                    <h2>Events</h2>

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


                    <div className="events-wrap">
                        <div className="row">
                            {
                                EventCardData?.map((data, index) => (
                                    <div className="col-lg-4 col-sm-6 my-5" data-aos="zoom-in" key={index}>
                                        <EventCard data={data} />
                                    </div>
                                ))
                            }

                        </div>
                    </div>


                </div>
            </section>

            {/* START NOW */}
            <StartNow />
        </>
    )
}

export default Events