export const fetchRandomPokemon = async () => {
    const randomId = Math.floor(Math.random() * 1000) + 1; 
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
    const data = await response.json();
    
    return {
      id: data.id,
      name: data.name,
      image: data.sprites.other['official-artwork'].front_default,
      stats: data.stats.map(stat => ({
        name: stat.stat.name,
        base: stat.base_stat
      })),
      types: data.types.map(type => type.type.name)
    };
  };