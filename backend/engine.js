// Shared battle engine (server-authoritative) for PvP battles.
// Mirrors the single-player logic in the frontend so both modes behave alike.

const MOVE_DB = {
  fire: [
    { name: 'Ember', type: 'fire', power: 40, acc: 100, cat: 'special', pp: 25, priority: 0, effect: { chance: 0.1, status: 'burn' } },
    { name: 'Flame Wheel', type: 'fire', power: 60, acc: 100, cat: 'physical', pp: 25, priority: 0 },
    { name: 'Flamethrower', type: 'fire', power: 90, acc: 100, cat: 'special', pp: 15, priority: 0, effect: { chance: 0.1, status: 'burn' } },
    { name: 'Fire Blast', type: 'fire', power: 110, acc: 85, cat: 'special', pp: 5, priority: 0, effect: { chance: 0.1, status: 'burn' } },
  ],
  water: [
    { name: 'Water Gun', type: 'water', power: 40, acc: 100, cat: 'special', pp: 25, priority: 0 },
    { name: 'Bubble Beam', type: 'water', power: 65, acc: 100, cat: 'special', pp: 20, priority: 0, effect: { chance: 0.1, stage: 'speed', change: -1 } },
    { name: 'Surf', type: 'water', power: 90, acc: 100, cat: 'special', pp: 15, priority: 0 },
    { name: 'Hydro Pump', type: 'water', power: 110, acc: 80, cat: 'special', pp: 5, priority: 0 },
  ],
  grass: [
    { name: 'Vine Whip', type: 'grass', power: 45, acc: 100, cat: 'physical', pp: 25, priority: 0 },
    { name: 'Razor Leaf', type: 'grass', power: 55, acc: 95, cat: 'physical', pp: 25, priority: 0, crit: 1 },
    { name: 'Giga Drain', type: 'grass', power: 75, acc: 100, cat: 'special', pp: 10, priority: 0, heal: 0.5 },
    { name: 'Solar Beam', type: 'grass', power: 120, acc: 100, cat: 'special', pp: 10, priority: 0 },
  ],
  electric: [
    { name: 'Thunder Shock', type: 'electric', power: 40, acc: 100, cat: 'special', pp: 30, priority: 0, effect: { chance: 0.1, status: 'paralyze' } },
    { name: 'Spark', type: 'electric', power: 65, acc: 100, cat: 'physical', pp: 20, priority: 0, effect: { chance: 0.3, status: 'paralyze' } },
    { name: 'Thunderbolt', type: 'electric', power: 90, acc: 100, cat: 'special', pp: 15, priority: 0, effect: { chance: 0.1, status: 'paralyze' } },
    { name: 'Thunder', type: 'electric', power: 110, acc: 70, cat: 'special', pp: 10, priority: 0, effect: { chance: 0.3, status: 'paralyze' } },
  ],
  psychic: [
    { name: 'Confusion', type: 'psychic', power: 50, acc: 100, cat: 'special', pp: 25, priority: 0, effect: { chance: 0.1, status: 'confuse' } },
    { name: 'Psybeam', type: 'psychic', power: 65, acc: 100, cat: 'special', pp: 20, priority: 0 },
    { name: 'Psychic', type: 'psychic', power: 90, acc: 100, cat: 'special', pp: 10, priority: 0, effect: { chance: 0.1, stage: 'def', change: -1 } },
    { name: 'Psystrike', type: 'psychic', power: 100, acc: 100, cat: 'special', pp: 10, priority: 0 },
  ],
  ice: [
    { name: 'Powder Snow', type: 'ice', power: 40, acc: 100, cat: 'special', pp: 25, priority: 0, effect: { chance: 0.1, status: 'freeze' } },
    { name: 'Ice Shard', type: 'ice', power: 40, acc: 100, cat: 'physical', pp: 30, priority: 1 },
    { name: 'Ice Beam', type: 'ice', power: 90, acc: 100, cat: 'special', pp: 10, priority: 0, effect: { chance: 0.1, status: 'freeze' } },
    { name: 'Blizzard', type: 'ice', power: 110, acc: 70, cat: 'special', pp: 5, priority: 0 },
  ],
  dragon: [
    { name: 'Dragon Rage', type: 'dragon', power: 60, acc: 100, cat: 'special', pp: 10, priority: 0 },
    { name: 'Dragon Breath', type: 'dragon', power: 60, acc: 100, cat: 'special', pp: 20, priority: 0, effect: { chance: 0.3, status: 'paralyze' } },
    { name: 'Dragon Claw', type: 'dragon', power: 80, acc: 100, cat: 'physical', pp: 15, priority: 0 },
    { name: 'Outrage', type: 'dragon', power: 120, acc: 100, cat: 'physical', pp: 10, priority: 0, effect: { chance: 1, selfConfuse: true } },
  ],
  normal: [
    { name: 'Tackle', type: 'normal', power: 40, acc: 100, cat: 'physical', pp: 35, priority: 0 },
    { name: 'Quick Attack', type: 'normal', power: 40, acc: 100, cat: 'physical', pp: 30, priority: 1 },
    { name: 'Slash', type: 'normal', power: 70, acc: 100, cat: 'physical', pp: 20, priority: 0, crit: 1 },
    { name: 'Hyper Voice', type: 'normal', power: 90, acc: 100, cat: 'special', pp: 10, priority: 0 },
  ],
  fighting: [
    { name: 'Karate Chop', type: 'fighting', power: 50, acc: 100, cat: 'physical', pp: 25, priority: 0, crit: 1 },
    { name: 'Brick Break', type: 'fighting', power: 75, acc: 100, cat: 'physical', pp: 15, priority: 0 },
    { name: 'Cross Chop', type: 'fighting', power: 100, acc: 80, cat: 'physical', pp: 5, priority: 0, crit: 1 },
    { name: 'Close Combat', type: 'fighting', power: 120, acc: 100, cat: 'physical', pp: 5, priority: 0, effect: { chance: 1, selfStage: 'def', change: -1 } },
  ],
  poison: [
    { name: 'Poison Sting', type: 'poison', power: 35, acc: 100, cat: 'physical', pp: 35, priority: 0, effect: { chance: 0.3, status: 'poison' } },
    { name: 'Sludge', type: 'poison', power: 65, acc: 100, cat: 'special', pp: 20, priority: 0, effect: { chance: 0.3, status: 'poison' } },
    { name: 'Sludge Bomb', type: 'poison', power: 90, acc: 100, cat: 'special', pp: 10, priority: 0, effect: { chance: 0.3, status: 'poison' } },
    { name: 'Gunk Shot', type: 'poison', power: 120, acc: 80, cat: 'physical', pp: 5, priority: 0, effect: { chance: 0.3, status: 'poison' } },
  ],
  ground: [
    { name: 'Mud Slap', type: 'ground', power: 20, acc: 100, cat: 'special', pp: 10, priority: 0, effect: { chance: 1, stage: 'acc', change: -1 } },
    { name: 'Bulldoze', type: 'ground', power: 60, acc: 100, cat: 'physical', pp: 20, priority: 0 },
    { name: 'Earthquake', type: 'ground', power: 100, acc: 100, cat: 'physical', pp: 10, priority: 0 },
    { name: 'Fissure', type: 'ground', power: 120, acc: 70, cat: 'physical', pp: 5, priority: 0 },
  ],
  flying: [
    { name: 'Peck', type: 'flying', power: 35, acc: 100, cat: 'physical', pp: 35, priority: 0 },
    { name: 'Wing Attack', type: 'flying', power: 60, acc: 100, cat: 'physical', pp: 35, priority: 0 },
    { name: 'Air Slash', type: 'flying', power: 75, acc: 95, cat: 'special', pp: 15, priority: 0 },
    { name: 'Hurricane', type: 'flying', power: 110, acc: 70, cat: 'special', pp: 10, priority: 0, effect: { chance: 0.3, status: 'confuse' } },
  ],
  bug: [
    { name: 'Bug Bite', type: 'bug', power: 60, acc: 100, cat: 'physical', pp: 20, priority: 0 },
    { name: 'Struggle Bug', type: 'bug', power: 50, acc: 100, cat: 'special', pp: 20, priority: 0, effect: { chance: 1, stage: 'spatk', change: -1 } },
    { name: 'X-Scissor', type: 'bug', power: 80, acc: 100, cat: 'physical', pp: 15, priority: 0 },
    { name: 'Megahorn', type: 'bug', power: 120, acc: 85, cat: 'physical', pp: 10, priority: 0 },
  ],
  rock: [
    { name: 'Rock Throw', type: 'rock', power: 50, acc: 90, cat: 'physical', pp: 15, priority: 0 },
    { name: 'Rock Slide', type: 'rock', power: 75, acc: 90, cat: 'physical', pp: 10, priority: 0 },
    { name: 'Stone Edge', type: 'rock', power: 100, acc: 80, cat: 'physical', pp: 5, priority: 0, crit: 1 },
    { name: 'Head Smash', type: 'rock', power: 150, acc: 80, cat: 'physical', pp: 5, priority: 0, recoil: 0.5 },
  ],
  ghost: [
    { name: 'Astonish', type: 'ghost', power: 30, acc: 100, cat: 'physical', pp: 15, priority: 0 },
    { name: 'Shadow Sneak', type: 'ghost', power: 40, acc: 100, cat: 'physical', pp: 30, priority: 1 },
    { name: 'Shadow Ball', type: 'ghost', power: 80, acc: 100, cat: 'special', pp: 15, priority: 0, effect: { chance: 0.2, stage: 'spdef', change: -1 } },
    { name: 'Phantom Force', type: 'ghost', power: 90, acc: 100, cat: 'physical', pp: 10, priority: 0 },
  ],
  steel: [
    { name: 'Metal Claw', type: 'steel', power: 50, acc: 95, cat: 'physical', pp: 35, priority: 0, effect: { chance: 0.1, stage: 'atk', change: 1 } },
    { name: 'Iron Head', type: 'steel', power: 80, acc: 100, cat: 'physical', pp: 15, priority: 0 },
    { name: 'Flash Cannon', type: 'steel', power: 80, acc: 100, cat: 'special', pp: 10, priority: 0, effect: { chance: 0.1, stage: 'spdef', change: -1 } },
    { name: 'Iron Tail', type: 'steel', power: 100, acc: 75, cat: 'physical', pp: 15, priority: 0 },
  ],
  fairy: [
    { name: 'Fairy Wind', type: 'fairy', power: 40, acc: 100, cat: 'special', pp: 30, priority: 0 },
    { name: 'Draining Kiss', type: 'fairy', power: 50, acc: 100, cat: 'special', pp: 10, priority: 0, heal: 0.75 },
    { name: 'Moonblast', type: 'fairy', power: 95, acc: 100, cat: 'special', pp: 15, priority: 0, effect: { chance: 0.3, stage: 'spatk', change: -1 } },
    { name: 'Play Rough', type: 'fairy', power: 90, acc: 90, cat: 'physical', pp: 10, priority: 0, effect: { chance: 0.1, stage: 'atk', change: -1 } },
  ],
  dark: [
    { name: 'Bite', type: 'dark', power: 60, acc: 100, cat: 'physical', pp: 25, priority: 0, effect: { chance: 0.3, status: 'flinch' } },
    { name: 'Crunch', type: 'dark', power: 80, acc: 100, cat: 'physical', pp: 15, priority: 0, effect: { chance: 0.2, stage: 'def', change: -1 } },
    { name: 'Dark Pulse', type: 'dark', power: 80, acc: 100, cat: 'special', pp: 15, priority: 0, effect: { chance: 0.2, status: 'flinch' } },
    { name: 'Foul Play', type: 'dark', power: 95, acc: 100, cat: 'physical', pp: 15, priority: 0 },
  ],
};

