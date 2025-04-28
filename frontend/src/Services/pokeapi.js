import axios from 'axios';

const API_BASE = 'https://pokeapi.co/api/v2';

export const getPokemonList = async (limit = 20, offset = 0) => {
  const response = await axios.get(`${API_BASE}/pokemon?limit=${limit}&offset=${offset}`);
  return response.data;
};

export const getPokemonDetails = async (id) => {
  const response = await axios.get(`${API_BASE}/pokemon/${id}`);
  return response.data;
};