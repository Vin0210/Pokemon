import { useState } from 'react';
import { removeFromTeam } from '../Services/teamService';


const Team = ({ team, setTeam }) => {
  const [error] = useState(null);

  const handleRemove = async (pokemonId) => {
    try {
      console.log('Removing Pokémon ID:', pokemonId);
      await removeFromTeam(pokemonId);
      
      setTeam(currentTeam => currentTeam.filter(p => p.id !== pokemonId));
      
      console.log('Successfully removed Pokémon');
    } catch (error) {
      console.error('Component Removal Error:', {
        pokemonId,
        error: error.message,
        stack: error.stack
      });
      alert(`Removal failed: ${error.message}`);
    }
  };

  return (
    <div className="team-container">
      <h2>My Pokémon Team</h2>
      {error && <div className="error-message">{error}</div>}
      
      {team.length === 0 ? (
        <div className="empty-team">
          <p>Your team is empty. Add Pokémon from the browse page!</p>
          <img 
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/54.png" 
            alt="Psyduck" 
            style={{ opacity: 0.5, width: '100px' }}
          />
        </div>
      ) : (
        <div className="team-members">
          {team.map((p) => (
            <div key={p.id} className="team-member">
              <img 
                src={p.image} 
                alt={p.name} 
                className="team-member-image"
              />
              <h3 className="team-member-name">{p.name}</h3>
              <div className="team-member-types">
                {p.types.map(type => (
                  <span key={type} className={`type-badge type-${type}`}>
                    {type}
                  </span>
                ))}
              </div>
              <button 
  className="btn btn-danger release-btn"
  onClick={() => handleRemove(p.id)}
>
  Release
</button>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Team;