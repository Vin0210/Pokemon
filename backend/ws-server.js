// PvP WebSocket server — authoritative battle relay for cross-device play.
// Rooms hold 2 players. The server owns battle state and broadcasts resolution events.

const { WebSocketServer } = require('ws');
const http = require('http');
const { calcDamage, rng, getStat, Struggle, makeTeamSide } = require('./engine');

const PORT = process.env.PORT || 3002;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('PvP battle server running\n');
});

const wss = new WebSocketServer({ server });

const rooms = new Map(); // code -> { players: [p1, p2], state, host }

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
};

const send = (ws, obj) => {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
};

const broadcast = (room, obj, except) => {
  for (const p of room.players) if (p && p !== except) send(p.ws, obj);
};

const sendToPlayer = (room, playerIndex, obj) => {
  const p = room.players[playerIndex];
  if (p) send(p.ws, obj);
};

// ---- Team battle helpers ----

// Build the client-visible description of one side.
// `self`: if true include every member; if false, hide unrevealed HP? Keep simple: full view both ways.
const sideView = (side) => ({
  team: side.team.map((m) => ({ pokemon: m.pokemon, hp: m.hp, maxHp: m.maxHp, moves: m.moves, fainted: m.fainted })),
  active: side.active,
});

const startBattle = (room) => {
  const mkTeam = (pokemonList) => makeTeamSide(pokemonList);
  room.state = {
    sides: [mkTeam(room.players[0].pokemon), mkTeam(room.players[1].pokemon)],
    turnCount: 1,
    winner: null,
  };
  for (let v = 0; v < 2; v++) {
    send(room.players[v].ws, {
      type: 'start',
      payload: {
        code: room.code,
        you: v,
        player: sideView(room.state.sides[v]),
        enemy: sideView(room.state.sides[1 - v]),
        turnCount: 1,
      },
    });
  }
};

const activeOf = (side) => side.team[side.active];
const teamAliveCount = (side) => side.team.filter((m) => !m.fainted).length;
const teamWiped = (side) => teamAliveCount(side) === 0;

// Auto-advance to the next alive member if the current one fainted. Returns member or null.
const advanceActive = (side) => {
  if (activeOf(side) && !activeOf(side).fainted) return activeOf(side);
  const next = side.team.findIndex((m, i) => !m.fainted && i !== side.active);
  if (next === -1) {
    if (!activeOf(side).fainted) return activeOf(side);
    const anyAlive = side.team.findIndex((m) => !m.fainted);
    if (anyAlive === -1) return null;
    side.active = anyAlive;
  } else {
    side.active = next;
  }
  return activeOf(side);
};

const resolveMove = (member, name) => {
  const found = member.moves.find(m => m.name === name);
  return found && found.pp > 0 ? found : Struggle;
};

// Handle a single attack event; returns false if the round should stop (winner decided).
const doAttack = (state, atkIdx, defIdx, move) => {
  const atkSide = state.sides[atkIdx];
  const defSide = state.sides[defIdx];
  const atk = atkSide.team[atkSide.active];
  const def = defSide.team[defSide.active];

  // consume PP on the active attacker's real move set
  const fi = atk.moves.findIndex(m => m.name === move.name);
  if (!move.isStruggle && fi >= 0) atk.moves[fi] = { ...atk.moves[fi], pp: Math.max(0, atk.moves[fi].pp - 1) };

  const rolls = rng();
  if (move.acc < 100 && rolls.accPass > move.acc) rolls.miss = true;

  const { dmg, eff, isCrit, miss } = calcDamage(atk.pokemon, def.pokemon, move, rolls);

  let hpAfter = def.hp;
  let healAmt = 0;
  let recoilAmt = 0;
  if (!miss && eff !== 0) {
    hpAfter = Math.max(0, def.hp - dmg);
    if (move.heal && hpAfter > 0) healAmt = Math.floor(dmg * move.heal);
    if (move.recoil && hpAfter > 0) recoilAmt = Math.floor(dmg * move.recoil);
  }
  def.hp = hpAfter;
  def.fainted = def.hp <= 0;

  const ev = {
    who: atkIdx,
    attackerName: atk.pokemon.name,
    defenderName: def.pokemon.name,
    attackerIdx: atkSide.active,
    defenderIdx: defSide.active,
    move: move.name,
    moveType: move.type,
    moveCat: move.cat,
    dmg: miss || eff === 0 ? 0 : dmg,
    eff,
    isCrit,
    miss,
    healAmt,
    recoilAmt,
    hpAfter,
  };

  if (healAmt) atk.hp = Math.min(atk.maxHp, atk.hp + healAmt);
  if (recoilAmt) {
    atk.hp = Math.max(0, atk.hp - recoilAmt);
    atk.fainted = atk.hp <= 0;
    if (atk.fainted) {
      ev.coRecoil = true;
      advanceActive(atkSide);
      if (teamWiped(atkSide)) { ev.winner = defSide; return ev; }
    }
  }

  if (def.fainted) {
    advanceActive(defSide);
    if (teamWiped(defSide)) { ev.winner = defSide; return ev; }
    ev.defenderFainted = true;
    ev.defenderNext = defSide.active;
  }

  return ev;
};

