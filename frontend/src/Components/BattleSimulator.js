import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, RefreshCw, Trophy, Zap, Shield, Crown, Flame, Droplets, Leaf, X, Activity, Timer, Search, Heart, Sparkles, ChevronRight } from 'lucide-react';
import { recordBattle } from '../Services/battleService';
import { fetchRandomPokemon } from '../Services/PokemonService';

// ---- MOVE DB (with PP, priority, effect) ----
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

const shuffle = (a) => { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]} return b; };
const getMovesForTypes = (types) => {
  const primary = MOVE_DB[types[0]] || MOVE_DB.normal;
  const secondary = types[1] ? MOVE_DB[types[1]] : null;
  const picks = [];
  // 2 primary
  picks.push(...shuffle(primary).slice(0, 2).map(m=>({ ...m, pp: m.pp, maxPp: m.pp })));
  if (secondary) picks.push(...shuffle(secondary).slice(0, 1).map(m=>({ ...m, pp: m.pp, maxPp: m.pp })));
  else picks.push(...shuffle(primary).slice(2, 3).map(m=>({ ...m, pp: m.pp, maxPp: m.pp })));
  const need = 4 - picks.length;
  if (need>0) picks.push(...shuffle(MOVE_DB.normal).slice(0, need).map(m=>({ ...m, pp: m.pp, maxPp: m.pp })));
  // Struggle as fallback when PP depleted is handled separately
  return shuffle(picks).slice(0,4);
};
// Real Gen3+ stat calc at Lv50, IV 31, EV 0
const calcHP = (base) => Math.floor(((2*base+31)*50)/100)+60;
const calcStat = (base) => Math.floor(((2*base+31)*50)/100)+5;
const getStat = (p, name) => {
  const base = p.stats?.find(s=>s.name===name)?.base || 70;
  if(name==='hp') return calcHP(base);
  return calcStat(base);
};
const getEffectiveness = (moveType, defenderTypes) => {
  let m=1;
  for(const t of defenderTypes){ const v=TYPE_CHART[moveType]?.[t]; if(v!==undefined) m*=v; }
  return m;
};
const calcDamage = (attacker, defender, move) => {
  if(move.power===0) return { dmg:0, eff:1, isCrit:false, miss:false, noDamage:true };
  const level=50;
  const atk = move.cat==='special' ? getStat(attacker,'special-attack') : getStat(attacker,'attack');
  const def = move.cat==='special' ? getStat(defender,'special-defense') : getStat(defender,'defense');
  const base = Math.floor((((2*level/5+2)*move.power*(atk/def))/50)+2);
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const eff = getEffectiveness(move.type, defender.types);
  const rand = 0.85 + Math.random()*0.15;
  const isCrit = Math.random()<0.0625;
  const crit = isCrit?1.5:1;
  const miss = Math.random()*100 > move.acc;
  const dmg = miss || eff===0 ? 0 : Math.max(2, Math.floor(base*stab*eff*rand*crit));
  return { dmg, eff, isCrit, stab, miss, noDamage:false };
};
const typeColor = (t)=>({
  fire:'#ff3d00',water:'#3b82f6',grass:'#22c55e',electric:'#eab308',psychic:'#ec4899',ice:'#06b6d4',dragon:'#7c3aed',fairy:'#f472b6',normal:'#a8a29e',poison:'#a855f7',ground:'#ca8a04',flying:'#818cf8',bug:'#84cc16',rock:'#78716c',ghost:'#6b7280',steel:'#64748b',fighting:'#dc2626',dark:'#44403c'
}[t]||'#64748b');

const Struggle = { name:'Struggle', type:'normal', power:50, acc:100, cat:'physical', pp:1, maxPp:1, priority:0, recoil:0.25, isStruggle:true };

