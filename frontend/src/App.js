import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Swords } from 'lucide-react';
import PokemonList from './Components/PokemonList';
import Team from './Components/Team';
import BattleSimulator from './Components/BattleSimulator';
import PvpBattle from './Components/PvpBattle';
import Header from './Components/Header';
import { getTeam } from './Services/teamService';
import './App.css';

function App() {
  const [team, setTeam] = useState([]);
  const [activeTab, setActiveTab] = useState('browse');
  const [battleMode, setBattleMode] = useState('solo'); // solo | pvp

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const teamData = await getTeam();
        setTeam(teamData);
      } catch (error) {
        console.error("Error loading team:", error);
      }
    };
    fetchTeam();
  }, []);

  // Reset scroll on every tab switch so users always land at the top of the view
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const handleNavigate = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="app-shell">
      <Header />
      <div className="main-container">
        <div className="tabs-wrap" role="tablist" aria-label="Primary">
          <button
            className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveTab('browse')}
            role="tab"
            aria-selected={activeTab === 'browse'}
          >
            {activeTab === 'browse' && <motion.span layoutId="tab-pill" className="tab-indicator" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
            <Search size={16} className="tab-icon" />
            <span>Discover</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
            role="tab"
            aria-selected={activeTab === 'team'}
          >
            {activeTab === 'team' && <motion.span layoutId="tab-pill" className="tab-indicator" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
            <Users size={16} className="tab-icon" />
            <span>My Team</span>
            <span className="tab-count">{team.length}/6</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'battle' ? 'active' : ''}`}
            onClick={() => setActiveTab('battle')}
            role="tab"
            aria-selected={activeTab === 'battle'}
          >
            {activeTab === 'battle' && <motion.span layoutId="tab-pill" className="tab-indicator" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
            <Swords size={16} className="tab-icon" />
            <span>Battle Arena</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeTab === 'browse' ? (
              <PokemonList team={team} setTeam={setTeam} />
            ) : activeTab === 'team' ? (
              <Team team={team} setTeam={setTeam} onNavigate={handleNavigate} />
            ) : (
              <div className="battle-page">
                <div className="battle-mode-toggle">
                  <button className={`battle-mode-btn ${battleMode === 'solo' ? 'active' : ''}`} onClick={() => setBattleMode('solo')}><Swords size={14} /> Solo</button>
                  <button className={`battle-mode-btn ${battleMode === 'pvp' ? 'active' : ''}`} onClick={() => setBattleMode('pvp')}><Users size={14} /> PvP (2 devices)</button>
                </div>
                {battleMode === 'pvp' ? <PvpBattle team={team} /> : <BattleSimulator team={team} />}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        <button className={activeTab==='browse'?'active':''} onClick={()=>setActiveTab('browse')} aria-label="Discover">
          <Search size={18} /> Discover
        </button>
        <button className={activeTab==='team'?'active':''} onClick={()=>setActiveTab('team')} aria-label={`My Team ${team.length} of 6`}>
          <Users size={18} /> Team {team.length>0 && <span className="nav-badge">{team.length}</span>}
        </button>
        <button className={activeTab==='battle'?'active':''} onClick={()=>setActiveTab('battle')} aria-label="Battle Arena">
          <Swords size={18} /> Battle
        </button>
      </nav>
    </div>
  );
}

export default App;
