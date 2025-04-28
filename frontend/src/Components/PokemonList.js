import { useState, useEffect, useRef } from 'react';
import { getPokemonList, getPokemonDetails } from '../Services/pokeapi';
import { addToTeam } from '../Services/teamService';

const PokemonList = ({ team, setTeam }) => {
  const [allPokemon, setAllPokemon] = useState([]);
  const [filteredPokemon, setFilteredPokemon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPokemon, setTotalPokemon] = useState(0);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [catchAnimation, setCatchAnimation] = useState(null);
  const confettiRef = useRef(null);
  const pokemonPerPage = 25;

  useEffect(() => {
    const categorizePokemon = (pokemon) => {
      const starters = ['bulbasaur', 'charmander', 'squirtle', 'chikorita', 'cyndaquil', 'totodile', 'treecko', 'torchic', 'mudkip'];
      const legendaries = ['mewtwo', 'lugia', 'ho-oh', 'rayquaza', 'dialga', 'palkia', 'giratina'];
      const mythical = ['mew', 'celebi', 'jirachi', 'manaphy'];

      if (starters.includes(pokemon.name)) return 'Starter';
      if (legendaries.includes(pokemon.name)) return 'Legendary';
      if (mythical.includes(pokemon.name)) return 'Mythical';
      if (pokemon.id <= 151) return 'Gen 1';
      if (pokemon.id <= 251) return 'Gen 2';
      return 'Other';
    };

    const fetchAllPokemon = async () => {
      try {
        setLoading(true);
        setError(null);

        const initialList = await getPokemonList(1, 0);
        setTotalPokemon(initialList.count);

        const listData = await getPokemonList(initialList.count, 0);

        const batchSize = 50;
        const detailedPokemon = [];

        for (let i = 0; i < listData.results.length; i += batchSize) {
          const batch = listData.results.slice(i, i + batchSize);
          const batchDetails = await Promise.all(
            batch.map(async (p) => {
              const details = await getPokemonDetails(p.name);
              return {
                id: details.id,
                name: details.name,
                image: details.sprites.other['official-artwork'].front_default || 
                      details.sprites.front_default,
                types: details.types.map(t => t.type.name),
                stats: details.stats.map(s => ({
                  name: s.stat.name,
                  base: s.base_stat
                })),
                abilities: details.abilities.map(a => a.ability.name),
                category: categorizePokemon(details),
                height: details.height,
                weight: details.weight
              };
            })
          );
          detailedPokemon.push(...batchDetails);
        }

        setAllPokemon(detailedPokemon);
        setFilteredPokemon(detailedPokemon);
      } catch (err) {
        setError("Failed to load Pokémon. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPokemon();
  }, []);

  useEffect(() => {
    let filtered = allPokemon.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    setFilteredPokemon(filtered);
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, allPokemon]);

  useEffect(() => {
    if (showConfetti) {
      const confettiColors = ['#ffcb05', '#3b4cca', '#ff0000', '#cc0000'];
      
      const createConfetti = () => {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        confetti.style.opacity = 1;
        confetti.style.animation = `confetti ${Math.random() * 3 + 2}s linear forwards`;
        confettiRef.current.appendChild(confetti);
        
        setTimeout(() => {
          confetti.remove();
        }, 5000);
      };
      
      const interval = setInterval(createConfetti, 100);
      
      setTimeout(() => {
        clearInterval(interval);
        setShowConfetti(false);
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [showConfetti]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleAddToTeam = async (pokemon) => {
    try {
      if (team.length >= 6) {
        showGameDialog("Your team is full! Maximum 6 Pokémon.");
        return;
      }
      
      setCatchAnimation(pokemon.id);
      
      setTimeout(async () => {
        await addToTeam(pokemon);
        setTeam([...team, pokemon]);
        setShowConfetti(true);
        setCatchAnimation(null);
      }, 1500);
      
    } catch (err) {
      showGameDialog("Failed to add Pokémon to team");
      setCatchAnimation(null);
      console.error(err);
    }
  };

  const showGameDialog = (message) => {
    const dialog = document.createElement('div');
    dialog.className = 'game-dialog';
    dialog.textContent = message;
    document.body.appendChild(dialog);
    
    setTimeout(() => {
      dialog.classList.add('fade-out');
      setTimeout(() => dialog.remove(), 500);
    }, 2000);
  };
  
  const indexOfLastPokemon = currentPage * pokemonPerPage;
  const indexOfFirstPokemon = indexOfLastPokemon - pokemonPerPage;
  const currentPokemon = filteredPokemon.slice(indexOfFirstPokemon, indexOfLastPokemon);
  const totalPages = Math.ceil(filteredPokemon.length / pokemonPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderTypeIcon = (type) => {
    return <span className={`type-icon type-${type}`}></span>;
  };

  const formatStatName = (name) => {
    switch (name) {
      case 'hp': return 'HP';
      case 'attack': return 'ATK';
      case 'defense': return 'DEF';
      case 'special-attack': return 'SP.ATK';
      case 'special-defense': return 'SP.DEF';
      case 'speed': return 'SPD';
      default: return name;
    }
  };
  const getStatBarWidth = (value) => {
    const maxStatValue = 200;
    const percentage = (value / maxStatValue) * 100;
    return Math.min(percentage, 100);
  };
  
  const getStatBarColor = (value) => {
    if (value < 50) return 'stat-bar-low';
    if (value < 90) return 'stat-bar-medium';
    return 'stat-bar-high';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-pokeball"></div>
        <p className="loading-text">Loading Pokémon...</p>
      </div>
    );
  }
  
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="pokemon-container">
      <div ref={confettiRef} className="confetti-container"></div>
      
      <div className="game-panel">
        <div className="filters">
          <div className="search-wrapper">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search Pokémon"
              className="search-input"
            />
            <span className="search-icon"></span>
          </div>

          <div className="category-wrapper">
            <label htmlFor="category-select" className="category-label">Category:</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
              }}
              className="dropdown "
            >
              <option value="">All</option>
              <option value="Starter">Starter</option>
              <option value="Legendary">Legendary</option>
              <option value="Mythical">Mythical</option>
              <option value="Gen 1">Gen 1</option>
              <option value="Gen 2">Gen 2</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="pokemon-count">
          <div className="pokedex-info">
            Showing {filteredPokemon.length} of {totalPokemon} Pokémon
          </div>
        </div>

        <div className="pokemon-grid">
          {currentPokemon.map((p) => (
            <div 
              key={p.id} 
              className={`pokemon-card ${catchAnimation === p.id ? 'catch-animation' : ''}`}
            >
              <div className="card-content">
                <span className="pokemon-id">#{p.id.toString().padStart(3, '0')}</span>
                <div className="pokemon-image-container">
                  <img 
                    src={p.image} 
                    alt={p.name} 
                    className="pokemon-image"
                    loading="lazy"
                  />
                </div>
                <h3 className="pokemon-name">{p.name}</h3>

                <div className="pokemon-types">
                  {p.types.map(type => (
                    <span key={type} className={`type-badge type-${type}`}>
                      {renderTypeIcon(type)}
                      {type}
                    </span>
                  ))}
                </div>

                <div className="card-buttons">
                  <button 
                    className={`btn pokeball-button ${team.some(member => member.id === p.id) ? 'in-team' : ''}`}
                    onClick={() => handleAddToTeam(p)}
                    disabled={team.some(member => member.id === p.id) || catchAnimation !== null}
                  >
                    {team.some(member => member.id === p.id) ? 'In Team' : 'Catch'}
                  </button>

                  <button 
                    className="btn info-button"
                    onClick={() => {
                      setSelectedPokemon(p);
                    }}
                  >
                    Info
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pagination">
          <button 
            onClick={() => paginate(currentPage - 1)} 
            disabled={currentPage === 1}
            className="pagination-button"
          >
            &lt; Prev
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNumber;
            if (totalPages <= 5) {
              pageNumber = i + 1;
            } else if (currentPage <= 3) {
              pageNumber = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNumber = totalPages - 4 + i;
            } else {
              pageNumber = currentPage - 2 + i;
            }
            
            return (
              <button
                key={pageNumber}
                onClick={() => paginate(pageNumber)}
                className={`pagination-button ${currentPage === pageNumber ? 'active' : ''}`}
              >
                {pageNumber}
              </button>
            );
          })}

          <button 
            onClick={() => paginate(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Next &gt;
          </button>
        </div>
      </div>

      {selectedPokemon && (
        <div className="modal-overlay" onClick={() => setSelectedPokemon(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="pokemon-detail-name">{selectedPokemon.name}</h2>
              <span className="pokemon-detail-id">#{selectedPokemon.id.toString().padStart(3, '0')}</span>
            </div>
            
            <div className="pokemon-detail-container">
              <div className="pokemon-detail-image-container">
                <img 
                  src={selectedPokemon.image} 
                  alt={selectedPokemon.name} 
                  className="pokemon-detail-image"
                />
                <div className="pokemon-detail-types">
                  {selectedPokemon.types.map(type => (
                    <span key={type} className={`type-badge type-${type}`}>
                      {renderTypeIcon(type)}
                      {type}
                    </span>
                  ))}
                </div>
                <div className="pokemon-physical">
                  <div className="physical-stat">
                    <span className="physical-label">Height:</span> 
                    <span className="physical-value">{(selectedPokemon.height / 10).toFixed(1)}m</span>
                  </div>
                  <div className="physical-stat">
                    <span className="physical-label">Weight:</span> 
                    <span className="physical-value">{(selectedPokemon.weight / 10).toFixed(1)}kg</span>
                  </div>
                </div>
              </div>
              
              <div className="pokemon-detail-info">
                <div className="detail-section">
                  <h4 className="section-title">Base Stats</h4>
                  <div className="stats-container">
                    {selectedPokemon.stats.map(stat => (
                      <div className="stat-bar">
                      <span className="stat-name">{formatStatName(stat.name)}</span>
                      <span className="stat-value">{stat.base}</span>
                      <div className="stat-bar-container">
                        <div 
                          className={`stat-bar-fill ${getStatBarColor(stat.base)}`}
                          style={{ 
                            width: getStatBarWidth(stat.base),
                            display: 'block'
                          }}
                        ></div>
                      </div>
                    </div>
                    ))}
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="section-title">Abilities</h4>
                  <div className="abilities-list">
                    {selectedPokemon.abilities.map(ab => (
                      <div key={ab} className="ability-item">
                        {ab}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button 
              className="btn close-button" 
              onClick={() => {
                setSelectedPokemon(null);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PokemonList;