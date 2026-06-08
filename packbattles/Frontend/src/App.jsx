import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'

import AOS from 'aos';
import 'aos/dist/aos.css';
import "bootstrap/dist/css/bootstrap.min.css"

import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'

import Header from './components/Header/Header'
import Footer from './components/Footer/Footer'

import Home from "./pages/Home/Home"
import Packs from './pages/Packs/Packs'
import Pack from './pages/Pack/Pack'
import Inventory from './pages/Inventory/Inventory'
import Events from './pages/Events/Events'
import Event from './pages/Event/Event'
import Upgrade from './pages/Upgrade/Upgrade'
import Trade from './pages/Trade/Trade'
import Battles from './pages/Battles/Battles'
import BattlePopup from './pages/BattlePopup/BattlePopup'
import HighBall from './pages/HighBall/HighBall'
import DiceRoll from './pages/DiceRoll/DiceRoll'
import DiceRolled from './pages/DiceRolled/DiceRolled'
import DiceRollPopup from './pages/DiceRollPopup/DiceRollPopup'
import KingOfTheHillSelect from './pages/KingOfTheHillSelect/KingOfTheHillSelect'
import KingOfTheHill from './pages/KingOfTheHill/KingOfTheHill'
import KingOfTheHillWinner from './pages/KingOfTheHillWinner/KingOfTheHillWinner'
import KingOfTheHillNextRound from './pages/KingOfTheHillNextRound/KingOfTheHillNextRound'
import KingOfTheHillTournamentOver from './pages/KingOfTheHillTournamentOver/KingOfTheHillTournamentOver'
import Login from './pages/Login/Login'
import SignUp from './pages/SignUp/SignUp'

const App = () => {
  useEffect(() => {
    AOS.init({ duration: 1000, once: true, easing: 'ease' });
  }, []);

  return (
    <AuthProvider>
      <Header />
      <Routes>
        {/* Public routes */}
        <Route path="/"       element={<Home />} />
        <Route path="/login"  element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* MVP protected routes — require login */}
        <Route path="/packs"               element={<ProtectedRoute><Packs /></ProtectedRoute>} />
        <Route path="/pack"                element={<ProtectedRoute><Pack /></ProtectedRoute>} />
        <Route path="/inventory"           element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/battles"             element={<ProtectedRoute><Battles /></ProtectedRoute>} />

        {/* Static mockup pages — not yet wired, left unprotected for now */}
        <Route path="/events"                          element={<Events />} />
        <Route path="/event"                           element={<Event />} />
        <Route path="/upgrade"                         element={<Upgrade />} />
        <Route path="/trade"                           element={<Trade />} />
        <Route path="/battle-popup"                    element={<BattlePopup />} />
        <Route path="/high-ball"                       element={<HighBall />} />
        <Route path="/dice-roll"                       element={<DiceRoll />} />
        <Route path="/dice-rolled"                     element={<DiceRolled />} />
        <Route path="/dice-roll-popup"                 element={<DiceRollPopup />} />
        <Route path="/king-of-the-hill-select"         element={<KingOfTheHillSelect />} />
        <Route path="/king-of-the-hill"                element={<KingOfTheHill />} />
        <Route path="/king-of-the-hill-winner"         element={<KingOfTheHillWinner />} />
        <Route path="/king-of-the-hill-next-round"     element={<KingOfTheHillNextRound />} />
        <Route path="/king-of-the-hill-tournament-over" element={<KingOfTheHillTournamentOver />} />
      </Routes>
      <Footer />
    </AuthProvider>
  );
};

export default App;
