import axios from 'axios';

const API_BASE = 'http://localhost:3001';

export const recordBattle = async (pokemon1, pokemon2, winner) => {
  const response = await axios.post(`${API_BASE}/battles`, {
    pokemon1,
    pokemon2,
    winner,
    timestamp: new Date().toISOString()
  });
  return response.data;
};

export const getBattleHistory = async () => {
  const response = await axios.get(`${API_BASE}/battles`);
  return response.data;
};