const BattleSimulator = ({ team }) => {
  const [pokemon1, setPokemon1] = useState(null);
  const [pokemon2, setPokemon2] = useState(null);
  const [wildPokemon, setWildPokemon] = useState([]);
  const [battleMode, setBattleMode] = useState('wild');
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [session, setSession] = useState(null);
  const [anim, setAnim] = useState(null);
  const [damagePop, setDamagePop] = useState(null);
  const [dialog, setDialog] = useState('');
  const [menu, setMenu] = useState('main'); // main | fight | bag
  const sessionRef = useRef(null);
  useEffect(()=>{ sessionRef.current = session; }, [session]);

  useEffect(() => {
    const load = async () => {
      try{
        if(battleMode==='wild'){
          const rnd = await Promise.all(Array(5).fill().map(()=>fetchRandomPokemon().then(p=>({...p, back: p.image?.replace('other/official-artwork','sprites/pokemon/other/official-artwork') || p.image, front: p.image }))));
          setWildPokemon(rnd);
        }
        setIsLoading(false);
      }catch(e){ setIsLoading(false); console.error(e); }
    };
    load();
  }, [battleMode]);

  const resetSession = () => { setSession(null); setAnim(null); setDamagePop(null); setDialog(''); setMenu('main'); };

  const startBattle = () => {
    if(!pokemon1 || !pokemon2) return;
    const p1max = calcHP(pokemon1.stats?.find(s=>s.name==='hp')?.base||55);
    const p2max = calcHP(pokemon2.stats?.find(s=>s.name==='hp')?.base||55);
    const sess = {
      player:{ pokemon:pokemon1, hp:p1max, maxHp:p1max, moves:getMovesForTypes(pokemon1.types), original:pokemon1 },
      enemy:{ pokemon:pokemon2, hp:p2max, maxHp:p2max, moves:getMovesForTypes(pokemon2.types), original:pokemon2 },
      turn:'player',
      winner:null,
      turnCount:1,
      weather:null,
    };
    setSession(sess);
    setDialog(`Wild ${pokemon2.name.toUpperCase()} appeared!`);
    setTimeout(()=> setDialog(`Go! ${pokemon1.name.toUpperCase()}! What will you do?`), 900);
  };

  const typewriter = (text) => { setDialog(''); let i=0; const iv=setInterval(()=>{ setDialog(text.slice(0, ++i)); if(i>=text.length) clearInterval(iv); }, 14); };

  const chooseEnemyMove = (enemy) => {
    // 70% pick best expected damage, 30% random
    if(Math.random()<0.3) return enemy.moves.filter(m=>m.pp>0)[0] || enemy.moves[Math.floor(Math.random()*enemy.moves.length)] || Struggle;
    const withPp = enemy.moves.filter(m=>m.pp>0);
    const pool = withPp.length? withPp : [Struggle];
    // score by power * effectiveness
    const playerTypes = sessionRef.current?.player.pokemon.types || [];
    let best = pool[0]; let bestScore = -1;
    for(const m of pool){
      const eff = getEffectiveness(m.type, playerTypes);
      const score = m.power * eff * (m.type===enemy.pokemon.types[0]?1.5:1) * (Math.random()*0.15+0.92);
      if(score>bestScore){ bestScore=score; best=m; }
    }
    return best;
  };

  const doAttack = async (attackerKey, defenderKey, move) => {
    const cur = sessionRef.current;
    if(!cur || cur.winner) return null;
    const attacker = cur[attackerKey];
    const defender = cur[defenderKey];
    if(!attacker || !defender) return null;
    // PP check (except Struggle)
    const moveWithPp = move.isStruggle ? move : attacker.moves.find(m=>m.name===move.name) || move;
    if(!move.isStruggle && moveWithPp.pp<=0){
      typewriter(`${attacker.pokemon.name} has no PP left for ${move.name}!`);
      await new Promise(r=>setTimeout(r, 700));
      return 'continue';
    }
    // consume PP
    if(!move.isStruggle){
      setSession(prev=>{
        if(!prev) return prev;
        const next={...prev};
        const idx = next[attackerKey].moves.findIndex(m=>m.name===move.name);
        if(idx>=0){ next[attackerKey].moves[idx] = { ...next[attackerKey].moves[idx], pp: Math.max(0, next[attackerKey].moves[idx].pp-1) } }
        return next;
      });
      await new Promise(r=>setTimeout(r, 30));
    }

    const { dmg, eff, isCrit, miss } = calcDamage(attacker.pokemon, defender.pokemon, moveWithPp);
    setAnim({ who: attackerKey, move: moveWithPp, dmg: miss?0:dmg, eff, isCrit, miss });
    typewriter(`${attacker.pokemon.name} used ${moveWithPp.name}!`);
    await new Promise(r=>setTimeout(r, 620));
    if(miss){
      typewriter(`But it missed!`);
      setDamagePop({who:defenderKey, value:'MISS', eff});
      await new Promise(r=>setTimeout(r, 700));
      setAnim(null); setDamagePop(null);
      setSession(prev=>{
        if(!prev) return prev;
        const next={...prev};
        next.turn = next.turn==='player' ? 'enemy' : 'player';
        return next;
      });
      await new Promise(r=>setTimeout(r, 200));
      return 'continue';
    }
    if(eff===0){
      typewriter(`It has no effect on ${defender.pokemon.name}...`);
      setDamagePop({who:defenderKey, value:'NO EFFECT', eff});
      await new Promise(r=>setTimeout(r, 700));
      setAnim(null); setDamagePop(null);
      setSession(prev=>{ if(!prev) return prev; const n={...prev}; n.turn=n.turn==='player'?'enemy':'player'; return n; });
      return 'continue';
    }
    // hit
    setDamagePop({who:defenderKey, value:`-${dmg}`, eff, isCrit});
    if(isCrit) typewriter(`A critical hit!`);
    else if(eff>1) typewriter(`It's super effective!`);
    else if(eff<1) typewriter(`It's not very effective...`);
    await new Promise(r=>setTimeout(r, 260));
    // apply damage + handle heal/recoil
    let fainted=false;
    let healAmt=0;
    let recoilAmt=0;
    setSession(prev=>{
      if(!prev) return prev;
      const defNow = prev[defenderKey];
      let newHp = Math.max(0, defNow.hp - dmg);
      fainted = newHp===0;
      const next={...prev};
      next[defenderKey] = { ...defNow, hp:newHp };
      // heal (Giga Drain etc)
      if(moveWithPp.heal && !fainted){
        healAmt = Math.floor(dmg*moveWithPp.heal);
        const atkNow = prev[attackerKey];
        next[attackerKey] = { ...atkNow, hp: Math.min(atkNow.maxHp, atkNow.hp + healAmt) };
      }
      // recoil
      if(moveWithPp.recoil && !fainted){
        recoilAmt = Math.floor(dmg*moveWithPp.recoil);
      }
      if(fainted){
        const win = prev[attackerKey].pokemon;
        next.winner = win;
        next.turn='over';
      } else {
        next.turn = next.turn==='player' ? 'enemy' : 'player';
        if(recoilAmt){
          const atkNow2 = next[attackerKey];
          next[attackerKey] = { ...atkNow2, hp: Math.max(0, atkNow2.hp - recoilAmt) };
          if(next[attackerKey].hp===0){ fainted=true; next.winner = prev[defenderKey].pokemon; next.turn='over'; }
        }
      }
      return next;
    });
    await new Promise(r=>setTimeout(r, 520));
    if(healAmt) { typewriter(`${attacker.pokemon.name} restored ${healAmt} HP!`); await new Promise(r=>setTimeout(r, 700)); }
    if(recoilAmt) { typewriter(`${attacker.pokemon.name} took ${recoilAmt} recoil damage!`); await new Promise(r=>setTimeout(r, 700)); }
    setAnim(null); setDamagePop(null);
    await new Promise(r=>setTimeout(r, 180));
    // check faint after recoil
    const after = sessionRef.current;
    if(after && (after.player.hp===0 || after.enemy.hp===0)){
      const loser = after.player.hp===0 ? after.player : after.enemy;
      const win = after.player.hp===0 ? after.enemy.pokemon : after.player.pokemon;
      typewriter(`${loser.pokemon.name} fainted!`);
      await new Promise(r=>setTimeout(r, 800));
      typewriter(`${win.name.toUpperCase()} wins!`);
      const entry={ pokemon1:after.player.pokemon.name, pokemon2:after.enemy.pokemon.name, winner:win.name, timestamp:new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), mode:battleMode };
      setHistory(prev=>[entry, ...prev.slice(0,4)]);
      try{ await recordBattle(after.player.pokemon, after.enemy.pokemon, win);}catch(e){ console.error(e); }
      setSession(prev=> prev ? {...prev, winner: win, turn:'over'} : prev);
      return 'fainted';
    }
    if(!fainted) typewriter(`What will ${sessionRef.current?.player.pokemon.name} do?`);
    await new Promise(r=>setTimeout(r, 120));
    return 'continue';
  };

  const handlePlayerMove = async (move) => {
    const cur = sessionRef.current;
    if(!cur || cur.winner || cur.turn!=='player' || anim) return;
    // determine enemy move early for speed order
    const enemyMove = chooseEnemyMove(cur.enemy);
    const pSpeed = getStat(cur.player.pokemon,'speed');
    const eSpeed = getStat(cur.enemy.pokemon,'speed');
    const pPri = move.priority||0;
    const ePri = enemyMove.priority||0;
    let order;
    if(pPri!==ePri) order = pPri>ePri ? ['player','enemy'] : ['enemy','player'];
    else if(pSpeed!==eSpeed) order = pSpeed>eSpeed ? ['player','enemy'] : ['enemy','player'];
    else order = Math.random()<0.5 ? ['player','enemy'] : ['enemy','player'];

    setMenu('main');
    // execute in order
    for(const who of order){
      const afterCheck = sessionRef.current;
      if(!afterCheck || afterCheck.winner) break;
      if(who==='player'){
        const res = await doAttack('player','enemy', move);
        if(res==='fainted') break;
        // if player was slower and enemy already attacked this round, don't attack again
        if(order[0]==='enemy' && who==='player' && afterCheck.enemy.hp===0) break;
      } else {
        const res = await doAttack('enemy','player', enemyMove);
        if(res==='fainted') break;
      }
      // small gap between the two attacks in same round
      if(order.length===2 && who===order[0]){
        const mid = sessionRef.current;
        if(mid && !mid.winner) await new Promise(r=>setTimeout(r, 300));
        else break;
      }
    }
    // increment turn
    setSession(prev=> prev && !prev.winner ? {...prev, turn:'player', turnCount:(prev.turnCount||1)+1 } : prev);
  };

  const refreshWild = async()=>{
    setIsLoading(true);
    try{ const n=await fetchRandomPokemon(); setWildPokemon(prev=>[{...n, front:n.image, back:n.image}, ...prev.slice(0,4)]);}catch(e){console.error(e)}
    finally{ setIsLoading(false); }
  };

  if(isLoading){
    return (
      <div className="battle-simulator">
        <h2><Swords size={16}/> Battle Arena</h2>
        <p className="team-sub">Loading opponents…</p>
        <div style={{marginTop:14, display:'grid', gap:10}}><div className="skeleton-card" style={{height:92}}/><div className="skeleton-card" style={{height:92}}/></div>
      </div>
    );
  }
  if(!team || team.length===0){
    return (
      <div className="battle-simulator">
        <h2><Swords size={16}/> Battle Arena</h2>
        <div className="empty-team" style={{marginTop:14}}><Swords size={28} style={{color:'#94a3b8'}}/><p>No Pokémon in your team. Catch one to enter the arena.</p></div>
      </div>
    );
  }

  if(session){
    const playerPct = (session.player.hp/session.player.maxHp)*100;
    const enemyPct = (session.enemy.hp/session.enemy.maxHp)*100;
    const playerLow = playerPct<25;
    const enemyLow = enemyPct<25;
    const canAct = !session.winner && !anim && session.turn==='player';
    return (
      <div className="battle-simulator realistic" style={{padding:0, overflow:'hidden', border:'3px solid #0f172a', boxShadow:'0 12px 32px rgba(0,0,0,.18)'}}>
        {/* Header */}
        <div className="battle-arena-head">
          <button className="btn-refresh" onClick={resetSession} style={{height:32, padding:'0 10px', fontSize:'.78rem'}}><X size={12}/> Run</button>
          <span className="pill" style={{fontSize:'.72rem'}}><Timer size={12}/> Turn {session.turnCount} • {session.winner ? 'Finished' : session.turn==='player' ? 'Your move' : 'Foe thinking…'}</span>
          <span className="pill" style={{fontSize:'.72rem', background: session.winner ? (session.winner.id===session.player.pokemon.id?'#22c55e':'#ef4444') : '#fff', color: session.winner ? '#fff' : undefined}}>{session.winner ? `Winner: ${session.winner.name}` : `${session.player.pokemon.name} vs ${session.enemy.pokemon.name}`}</span>
        </div>

        <div className={`battle-stage realistic-stage ${anim?.who==='player' ? 'shake-enemy' : ''} ${anim?.who==='enemy' ? 'shake-player' : ''}`}>
          <div className="battle-field realistic-field">
            {/* Enemy */}
            <div className={`combatant enemy ${anim?.who==='enemy' ? 'attacking' : ''} ${damagePop?.who==='enemy' ? 'hit' : ''} ${session.enemy.hp===0 ? 'fainted' : ''}`}>
              <div className="hp-card classic">
                <div className="hp-top">
                  <span className="hp-name">{session.enemy.pokemon.name} <span className="hp-lv">:L{50}</span> <span className="hp-gender">{session.enemy.pokemon.id%2===0?'♂':'♀'}</span></span>
                  <span className="hp-num">{session.enemy.hp}/{session.enemy.maxHp}</span>
                </div>
                <div className="hp-bar-classic"><div className="hp-bar-track"><motion.div className={`hp-bar-fill ${enemyLow ? 'low' : enemyPct<50 ? 'mid' : ''}`} animate={{width:`${enemyPct}%`}} transition={{duration:.55, ease:[0.22,1,0.36,1]}} /><motion.div className="hp-bar-delay" animate={{width:`${enemyPct}%`}} transition={{duration:.85, delay:.12}} /></div><span className="hp-label">HP</span></div>
                <div className="hp-exp"><div className="exp-bar"><div className="exp-fill" style={{width:'62%'}}/></div><span>Exp.</span></div>
              </div>
              <div className="sprite-wrap realistic">
                <div className="platform realistic-platform" />
                <motion.img
                  src={session.enemy.pokemon.image}
                  alt={session.enemy.pokemon.name}
                  className={`battle-sprite enemy-sprite ${anim?.who==='player' && damagePop?.who==='enemy' ? 'flash' : ''}`}
                  animate={
                    anim?.who==='enemy' ? { x: -36, y: -4, scale: 1.07 } :
                    anim?.who==='player' && damagePop?.who==='enemy' ? { x: [0, -7, 7, -5, 0], transition:{duration:.34} } :
                    { x:0, y:0, scale:1 }
                  }
                  transition={{type:'spring', stiffness:520, damping:20}}
                  style={{ filter: session.enemy.hp===0 ? 'grayscale(1) brightness(.8)' : undefined }}
                />
                {damagePop?.who==='enemy' && (
                  <motion.div key={damagePop.value+Math.random()} initial={{y:8, opacity:0, scale:.8}} animate={{y:-46, opacity:1, scale:1}} exit={{opacity:0}} transition={{duration:.62, ease:[0.22,1,0.36,1]}} className={`dmg-pop ${damagePop.eff>1 ? 'super' : damagePop.eff<1 && damagePop.eff>0 ? 'resist' : ''} ${damagePop.isCrit ? 'crit' : ''} ${damagePop.value==='MISS' ? 'miss' : ''}`}>
                    {damagePop.value}{damagePop.isCrit && damagePop.value!=='MISS' ? '!' : ''}
                  </motion.div>
                )}
                {anim?.who==='player' && !anim.miss && (
                  <motion.div className={`projectile p-${anim.move.type}`} initial={{x:-92, y:18, scale:.45, opacity:0}} animate={{x:0, y:0, scale:1, opacity:1}} exit={{opacity:0}} transition={{duration:.42, ease:[0.22,1,0.36,1]}}>
                    <span className="proj-core" style={{background:typeColor(anim.move.type)}} />
                    <span className="proj-trail" style={{background:typeColor(anim.move.type)}}/>
                    {anim.move.type==='fire' && <Flame size={16} style={{color:'#ff6b35', position:'absolute'}}/>}
                    {anim.move.type==='water' && <Droplets size={16} style={{color:'#38bdf8', position:'absolute'}}/>}
                    {anim.move.type==='grass' && <Leaf size={16} style={{color:'#22c55e', position:'absolute'}}/>}
                    {anim.move.type==='electric' && <Zap size={16} style={{color:'#facc15', position:'absolute'}}/>}
                  </motion.div>
                )}
                {session.enemy.hp===0 && <div className="faint-overlay">FAINTED</div>}
              </div>
            </div>

            <div className="battle-divider"><span className="vs-mini">VS</span></div>

            {/* Player */}
            <div className={`combatant player ${anim?.who==='player' ? 'attacking' : ''} ${damagePop?.who==='player' ? 'hit' : ''} ${session.player.hp===0 ? 'fainted' : ''}`}>
              <div className="sprite-wrap realistic">
                <div className="platform realistic-platform player-plat" />
                <motion.img
                  src={session.player.pokemon.image}
                  alt={session.player.pokemon.name}
                  className={`battle-sprite player-sprite ${anim?.who==='enemy' && damagePop?.who==='player' ? 'flash' : ''}`}
                  animate={
                    anim?.who==='player' ? { x: 36, y: -4, scale: 1.07 } :
                    anim?.who==='enemy' && damagePop?.who==='player' ? { x: [0, 7, -7, 5, 0], transition:{duration:.34} } :
                    { x:0, y:0, scale:1 }
                  }
                  transition={{type:'spring', stiffness:520, damping:20}}
                  style={{ transform: 'scaleX(-1)', filter: session.player.hp===0 ? 'grayscale(1) brightness(.8)' : undefined }}
                />
                {damagePop?.who==='player' && (
                  <motion.div key={damagePop.value+Math.random()} initial={{y:8, opacity:0, scale:.8}} animate={{y:-46, opacity:1, scale:1}} exit={{opacity:0}} transition={{duration:.62}} className={`dmg-pop ${damagePop.eff>1 ? 'super' : ''} ${damagePop.isCrit ? 'crit' : ''} ${damagePop.value==='MISS' ? 'miss' : ''}`}>
                    {damagePop.value}{damagePop.isCrit && damagePop.value!=='MISS' ? '!' : ''}
                  </motion.div>
                )}
                {anim?.who==='enemy' && !anim.miss && (
                  <motion.div className={`projectile p-${anim.move.type} from-enemy`} initial={{x:92, y:18, scale:.45, opacity:0}} animate={{x:0, y:0, scale:1, opacity:1}} transition={{duration:.42}}>
                    <span className="proj-core" style={{background:typeColor(anim.move.type)}}/>
                    <span className="proj-trail" style={{background:typeColor(anim.move.type)}}/>
                  </motion.div>
                )}
                {session.player.hp===0 && <div className="faint-overlay">FAINTED</div>}
              </div>
              <div className="hp-card classic player-hp">
                <div className="hp-top">
                  <span className="hp-name">{session.player.pokemon.name} <span className="hp-lv">:L{50}</span> <span className="hp-gender">{session.player.pokemon.id%2===0?'♀':'♂'}</span></span>
                  <span className="hp-num">{session.player.hp}/{session.player.maxHp}</span>
                </div>
                <div className="hp-bar-classic"><div className="hp-bar-track"><motion.div className={`hp-bar-fill ${playerLow ? 'low' : playerPct<50 ? 'mid' : ''}`} animate={{width:`${playerPct}%`}} transition={{duration:.55}} /><motion.div className="hp-bar-delay" animate={{width:`${playerPct}%`}} transition={{duration:.85, delay:.12}} /></div><span className="hp-label">HP</span></div>
                <div className="hp-exp"><div className="exp-bar"><div className="exp-fill" style={{width: session.winner ? '100%' : '48%'}}/></div><span>Exp.</span></div>
              </div>
            </div>
          </div>

          <div className="battle-log realistic-log">
            <div className="dialog-cursor">▶</div>
            <AnimatePresence mode="wait">
              <motion.div key={dialog} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="log-line realistic-line">{dialog}</motion.div>
            </AnimatePresence>
            {anim && !anim.miss && anim.eff!==1 && (
              <motion.div initial={{scale:.9, opacity:0}} animate={{scale:1, opacity:1}} className={`eff-badge ${anim.eff>1 ? 'super' : anim.eff===0 ? 'immune' : 'resist'}`}>
                {anim.eff>1 ? 'Super effective!' : anim.eff===0 ? 'No effect!' : 'Not very effective...'}
              </motion.div>
            )}
            <div className="log-pp">{session.player.moves.find(m=>m.name===anim?.move.name)?.pp ?? ''}{anim ? ` • ${anim.move.type} • ${anim.move.cat}` : ''}</div>
          </div>
        </div>

        <div className="battle-controls realistic-controls">
          {!session.winner ? (
            <>
              {menu==='main' ? (
                <div className="main-menu-grid">
                  <button className="main-menu-btn fight" onClick={()=>setMenu('fight')} disabled={!!anim}><span><Swords size={16}/> FIGHT</span><small>Attack</small></button>
                  <button className="main-menu-btn" disabled><span><Shield size={16}/> BAG</span><small>Items</small></button>
                  <button className="main-menu-btn" disabled><span><Crown size={16}/> POKéMON</span><small>Switch</small></button>
                  <button className="main-menu-btn run" onClick={resetSession}><span><X size={16}/> RUN</span><small>Flee</small></button>
                </div>
              ) : (
                <>
                  <div className="moves-grid realistic-moves">
                    {session.player.moves.map((m)=>{
                      const out = m.pp<=0;
                      return (
                        <button
                          key={m.name}
                          className={`move-btn realistic-move type-${m.type} ${out ? 'out' : ''} ${anim ? 'disabled' : ''}`}
                          onClick={()=>handlePlayerMove(m)}
                          disabled={!!anim || session.turn!=='player' || out}
                          style={{borderColor: out ? '#e2e8f0' : typeColor(m.type)}}
                        >
                          <div className="move-head">
                            <span className="move-name">{m.name}</span>
                            <span className={`move-cat ${m.cat}`}>{m.cat==='special' ? 'SP' : 'PH'}</span>
                            {m.priority>0 && <span className="prio-badge">+{m.priority}</span>}
                          </div>
                          <div className="move-foot">
                            <span className="move-type" style={{background: out ? '#94a3b8' : typeColor(m.type)}}>{m.type}</span>
                            <span className="move-pow"><Zap size={10}/> {m.power}</span>
                            <span className="move-pp" style={{color: m.pp<=5 ? '#ef4444' : m.pp<=10 ? '#f59e0b' : '#64748b'}}>PP {m.pp}/{m.maxPp}</span>
                          </div>
                          <div className="move-acc">ACC {m.acc}% • {m.pp===0 ? 'No PP!' : canAct ? 'Ready' : 'Wait…'}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="battle-actions">
                    <button className="btn-refresh" onClick={()=>setMenu('main')}><X size={12}/> Back</button>
                    <div className="turn-hint"><Activity size={12} style={{display:'inline', verticalAlign:-2}}/> {session.turn==='player' ? `Speed: ${getStat(session.player.pokemon,'speed')} vs ${getStat(session.enemy.pokemon,'speed')} — priority wins` : 'Foe is choosing…'}</div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="battle-result" style={{margin:12, borderColor: session.winner.id===session.player.pokemon.id ? '#22c55e' : '#ef4444', background: session.winner.id===session.player.pokemon.id ? 'linear-gradient(135deg,#f0fdf4,#fff)' : 'linear-gradient(135deg,#fef2f2,#fff)'}}>
              <div style={{display:'inline-flex', alignItems:'center', gap:6, background: session.winner.id===session.player.pokemon.id ? '#22c55e' : '#ef4444', color:'#fff', padding:'4px 10px', borderRadius:999, fontWeight:900, fontSize:'.76rem'}}>
                <Trophy size={14}/> {session.winner.id===session.player.pokemon.id ? 'YOU WIN!' : 'YOU LOST'}
              </div>
              <h3 className="winner" style={{marginTop:8}}>{session.winner.name.toUpperCase()} wins!</h3>
              <img src={session.winner.image} alt={session.winner.name} className="winner-image" style={{width:110, height:110}}/>
              <div style={{display:'flex', gap:8, justifyContent:'center', marginTop:10}}>
                <button className="cta-btn" onClick={resetSession}>Battle Again</button>
                <button className="btn-refresh" onClick={()=>{ resetSession(); setPokemon2(null); setPokemon1(null); }}>Change Team</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // SELECTOR MODE — simple wizard (less confusing)
  const getRarity = (p) => {
    const total = p.stats?.reduce((s,x)=>s+x.base,0) || 0;
    if(total>580 || ['mewtwo','rayquaza','lugia','ho-oh','dialga','palkia','giratina','mew','celebi'].includes(p.name)) return { label:'Legendary', color:'#f59e0b', bg:'linear-gradient(135deg,#fef3c7,#fde68a)' };
    if(total>470) return { label:'Rare', color:'#8b5cf6', bg:'linear-gradient(135deg,#ede9fe,#ddd6fe)' };
    if(total>380) return { label:'Uncommon', color:'#0ea5e9', bg:'linear-gradient(135deg,#e0f2fe,#bae6fd)' };
    return { label:'Common', color:'#64748b', bg:'linear-gradient(135deg,#f1f5f9,#e2e8f0)' };
  };
  const step = !pokemon1 ? 1 : !pokemon2 ? 2 : 3;

  return (
    <div className="battle-simulator draft-mode wizard">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap'}}>
        <h2><Swords size={16}/> Battle Arena</h2>
        <span className="pill" style={{fontSize:'.74rem'}}><Sparkles size={12}/> {step===1 ? 'Step 1 of 3' : step===2 ? 'Step 2 of 3' : 'Ready!'}</span>
      </div>

      {/* Stepper */}
      <div className="wizard-stepper">
        <div className={`w-step ${step>=1?'active':''} ${step>1?'done':''}`}><span>{step>1 ? '✓' : '1'}</span><b>Your Fighter</b><small>{pokemon1 ? pokemon1.name : 'Choose'}</small></div>
        <div className={`w-line ${step>1?'on':''}`} />
        <div className={`w-step ${step>=2?'active':''} ${step>2?'done':''}`}><span>{step>2 ? '✓' : '2'}</span><b>Opponent</b><small>{pokemon2 ? pokemon2.name : battleMode==='wild' ? 'Wild' : 'Team'}</small></div>
        <div className={`w-line ${step>2?'on':''}`} />
        <div className={`w-step ${step===3?'active':''}`}><span>3</span><b>Battle</b><small>Start</small></div>
      </div>

      <div className="battle-mode-toggle" style={{margin:'12px auto', display:'flex', justifyContent:'center'}}>
        <button className={`mode-btn ${battleMode==='wild'?'active':''}`} onClick={()=>{setBattleMode('wild'); setPokemon2(null);}}>Wild Encounter</button>
        <button className={`mode-btn ${battleMode==='team'?'active':''}`} onClick={()=>{setBattleMode('team'); setPokemon2(null);}}>Team Battle</button>
      </div>

      {/* STEP 1 — pick your fighter */}
      {step===1 && (
        <div className="wizard-panel">
          <div className="wizard-head">
            <h3><Crown size={16}/> Step 1 — Pick your fighter</h3>
            <p>Only one. Tap a card → it locks and we move to opponent. Your fighter always shown with a green check.</p>
          </div>
          {team.length===0 ? (
            <div className="empty-team"><p>Your team is empty. Catch Pokémon in Discover first!</p></div>
          ) : (
            <div className="fighter-grid wizard-grid">
              {team.map(p=>{
                const hp=calcHP(p.stats?.find(s=>s.name==='hp')?.base||55);
                const spd=getStat(p,'speed');
                return (
                  <motion.button key={p.id} onClick={()=>setPokemon1(p)} className="fighter-card wizard-card" whileHover={{y:-2}} whileTap={{scale:.98}} style={{borderColor: typeColor(p.types[0])}}>
                    <div className="fighter-img" style={{background:`radial-gradient(220px 120px at 50% 20%, ${typeColor(p.types[0])}18, transparent 70%), linear-gradient(180deg, #fff, #f8fafc)`}}>
                      <img src={p.image} alt={p.name} />
                      <span className="card-num">#{String(p.id).padStart(4,'0')}</span>
                    </div>
                    <div className="fighter-body">
                      <div className="fighter-name">{p.name}</div>
                      <div className="fighter-types">{p.types.map(t=><span key={t} className={`type-badge type-${t}`} style={{fontSize:'.54rem', padding:'2px 6px'}}>{t}</span>)}</div>
                      <div className="fighter-stats"><span><Heart size={10}/> {hp} HP</span><span><Zap size={10}/> {spd} SPD</span></div>
                    </div>
                    <div className="pick-cta">Tap to pick <ChevronRight size={12}/></div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 2 — pick opponent */}
      {step===2 && (
        <div className="wizard-panel">
          <div className="picked-summary">
            <img src={pokemon1.image} alt={pokemon1.name} />
            <div>
              <b>You picked {pokemon1.name}</b>
              <small>{pokemon1.types.join(' / ')} • {calcHP(pokemon1.stats?.find(s=>s.name==='hp')?.base||55)} HP • {getStat(pokemon1,'speed')} SPD</small>
            </div>
            <button className="btn-refresh small" onClick={()=>setPokemon1(null)}><X size={12}/> Change</button>
          </div>

          <div className="wizard-head" style={{marginTop:14}}>
            <h3>{battleMode==='wild' ? <><Zap size={16}/> Step 2 — Choose wild opponent</> : <><Swords size={16}/> Step 2 — Choose team foe</>}</h3>
            <p>{battleMode==='wild' ? 'Tap one wild card to challenge. Shuffle for new faces.' : 'Tap a teammate (not your fighter) to battle.'}</p>
          </div>

          {battleMode==='wild' ? (
            <>
              <div className="wild-toolbar">
                <div className="wild-search"><Search size={12}/> Lv.50 • rarity by power</div>
                <button className="btn-refresh" onClick={refreshWild} disabled={isLoading} style={{height:32, fontSize:'.76rem'}}><RefreshCw size={12}/> Shuffle</button>
              </div>
              <div className="wild-grid wizard-grid">
                {wildPokemon.map(w=>{
                  const hp=calcHP(w.stats?.find(s=>s.name==='hp')?.base||55);
                  const rarity=getRarity(w);
                  return (
                    <motion.button key={w.id} onClick={()=>setPokemon2(w)} className="wild-card wizard-card" whileHover={{y:-2}} whileTap={{scale:.98}} style={{borderColor: typeColor(w.types[0])}}>
                      <span className="rarity" style={{background: rarity.bg, color: rarity.color, borderColor: rarity.color}}>{rarity.label}</span>
                      <div className="wild-img" style={{background:`radial-gradient(180px 90px at 50% 18%, ${typeColor(w.types[0])}18, transparent 70%)`}}>
                        <img src={w.image} alt={w.name} />
                      </div>
                      <div className="wild-name">{w.name} <span>Lv.50</span></div>
                      <div className="wild-types">{w.types.map(t=><span key={t} className={`type-badge type-${t}`} style={{fontSize:'.52rem', padding:'2px 6px'}}>{t}</span>)}</div>
                      <div className="wild-stats"><span>{hp} HP</span><span>{getStat(w,'speed')} SPD</span></div>
                      <div className="pick-cta">Challenge <ChevronRight size={12}/></div>
                    </motion.button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="fighter-grid wizard-grid">
              {team.filter(p=> p.id!==pokemon1.id).map(p=>{
                const hp=calcHP(p.stats?.find(s=>s.name==='hp')?.base||55);
                return (
                  <motion.button key={p.id} onClick={()=>setPokemon2(p)} className="fighter-card wizard-card" whileHover={{y:-2}} whileTap={{scale:.98}} style={{borderColor: typeColor(p.types[0])}}>
                    <div className="fighter-img"><img src={p.image} alt={p.name}/><span className="card-num">#{String(p.id).padStart(4,'0')}</span></div>
                    <div className="fighter-body">
                      <div className="fighter-name">{p.name}</div>
                      <div className="fighter-types">{p.types.map(t=><span key={t} className={`type-badge type-${t}`} style={{fontSize:'.54rem', padding:'2px 6px'}}>{t}</span>)}</div>
                      <div className="fighter-stats"><span><Heart size={10}/> {hp} HP</span><span>{getStat(p,'speed')} SPD</span></div>
                    </div>
                    <div className="pick-cta">Challenge <ChevronRight size={12}/></div>
                  </motion.button>
                );
              })}
              {team.filter(p=> p.id!==pokemon1.id).length===0 && (
                <div className="empty-team" style={{gridColumn:'1/-1'}}><p>Need 2+ Pokémon for Team Battle. Catch more!</p></div>
              )}
            </div>
          )}
          <button className="btn-refresh" onClick={()=>setPokemon2(null)} disabled={!pokemon2} style={{marginTop:10, opacity: pokemon2?1:.5}}><X size={12}/> Clear opponent</button>
        </div>
      )}

      {/* STEP 3 — ready */}
      {step===3 && (
        <div className="wizard-panel ready">
          <div className="ready-vs">
            <div className="ready-card you">
              <img src={pokemon1.image} alt={pokemon1.name} />
              <h4>{pokemon1.name}</h4>
              <div className="ready-types">{pokemon1.types.map(t=><span key={t} className={`type-badge type-${t}`}>{t}</span>)}</div>
              <small>{calcHP(pokemon1.stats?.find(s=>s.name==='hp')?.base||55)} HP • {getStat(pokemon1,'speed')} SPD</small>
              <button className="mini-link" onClick={()=>setPokemon1(null)}>Change</button>
            </div>
            <div className="ready-mid">
              <div className="vs-ring small"><span className="vs-mini">VS</span></div>
              <div className="ready-edge">
                {(() => {
                  const aSpd=getStat(pokemon1,'speed'), bSpd=getStat(pokemon2,'speed');
                  const aBest=Math.max(...getMovesForTypes(pokemon1.types).map(m=> m.power * getEffectiveness(m.type, pokemon2.types)));
                  const bBest=Math.max(...getMovesForTypes(pokemon2.types).map(m=> m.power * getEffectiveness(m.type, pokemon1.types)));
                  const edge = aBest>bBest ? pokemon1.name : bBest>aBest ? pokemon2.name : aSpd>bSpd ? pokemon1.name : bSpd>aSpd ? pokemon2.name : 'Even';
                  return <span className={`edge ${edge===pokemon1.name?'player': edge===pokemon2.name?'enemy':'even'}`}>{edge==='Even' ? 'Even matchup' : `Edge: ${edge}`}</span>;
                })()}
              </div>
              <small className="edge-hint"><Activity size={10}/> Speed + priority decides first strike</small>
            </div>
            <div className="ready-card foe">
              <img src={pokemon2.image} alt={pokemon2.name} />
              <h4>{pokemon2.name}</h4>
              <div className="ready-types">{pokemon2.types.map(t=><span key={t} className={`type-badge type-${t}`}>{t}</span>)}</div>
              <small>{calcHP(pokemon2.stats?.find(s=>s.name==='hp')?.base||55)} HP • {getStat(pokemon2,'speed')} SPD</small>
              <button className="mini-link" onClick={()=>setPokemon2(null)}>Change</button>
            </div>
          </div>

          <div className="ready-actions">
            <button className="btn-refresh" onClick={()=>{setPokemon2(null);}}><ChevronRight size={14} style={{transform:'rotate(180deg)'}}/> Back to opponent</button>
            <button className="battle-button ready-cta" onClick={startBattle}>
              Start Battle — {pokemon1.name} vs {pokemon2.name} <Swords size={16}/>
            </button>
          </div>
          <p className="cta-hint"><Sparkles size={12}/> First strike by priority → speed. PP tracked. Good luck!</p>
        </div>
      )}

      {history.length>0 && (
        <div className="battle-history">
          <h4>Recent battles</h4>
          <ul>{history.map((b,i)=>(<li key={i}><span className="battle-pokemon">{b.pokemon1}</span> vs <span className="battle-pokemon">{b.pokemon2}</span> → <span className="battle-winner">{b.winner}</span> <span className="battle-time">{b.timestamp}</span> <span className="battle-mode">{b.mode}</span></li>))}</ul>
        </div>
      )}
    </div>
  );
};

export default BattleSimulator;
