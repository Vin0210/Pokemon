import { useState, useEffect } from 'react';
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
    <div className="Header">
      <Header />
      <div className="main-container">
        <div className="tabs">
          <button 
            className={activeTab === 'browse' ? 'active' : ''}
            onClick={() => setActiveTab('browse')}
          >
            Catch Pokémon!
          </button>
          <button 
            className={activeTab === 'team' ? 'active' : ''}
            onClick={() => setActiveTab('team')}
          >
            My Team ({team.length}/6)
          </button>
        </div>

        {activeTab === 'browse' ? (
          <PokemonList team={team} setTeam={setTeam} />
        ) : (
          <div className="team-view">
            <Team team={team} setTeam={setTeam} />
            <BattleSimulator team={team} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;