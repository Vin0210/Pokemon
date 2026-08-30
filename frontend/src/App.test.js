import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./Services/teamService', () => ({
  getTeam: jest.fn().mockResolvedValue([]),
  addToTeam: jest.fn().mockResolvedValue({}),
  removeFromTeam: jest.fn().mockResolvedValue({}),
}));

jest.mock('./Services/battleService', () => ({
  recordBattle: jest.fn().mockResolvedValue({}),
  getBattleHistory: jest.fn().mockResolvedValue([]),
}));

jest.mock('./Services/pokeapi', () => ({
  getPokemonList: jest.fn().mockResolvedValue({
    count: 1,
    results: [{ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' }],
  }),
  getPokemonDetails: jest.fn().mockResolvedValue({
    id: 1,
    name: 'bulbasaur',
    sprites: { front_default: '', other: { 'official-artwork': { front_default: '' } } },
    types: [{ type: { name: 'grass' } }, { type: { name: 'poison' } }],
    stats: [
      { stat: { name: 'hp' }, base_stat: 45 },
      { stat: { name: 'attack' }, base_stat: 49 },
      { stat: { name: 'defense' }, base_stat: 49 },
      { stat: { name: 'special-attack' }, base_stat: 65 },
      { stat: { name: 'special-defense' }, base_stat: 65 },
      { stat: { name: 'speed' }, base_stat: 45 },
    ],
    abilities: [{ ability: { name: 'overgrow' } }],
    height: 7,
    weight: 69,
  }),
  getPokemonByType: jest.fn().mockResolvedValue([1]),
}));

test('renders the Pokédex shell with navigation', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /poké/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /discover/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /my team/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /battle arena/i })).toBeInTheDocument();
});
