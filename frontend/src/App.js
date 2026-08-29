import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Swords, Sparkles } from 'lucide-react';
import PokemonList from './Components/PokemonList';
import Team from './Components/Team';
import BattleSimulator from './Components/BattleSimulator';
import Header from './Components/Header';
import { getTeam } from './Services/teamService';
import './App.css';

function App() {
  const [team, setTeam] = useState([]);
  const [activeTab, setActiveTab] = useState('browse');

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
            ) : (
              <div className="team-view">
                <Team team={team} setTeam={setTeam} />
                <BattleSimulator team={team} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
