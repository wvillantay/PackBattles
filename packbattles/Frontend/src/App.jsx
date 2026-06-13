import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'

import AOS from 'aos';
import 'aos/dist/aos.css';
import "bootstrap/dist/css/bootstrap.min.css"

import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import AdminRoute from './components/AdminRoute/AdminRoute'

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
import DuelBattle from './pages/DuelBattle/DuelBattle'
import Profile from './pages/Profile/Profile'
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
import AdminDashboard from './pages/Admin/AdminDashboard'
import AdminUsers from './pages/Admin/AdminUsers'
import AdminUserDetail from './pages/Admin/AdminUserDetail'
import AdminBattles from './pages/Admin/AdminBattles'
import AdminTransactions from './pages/Admin/AdminTransactions'
import AdminCompanyInventory from './pages/Admin/AdminCompanyInventory'

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
        <Route path="/duel-battle/:id"    element={<ProtectedRoute><DuelBattle /></ProtectedRoute>} />
        <Route path="/profile"            element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/trade"              element={<ProtectedRoute><Trade /></ProtectedRoute>} />

        {/* Admin routes — require login + is_admin */}
        <Route path="/admin"              element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users"         element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/users/:id"    element={<AdminRoute><AdminUserDetail /></AdminRoute>} />
        <Route path="/admin/battles"      element={<AdminRoute><AdminBattles /></AdminRoute>} />
        <Route path="/admin/transactions"       element={<AdminRoute><AdminTransactions /></AdminRoute>} />
        <Route path="/admin/company-inventory" element={<AdminRoute><AdminCompanyInventory /></AdminRoute>} />

        {/* Static mockup pages — not yet wired, left unprotected for now */}
        <Route path="/events"                          element={<Events />} />
        <Route path="/event"                           element={<Event />} />
        <Route path="/upgrade"                         element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
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
