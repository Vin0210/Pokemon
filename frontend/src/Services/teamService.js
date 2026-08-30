const TEAM_KEY = 'pokemon_team';

const readTeam = () => {
  try {
    const raw = localStorage.getItem(TEAM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read local team:', e);
    return [];
  }
};

const writeTeam = (team) => {
  try {
    localStorage.setItem(TEAM_KEY, JSON.stringify(team));
  } catch (e) {
    console.error('Failed to save local team:', e);
    throw new Error('Failed to save Pokémon');
  }
};

export const getTeam = async () => {
  return readTeam();
};

export const addToTeam = async (pokemon) => {
  const currentTeam = readTeam();
  if (currentTeam.length >= 6) {
    throw new Error('Team is full (max 6 Pokémon)');
  }
  const next = [...currentTeam, pokemon];
  writeTeam(next);
  return pokemon;
};

export const removeFromTeam = async (id) => {
  const currentTeam = readTeam();
  const next = currentTeam.filter(p => p.id !== id);
  writeTeam(next);
  return { success: true };
};
