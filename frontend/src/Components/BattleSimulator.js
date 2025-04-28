import React, { useState, useEffect } from 'react';
import { recordBattle } from '../Services/battleService';
import { fetchRandomPokemon } from '../Services/PokemonService';

const BattleSimulator = ({ team }) => {
  const [pokemon1, setPokemon1] = useState(null);
  const [pokemon2, setPokemon2] = useState(null);
  const [wildPokemon, setWildPokemon] = useState([]);
  const [winner, setWinner] = useState(null);
  const [battleLog, setBattleLog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [battleMode, setBattleMode] = useState('wild'); 

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (battleMode === 'wild') {
          
          const randomPokemon = await Promise.all(
            Array(5).fill().map(() => fetchRandomPokemon())
          );
          setWildPokemon(randomPokemon);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading Pokémon data:", error);
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [battleMode]);

  const calculateWinner = (p1, p2) => {
    if (!p1 || !p2) return null;

    const p1Power = calculateBattlePower(p1);
    const p2Power = calculateBattlePower(p2);

    if (p1Power > p2Power) {
      return p1; 
    } else if (p2Power > p1Power) {
      return p2;
    } else {
      return null;
    }
  };

  const calculateBattlePower = (pokemon) => {
    const basePower = pokemon.stats?.reduce((acc, stat) => acc + (stat?.base || 0), 0) || 0;
    
    const randomFactor = 0.8 + Math.random() * 0.4;
    
    return basePower * randomFactor;
  };

  const handleBattle = async () => {
    if (!pokemon1 || !pokemon2) return;

    const battleWinner = calculateWinner(pokemon1, pokemon2);
    setWinner(battleWinner);

    const newBattle = {
      pokemon1: pokemon1?.name || 'Unknown',
      pokemon2: pokemon2?.name || 'Unknown',
      timestamp: new Date().toLocaleString(),
      mode: battleMode
    };

    setBattleLog([newBattle, ...battleLog.slice(0, 4)]);

    try {
      await recordBattle(pokemon1, pokemon2, battleWinner);
    } catch (err) {
      console.error("Error saving battle:", err);
    }
  };

  const refreshWildPokemon = async () => {
    setIsLoading(true);
    try {
      const newPokemon = await fetchRandomPokemon();
      setWildPokemon(prev => [newPokemon, ...prev.slice(0, 4)]);
    } catch (error) {
      console.error("Error refreshing wild Pokémon:", error);
    } finally {
      setIsLoading(false);
    }
  };



  if (isLoading) {
    return (
      <div className="battle-simulator loading">
        <h2>Battle Arena</h2>
        <p>Loading Pokémon data...</p>
      </div>
    );
  }

  if (!team || team.length === 0) {
    return (
      <div className="battle-simulator">
        <h2>Battle Arena</h2>
        <p>No Pokémon in your team to battle with.</p>
      </div>
    );
  }

  return (
    <div className="battle-simulator">
      <div className="battle-mode-toggle">
        <button 
          className={`mode-btn ${battleMode === 'wild' ? 'active' : ''}`}
          onClick={() => setBattleMode('wild')}
        >
          Battle Wild Pokémon
        </button>
        <button 
          className={`mode-btn ${battleMode === 'team' ? 'active' : ''}`}
          onClick={() => setBattleMode('team')}
        >
          Team Battle
        </button>
      </div>

      <h2>Battle Arena - {battleMode === 'wild' ? 'Wild Pokémon' : 'Team Battle'}</h2>

      <div className="battle-selectors">
        <div className="pokemon-selector">
          <label>Select Your Pokémon:</label>
          <select
            className="battle-select"
            onChange={(e) => {
              const selectedId = parseInt(e.target.value);
              const selectedPokemon = team.find((p) => p.id === selectedId);
              setPokemon1(selectedPokemon);
            }}
            value={pokemon1?.id || ''}
          >
            <option value="">Choose...</option>
            {team
              .filter((p) => p?.id && p?.name)
              .map((p) => (
                <option key={`team-${p.id}`} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>

          {pokemon1 && (
            <div className="selected-pokemon">
              <img src={pokemon1.image} alt={pokemon1.name} />
              <div className="pokemon-stats">
                <h3>{pokemon1.name}</h3>
                <div className="stat-bars">
                  {pokemon1.stats?.map((stat) => (
                    <div key={stat.name} className="stat-bar">
                      <span>{stat.name}: {stat.base}</span>
                      <div
                        className="stat-fill"
                        style={{ width: `${(stat.base / 255) * 100}%` }}
                      ></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="vs">VS</div>

        <div className="pokemon-selector">
          <label>
            {battleMode === 'wild' ? 'Select Wild Pokémon:' : 'Select Team Pokémon:'}
          </label>
          
          {battleMode === 'wild' ? (
            <div className="wild-pokemon-controls">
              <select
                className="battle-select"
                onChange={(e) => {
                  const selectedId = parseInt(e.target.value);
                  const selectedPokemon = wildPokemon.find((p) => p.id === selectedId);
                  setPokemon2(selectedPokemon);
                }}
                value={pokemon2?.id || ''}
              >
                <option value="">Choose...</option>
                {wildPokemon
                  .filter((p) => p?.id && p?.name)
                  .map((p) => (
                    <option key={`wild-${p.id}`} value={p.id}>
                      {p.name} (Lv. {Math.floor(Math.random() * 50) + 5})
                    </option>
                  ))}
              </select>
              <button 
                className="btn btn-refresh"
                onClick={refreshWildPokemon}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Refresh Wild Pokémon'}
              </button>
            </div>
          ) : (
            <select
              className="battle-select"
              onChange={(e) => {
                const selectedId = parseInt(e.target.value);
                const selectedPokemon = team.find((p) => p.id === selectedId);
                setPokemon2(selectedPokemon);
              }}
              value={pokemon2?.id || ''}
            >
              <option value="">Choose...</option>
              {team
                .filter((p) => p?.id && p?.name && (!pokemon1 || p.id !== pokemon1.id))
                .map((p) => (
                  <option key={`team-${p.id}`} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          )}

          {pokemon2 && (
            <div className="selected-pokemon">
              <img src={pokemon2.image} alt={pokemon2.name} />
              <div className="pokemon-stats">
                <h3>{pokemon2.name}</h3>
                <div className="stat-bars">
                  {pokemon2.stats?.map((stat) => (
                    <div key={stat.name} className="stat-bar">
                      <span>{stat.name}: {stat.base}</span>
                      <div
                        className="stat-fill"
                        style={{ width: `${(stat.base / 255) * 100}%` }}
                      ></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        className="battle-button"
        onClick={handleBattle}
        disabled={!pokemon1 || !pokemon2}
      >
        Start Battle!
      </button>

      {winner === null && pokemon1 && pokemon2 ? (
        <div className="battle-result">
          <h3 className="winner">   </h3>
        </div>
      ) : winner ? (
        <div className="battle-result">
          <h3 className="winner">Winner: {winner.name.toUpperCase()}!</h3>
          <img src={winner.image} alt={winner.name} className="winner-image" />
          <p className="battle-details">
            {pokemon1.name} ({calculateBattlePower(pokemon1).toFixed(0)}) vs. 
            {pokemon2.name} ({calculateBattlePower(pokemon2).toFixed(0)})
          </p>
        </div>
      ) : null}

      {battleLog.length > 0 && (
        <div className="battle-history">
          <h4>Recent Battles:</h4>
          <ul>
            {battleLog.map((battle, index) => (
              <li key={index}>
                <span className="battle-pokemon">{battle.pokemon1}</span> vs.
                <span className="battle-pokemon">{battle.pokemon2}</span> → 
                <span className="battle-winner">{battle.winner}</span> won!
                <span className="battle-time">{battle.timestamp}</span>
                <span className="battle-mode">({battle.mode === 'wild' ? 'Wild' : 'Team'})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BattleSimulator;