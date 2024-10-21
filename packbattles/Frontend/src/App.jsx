import React, { useEffect } from 'react'
import Header from './components/Header/Header'
import axios  from 'axios';

import "bootstrap/dist/css/bootstrap.min.css"

import AOS from 'aos';
import 'aos/dist/aos.css';

import Footer from './components/Footer/Footer'
import { Routes, Route } from 'react-router-dom'

import Home from "./pages/Home/Home"
import Packs from './pages/Packs/Packs';
import Pack from './pages/Pack/Pack';
import Events from './pages/Events/Events';
import Event from './pages/Event/Event';
import Upgrade from './pages/Upgrade/Upgrade';
import Trade from './pages/Trade/Trade';
import Battles from './pages/Battles/Battles';
import DuelBattle from './pages/DuelBattle/DuelBattle';
import DuelBattleWinner from './pages/DuelBattleWinner/DuelBattleWinner';
import BattlePopup from './pages/BattlePopup/BattlePopup';
import HighBall from './pages/HighBall/HighBall';
import DiceRoll from './pages/DiceRoll/DiceRoll';
import DiceRolled from './pages/DiceRolled/DiceRolled';
import DiceRollPopup from './pages/DiceRollPopup/DiceRollPopup';
import KingOfTheHillSelect from './pages/KingOfTheHillSelect/KingOfTheHillSelect';
import KingOfTheHill from './pages/KingOfTheHill/KingOfTheHill';
import KingOfTheHillWinner from './pages/KingOfTheHillWinner/KingOfTheHillWinner';
import KingOfTheHillNextRound from './pages/KingOfTheHillNextRound/KingOfTheHillNextRound';
import KingOfTheHillTournamentOver from './pages/KingOfTheHillTournamentOver/KingOfTheHillTournamentOver';
import Login from './pages/Login/Login';
import SignUp from './pages/SignUp/SignUp';



const App = () => {

  
  const [array, setArray ]  = React.useState([]); 

  const FatchAPI = async () => {
  const response = await axios.get("http://localhost:8080/api/users");
    setArray(response.data.Users);
    // console.log(response.data.Users);
  }
  
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: "ease"
    });
    FatchAPI();
  }, [])
  
  
  
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/packs" element={<Packs/>}/>
        <Route path="/pack" element={<Pack/>}/>
        <Route path="/events" element={<Events/>}/>
        <Route path="/event" element={<Event/>}/>
        <Route path="/upgrade" element={<Upgrade/>}/>
        <Route path="/trade" element={<Trade/>}/>
        <Route path="/battles" element={<Battles/>}/>
        <Route path="/duel-battle" element={<DuelBattle/>}/>
        <Route path="/duel-battle-winner" element={<DuelBattleWinner/>}/>
        <Route path="/battle-popup" element={<BattlePopup/>}/>
        <Route path="/high-ball" element={<HighBall/>}/>
        <Route path="/dice-roll" element={<DiceRoll/>}/>
        <Route path="/dice-rolled" element={<DiceRolled/>}/>
        <Route path="/dice-roll-popup" element={<DiceRollPopup/>}/>
        <Route path="/king-of-the-hill-select" element={<KingOfTheHillSelect/>}/>
        <Route path="/king-of-the-hill" element={<KingOfTheHill/>}/>
        <Route path="/king-of-the-hill-winner" element={<KingOfTheHillWinner/>}/>
        <Route path="/king-of-the-hill-next-round" element={<KingOfTheHillNextRound/>}/>
        <Route path="/king-of-the-hill-tournament-over" element={<KingOfTheHillTournamentOver/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/signup" element={<SignUp/>}/>
      </Routes>

      <Footer/>
    </>
  )
}

export default App