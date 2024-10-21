import React from 'react'
import "./Battles.css";
import { IoMdSearch } from 'react-icons/io';
import StartNow from "../../components/StartNow/StartNow"
const Battles = () => {
    return (
        <>
            <section className='battles'>
                {/* BG */}
                <div className="packs-bg ">
                    <img className='bar-img' src="./imgs/Rectangle 15.png" alt="" />
                    <img className='bg-img' src="./imgs/image 3.png" alt="" />
                </div>
                {/* BG END */}
                <div className="container">
                    <div className="heading">
                        <h2>Battles</h2>
                        <p>Lorem ipsum dolor sit amet consectetur. Nulla habitant accumsan commodo porttitor. Enim malesuada.</p>
                    </div>

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
                                    <label>Sort By</label>
                                    <select name="" id="">
                                        <option value="popularity">Popularity</option>
                                        <option value="ascending">Ascending</option>
                                        <option value="descending">Ascending</option>
                                    </select>

                                </div>
                                <div className="st-battle">
                                    <button className='m-btn'>Start New Battle</button>
                                </div>


                            </div>

                        </div>
                    </div>
                    {/* SEARCH CONTAINER END */}

                    {/* TABS SECTION START */}
                    <div className="tabs">
                        <ul>
                            <li><button className='active'>All Modes</button></li>
                            <li><button>Battles</button></li>
                            <li><button>Spectate mode</button></li>
                            <li><button>King of the hill</button></li>
                            <li><button>Dice roll</button></li>
                            <li><button>Low ball</button></li>
                            <li><button>King of the hill low roll</button></li>
                            <li><button>Duel battle</button></li>
                        </ul>
                    </div>
                    {/* TABS SECTION END */}

                    {/* TABLES START */}
                    <div className="table-responsive battle-table">
                        <table className='table'>
                            <thead>
                                <tr>
                                    <th>ROUND</th>
                                    <th>BATTLE CARDS</th>
                                    <th>MODE</th>
                                    <th>COST</th>
                                    <th>PLAYERS</th>
                                    <th>ACTIONS</th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr>
                                    <td><p className='round' >#5</p></td>
                                    <td>   
                                        <div className="d-flex gap-2">

                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (4).png" width={"100%"} alt="" />
                                            </div>

                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (5).png" width={"100%"} alt="" />
                                            </div>
                                            
                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (6).png" width={"100%"} alt="" />
                                            </div>
                                            
                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (7).png" width={"100%"} alt="" />
                                            </div>
                                            
                                        </div>

                                    </td>
                                    <td>
                                        <p>King of the hill</p>
                                    </td>
                                    <td>
                                        <p>$258.55</p>
                                    </td>
                                    <td>

                                        <div className="player">
                                            <span>2</span>
                                            <div className="user user1">
                                                <img src="./imgs/Ellipse 4 (4).png" alt="" />
                                            </div>
                                            <div className="user user2">
                                                <img src="./imgs/Ellipse 5.png" alt="" />
                                            </div>
                                        </div>
                                        
                                    </td>
                                    <td>
                                        <div className="act-btns">
                                            <button className='join'>Join</button>
                                            <button>Watch</button>
                                        </div>
                                    </td>
                                </tr>

                                <tr>
                                    <td><p className='round' >#5</p></td>
                                    <td>   
                                        <div className="d-flex gap-2">

                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (4).png" width={"100%"} alt="" />
                                            </div>

                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (5).png" width={"100%"} alt="" />
                                            </div>
                                            
                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (6).png" width={"100%"} alt="" />
                                            </div>
                                            
                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (7).png" width={"100%"} alt="" />
                                            </div>
                                            
                                        </div>

                                    </td>
                                    <td>
                                        <p>Dice roll</p>
                                    </td>
                                    <td>
                                        <p>$258.55</p>
                                    </td>
                                    <td>

                                        <div className="player">
                                            <span>2</span>
                                            <div className="user user1">
                                                <img src="./imgs/Ellipse 4 (4).png" alt="" />
                                            </div>
                                            <div className="user user2">
                                                <img src="./imgs/Ellipse 5.png" alt="" />
                                            </div>
                                        </div>
                                        
                                    </td>
                                    <td>
                                        <div className="act-btns">
                                            <button className='join'>Join</button>
                                            <button>Watch</button>
                                        </div>
                                    </td>
                                </tr>

                                <tr className='mt-4'>
                                    <td><p className='round' >#5</p></td>
                                    <td>   
                                        <div className="d-flex gap-2">

                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (4).png" width={"100%"} alt="" />
                                            </div>

                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (5).png" width={"100%"} alt="" />
                                            </div>
                                            
                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (6).png" width={"100%"} alt="" />
                                            </div>
                                            
                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (7).png" width={"100%"} alt="" />
                                            </div>
                                            
                                        </div>

                                    </td>
                                    <td>
                                        <p>Low ball</p>
                                    </td>
                                    <td>
                                        <p>$258.55</p>
                                    </td>
                                    <td>

                                        <div className="player">
                                            <span>2</span>
                                            <div className="user user1">
                                                <img src="./imgs/Ellipse 4 (4).png" alt="" />
                                            </div>
                                            <div className="user user2">
                                                <img src="./imgs/Ellipse 5.png" alt="" />
                                            </div>
                                        </div>
                                        
                                    </td>
                                    <td>
                                        <div className="act-btns">
                                            <button className='join'>Join</button>
                                            <button>Watch</button>
                                        </div>
                                    </td>
                                </tr>


                                <tr className='mt-4'>
                                    <td><p className='round' >#5</p></td>
                                    <td>   
                                        <div className="d-flex gap-2">

                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (4).png" width={"100%"} alt="" />
                                            </div>

                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (5).png" width={"100%"} alt="" />
                                            </div>
                                            
                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (6).png" width={"100%"} alt="" />
                                            </div>
                                            
                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (7).png" width={"100%"} alt="" />
                                            </div>
                                            
                                        </div>

                                    </td>
                                    <td>
                                        <p>King of the hill low roll</p>
                                    </td>
                                    <td>
                                        <p>$258.55</p>
                                    </td>
                                    <td>

                                        <div className="player">
                                            <span>2</span>
                                            <div className="user user1">
                                                <img src="./imgs/Ellipse 4 (4).png" alt="" />
                                            </div>
                                            <div className="user user2">
                                                <img src="./imgs/Ellipse 5.png" alt="" />
                                            </div>
                                        </div>
                                        
                                    </td>
                                    <td>
                                        <div className="act-btns">
                                            <button className='join'>Join</button>
                                            <button>Watch</button>
                                        </div>
                                    </td>
                                </tr>

                                <tr className='mt-4'>
                                    <td><p className='round' >#5</p></td>
                                    <td>   
                                        <div className="d-flex gap-2">

                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (4).png" width={"100%"} alt="" />
                                            </div>

                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (5).png" width={"100%"} alt="" />
                                            </div>
                                            
                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (6).png" width={"100%"} alt="" />
                                            </div>
                                            
                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (7).png" width={"100%"} alt="" />
                                            </div>
                                            
                                        </div>

                                    </td>
                                    <td>
                                        <p>Duel battle</p>
                                    </td>
                                    <td>
                                        <p>$258.55</p>
                                    </td>
                                    <td>

                                        <div className="player">
                                            <span>2</span>
                                            <div className="user user1">
                                                <img src="./imgs/Ellipse 4 (4).png" alt="" />
                                            </div>
                                            <div className="user user2">
                                                <img src="./imgs/Ellipse 5.png" alt="" />
                                            </div>
                                        </div>
                                        
                                    </td>
                                    <td>
                                        <div className="act-btns">
                                            <button className='join'>Join</button>
                                            <button>Watch</button>
                                        </div>
                                    </td>
                                </tr>

                                <tr className='mt-4'>
                                    <td><p className='round' >#5</p></td>
                                    <td>   
                                        <div className="d-flex gap-2">

                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (4).png" width={"100%"} alt="" />
                                            </div>

                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (5).png" width={"100%"} alt="" />
                                            </div>
                                            
                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (6).png" width={"100%"} alt="" />
                                            </div>
                                            
                                            <div className="bt-card">
                                                <img src="./imgs/image 30 (7).png" width={"100%"} alt="" />
                                            </div>
                                            
                                        </div>

                                    </td>
                                    <td>
                                        <p>Low ball</p>
                                    </td>
                                    <td>
                                        <p>$258.55</p>
                                    </td>
                                    <td>

                                        <div className="player">
                                            <span>2</span>
                                            <div className="user user1">
                                                <img src="./imgs/Ellipse 4 (4).png" alt="" />
                                            </div>
                                            <div className="user user2">
                                                <img src="./imgs/Ellipse 5.png" alt="" />
                                            </div>
                                        </div>
                                        
                                    </td>
                                    <td>
                                        <div className="act-btns">
                                            <button className='join'>Join</button>
                                            <button>Watch</button>
                                        </div>
                                    </td>
                                </tr>
                                
                            </tbody>
                            
                        </table>
                    </div>
                    {/* TABLES END */}

                </div>
            </section>


            {/* START NOW */}
            <StartNow/>
        </>

    )
}

export default Battles