const resolveRound = (room) => {
  const state = room.state;
  const s0 = state.sides[0];
  const s1 = state.sides[1];
  const r0 = s0.ready; // { kind:'move', name } | { kind:'switch', index }
  const r1 = s1.ready;
  const readyFor = [r0, r1];

  const events = [];
  let winner = null;

  // If a player is switching, apply the switch first (their mon leaves the field).
  // The mover (if any) still hits whoever is out at the start.
  for (let i = 0; i < 2; i++) {
    const r = readyFor[i];
    const side = state.sides[i];
    if (r && r.kind === 'switch') {
      const target = r.index;
      if (target !== side.active && target >= 0 && target < side.team.length && !side.team[target].fainted) {
        side.active = target;
        events.push({ kind: 'switch', who: i, index: target, name: side.team[target].pokemon.name });
      }
    }
  }

  // Now handle any moves in priority/speed order against the current fielded members.
  for (let i = 0; i < 2; i++) if (readyFor[i] && readyFor[i].kind === 'move') readyFor[i]._mv = resolveMove(state.sides[i].team[state.sides[i].active], readyFor[i].name);

  const isMove = [!!(r0 && r0.kind === 'move'), !!(r1 && r1.kind === 'move')];
  let order = isMove[0] === isMove[1] ? (isMove[0] ? [0, 1] : []) : (isMove[0] ? [0] : [1]);
  if (order.length === 2) {
    const pPri = [r0._mv.priority || 0, r1._mv.priority || 0];
    if (pPri[0] !== pPri[1]) order = pPri[0] > pPri[1] ? [0, 1] : [1, 0];
    else {
      const sp0 = getStat(state.sides[0].team[state.sides[0].active].pokemon, 'speed');
      const sp1 = getStat(state.sides[1].team[state.sides[1].active].pokemon, 'speed');
      if (sp0 !== sp1) order = sp0 > sp1 ? [0, 1] : [1, 0];
      else order = Math.random() < 0.5 ? [0, 1] : [1, 0];
    }
  } else if (isMove[0] && !isMove[1]) order = [0];
  else if (isMove[1] && !isMove[0]) order = [1];

  for (const atkIdx of order) {
    const defIdx = 1 - atkIdx;
    if (teamWiped(state.sides[atkIdx]) || teamWiped(state.sides[defIdx])) break;
    const ev = doAttack(state, atkIdx, defIdx, readyFor[atkIdx]._mv);
    events.push(ev);
    if (ev.winner) { winner = ev.winner; break; }
  }

  // advance active for any side whose active fainted but no auto-advance ran
  for (let i = 0; i < 2; i++) advanceActive(state.sides[i]);

  // reset locks
  state.sides.forEach((s) => { s.locked = false; s.ready = null; });
  state.turnCount += 1;
  state.winner = winner ? state.sides.indexOf(winner) : null;

  // Build summary of both teams for clients to sync
  broadcast(room, {
    type: 'round',
    payload: {
      events,
      winner: winner ? { name: state.sides[state.winner].team[state.sides[state.winner].active].pokemon.name } : null,
      winnerIdx: state.winner,
      playerA: sideView(state.sides[0]),
      playerB: sideView(state.sides[1]),
      turnCount: state.turnCount,
    },
  });
};