const TYPE_CHART = {
  fire: { grass: 2, ice: 2, bug: 2, steel: 2, fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  grass: { water: 2, ground: 2, rock: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, flying: 2, electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5, ghost: 0 },
  poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
  flying: { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  ghost: { psychic: 2, ghost: 2, dark: 0.5, normal: 0 },
  steel: { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
};

const Struggle = { name: 'Struggle', type: 'normal', power: 50, acc: 100, cat: 'physical', priority: 0, recoil: 0.25, isStruggle: true };

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const getMovesForTypes = (types) => {
  const primary = MOVE_DB[types[0]] || MOVE_DB.normal;
  const secondary = types[1] ? MOVE_DB[types[1]] : null;
  const picks = [];
  picks.push(...shuffle(primary).slice(0, 2).map(m => ({ ...m, pp: m.pp, maxPp: m.pp })));
  if (secondary) picks.push(...shuffle(secondary).slice(0, 1).map(m => ({ ...m, pp: m.pp, maxPp: m.pp })));
  else picks.push(...shuffle(primary).slice(2, 3).map(m => ({ ...m, pp: m.pp, maxPp: m.pp })));
  const need = 4 - picks.length;
  if (need > 0) picks.push(...shuffle(MOVE_DB.normal).slice(0, need).map(m => ({ ...m, pp: m.pp, maxPp: m.pp })));
  return shuffle(picks).slice(0, 4);
};

const calcHP = (base) => Math.floor(((2 * base + 31) * 50) / 100) + 60;
const calcStat = (base) => Math.floor(((2 * base + 31) * 50) / 100) + 5;
const getStat = (p, name) => {
  const base = p.stats?.find(s => s.name === name)?.base || 70;
  if (name === 'hp') return calcHP(base);
  return calcStat(base);
};
const getEffectiveness = (moveType, defenderTypes) => {
  let m = 1;
  for (const t of defenderTypes) { const v = TYPE_CHART[moveType]?.[t]; if (v !== undefined) m *= v; }
  return m;
};

// Deterministic damage given explicit random rolls from the server RNG.
const calcDamage = (attacker, defender, move, rolls) => {
  if (move.power === 0) return { dmg: 0, eff: 1, isCrit: false, miss: false, noDamage: true, stab: 1 };
  const level = 50;
  const atk = move.cat === 'special' ? getStat(attacker, 'special-attack') : getStat(attacker, 'attack');
  const def = move.cat === 'special' ? getStat(defender, 'special-defense') : getStat(defender, 'defense');
  const base = Math.floor((((2 * level / 5 + 2) * move.power * (atk / def)) / 50) + 2);
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const eff = getEffectiveness(move.type, defender.types);
  const crit = rolls.isCrit ? 1.5 : 1;
  const miss = rolls.miss || eff === 0;
  const dmg = miss ? 0 : Math.max(2, Math.floor(base * stab * eff * rolls.rand * crit));
  return { dmg, eff, isCrit: rolls.isCrit, stab, miss, noDamage: false };
};

const rng = () => ({
  rand: 0.85 + Math.random() * 0.15,
  isCrit: Math.random() < 0.0625,
  miss: false,
  accPass: Math.random() * 100,
});

const makeSide = (pokemon) => {
  const maxHp = calcHP(pokemon.stats?.find(s => s.name === 'hp')?.base || 55);
  return {
    pokemon,
    hp: maxHp,
    maxHp,
    moves: getMovesForTypes(pokemon.types),
    ready: null,     // chosen move this round (name)
    locked: false,   // has submitted this round
  };
};

// Team PvP: build a side holding an ordered team of members.
const makeMember = (pokemon) => {
  const maxHp = calcHP(pokemon.stats?.find(s => s.name === 'hp')?.base || 55);
  return { pokemon, hp: maxHp, maxHp, moves: getMovesForTypes(pokemon.types), fainted: false };
};

const makeTeamSide = (pokemonList) => ({
  team: pokemonList.map(makeMember),
  active: 0,
  locked: false,
  ready: null,       // { kind: 'move' | 'switch', index?, name? }
});

module.exports = { makeTeamSide, makeMember, calcDamage, calcHP, rng, getStat, getEffectiveness, getMovesForTypes, MOVE_DB, Struggle };
