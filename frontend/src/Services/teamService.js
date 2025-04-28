import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const getTeam = async () => {
  try {
    const response = await api.get('/team');
    console.log('Team data received:', response.data); 
    return response.data;
  } catch (error) {
    console.error('Error fetching team:', {
      config: error.config,
      response: error.response
    });
    throw error;
  }
};

export const addToTeam = async (pokemon) => {
  try {
    const currentTeam = await getTeam();
    if (currentTeam.length >= 6) {
      throw new Error('Team is full (max 6 Pokémon)');
    }
    const response = await api.post('/team', pokemon);
    return response.data;
  } catch (error) {
    console.error('Error adding to team:', error);
    throw error;
  }
};

export const removeFromTeam = async (id) => {
  try {
    console.log(`Frontend attempting to delete ID: ${id}`);
    const response = await api.delete(`/team/${id}`);
    console.log('Delete successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Delete failed - Full error details:', {
      URL: error.config.url,
      Method: error.config.method,
      Status: error.response?.status,
      Response: error.response?.data,
      Error: error.message
    });
    throw new Error(error.response?.data?.error || 'Failed to remove Pokémon');
  }
};