wss.on('connection', (ws) => {
  ws.isAlive = true;

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const p = msg.payload || {};

    try {
    switch (msg.type) {
      case 'create': {
        const code = genCode();
        const room = { code, players: [{ ws, pokemon: null, idx: 0 }], state: null, host: 0 };
        rooms.set(code, room);
        send(ws, { type: 'created', payload: { code, you: 0 } });
        break;
      }

      case 'join': {
        const room = rooms.get(p.code);
        if (!room) { send(ws, { type: 'error', payload: { message: 'Room not found' } }); break; }
        if (room.players.length >= 2) { send(ws, { type: 'error', payload: { message: 'Room is full' } }); break; }
        if (room.state) { send(ws, { type: 'error', payload: { message: 'Battle already started' } }); break; }
        room.players.push({ ws, pokemon: null, idx: 1 });
        send(ws, { type: 'joined', payload: { code: room.code, you: 1 } });
        sendToPlayer(room, 0, { type: 'opponent_joined', payload: { code: room.code } });
        break;
      }

      case 'choose': {
        const room = findRoomByWs(ws);
        if (!room || !p.pokemon) break;
        const list = Array.isArray(p.pokemon) ? p.pokemon : [p.pokemon];
        const player = room.players.find(x => x.ws === ws);
        if (!player || player.pokemon) break;
        player.pokemon = list;
        sendToPlayer(room, player.idx === 0 ? 1 : 0, {
          type: 'opponent_chose',
          payload: { team: list.map((x) => ({ name: x.name, types: x.types, image: x.image, hp: x.stats?.find(s => s.name === 'hp')?.base })) },
        });
        if (room.players[1] && room.players[0].pokemon && room.players[1].pokemon) {
          startBattle(room);
        }
        break;
      }

      case 'move': {
        const room = findRoomByWs(ws);
        if (!room || !room.state || room.state.winner !== null || !p.move) break;
        const player = room.players.find(x => x.ws === ws);
        if (!player || player.locked) break;
        const side = room.state.sides[player.idx];
        if (!side || teamWiped(side) || activeOf(side).fainted || activeOf(side).hp <= 0) break;
        if (!side.team[side.active].moves.some(m => m.name === p.move) && p.move !== 'Struggle') break;
        side.ready = { kind: 'move', name: p.move };
        side.locked = true;
        broadcast(room, {
          type: 'locked_update',
          payload: { locked: room.state.sides.map(s => !!s.locked), actions: room.state.sides.map(s => s.ready ? s.ready.kind : null) },
        });
        if (room.state.sides[0].locked && room.state.sides[1].locked) {
          resolveRound(room);
        }
        break;
      }

      case 'switch': {
        const room = findRoomByWs(ws);
        if (!room || !room.state || room.state.winner !== null) break;
        const player = room.players.find(x => x.ws === ws);
        if (!player || player.locked) break;
        const side = room.state.sides[player.idx];
        const idx = Number(p.index);
        if (!side || teamWiped(side) || idx === side.active || idx < 0 || idx >= side.team.length || side.team[idx].fainted) break;
        side.ready = { kind: 'switch', index: idx };
        side.locked = true;
        broadcast(room, {
          type: 'locked_update',
          payload: { locked: room.state.sides.map(s => !!s.locked), actions: room.state.sides.map(s => s.ready ? s.ready.kind : null) },
        });
        if (room.state.sides[0].locked && room.state.sides[1].locked) {
          resolveRound(room);
        }
        break;
      }

      case 'leave': {
        handleLeave(ws);
        break;
      }

      case 'ping':
        send(ws, { type: 'pong' });
        break;
    }
    } catch (e) {
      console.error('ws message handler error:', e.message);
    }
  });

  ws.on('close', () => handleLeave(ws));
});

const findRoomByWs = (ws) => {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.ws === ws)) return room;
  }
  return null;
};

const handleLeave = (ws) => {
  const room = findRoomByWs(ws);
  if (!room) return;
  const idx = room.players.findIndex(p => p.ws === ws);
  if (idx >= 0) room.players.splice(idx, 1);
  if (room.players.length === 0) { rooms.delete(room.code); return; }
  const other = room.players[0];
  send(other.ws, { type: 'opponent_left', payload: { code: room.code } });
  rooms.delete(room.code);
};

// heartbeat to drop dead clients
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) { ws.terminate(); return; }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(interval));

server.listen(PORT, () => {
  console.log(`PvP WebSocket server listening on ws://localhost:${PORT}`);
});
