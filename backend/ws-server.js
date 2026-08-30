// PvP WebSocket server — authoritative battle relay for cross-device play.
// Rooms hold 2 players. The server owns battle state and broadcasts resolution events.

const { WebSocketServer } = require('ws');
const http = require('http');
const { calcDamage, rng, getStat, getMovesForTypes, Struggle } = require('./engine');

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

const startBattle = (room) => {
  const mk = (pokemon) => {
    const maxHp = getStat(pokemon, 'hp');
    return { pokemon, hp: maxHp, maxHp, moves: getMovesForTypes(pokemon.types), locked: false, ready: null };
  };
  room.state = {
    players: [mk(room.players[0].pokemon), mk(room.players[1].pokemon)],
    turnCount: 1,
    winner: null,
  };
  const side = (s) => ({ pokemon: s.pokemon, hp: s.hp, maxHp: s.maxHp, moves: s.moves });
  for (let v = 0; v < 2; v++) {
    send(room.players[v].ws, {
      type: 'start',
      payload: {
        code: room.code,
        you: v,
        player: side(room.state.players[v]),
        enemy: side(room.state.players[1 - v]),
        turnCount: 1,
      },
    });
  }
};

const resolveRound = (room) => {
  const state = room.state;
  const a = state.players[0];
  const b = state.players[1];
  const moves = [a.ready, b.ready];

  // Build move lookup honoring PP; fallback to Struggle on no PP.
  const resolveMove = (side, name) => {
    const found = side.moves.find(m => m.name === name);
    return found && found.pp > 0 ? found : Struggle;
  };
  const mv = [
    resolveMove(a, moves[0]),
    resolveMove(b, moves[1]),
  ];

  // consume PP
  for (let i = 0; i < 2; i++) {
    const s = state.players[i];
    const fi = s.moves.findIndex(m => m.name === moves[i]);
    if (fi >= 0) s.moves[fi] = { ...s.moves[fi], pp: Math.max(0, s.moves[fi].pp - 1) };
  }

  // speed / priority order
  const pPri = [mv[0].priority || 0, mv[1].priority || 0];
  let order;
  if (pPri[0] !== pPri[1]) order = pPri[0] > pPri[1] ? [0, 1] : [1, 0];
  else {
    const s0 = getStat(a.pokemon, 'speed');
    const s1 = getStat(b.pokemon, 'speed');
    if (s0 !== s1) order = s0 > s1 ? [0, 1] : [1, 0];
    else order = Math.random() < 0.5 ? [0, 1] : [1, 0];
  }

  const events = [];
  let winner = null;

  for (const idx of order) {
    const atkIdx = idx;
    const defIdx = 1 - idx;
    const atk = state.players[atkIdx];
    const def = state.players[defIdx];
    if (atk.hp <= 0 || def.hp <= 0) break;

    const move = mv[atkIdx];
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

    events.push({
      who: atkIdx,
      attackerName: atk.pokemon.name,
      defenderName: def.pokemon.name,
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
    });

    if (healAmt) atk.hp = Math.min(atk.maxHp, atk.hp + healAmt);
    if (recoilAmt) {
      atk.hp = Math.max(0, atk.hp - recoilAmt);
      if (atk.hp === 0) {
        winner = state.players[defIdx].pokemon;
        break;
      }
    }

    if (def.hp === 0) {
      winner = state.players[atkIdx].pokemon;
      break;
    }
  }

  // reset locked for next round
  a.locked = false; a.ready = null;
  b.locked = false; b.ready = null;
  state.turnCount += 1;
  state.winner = winner;

  broadcast(room, {
    type: 'round',
    payload: {
      events,
      winner,
      playerA: { hp: a.hp, maxHp: a.maxHp },
      playerB: { hp: b.hp, maxHp: b.maxHp },
      turnCount: state.turnCount,
    },
  });

  // if finished, mark room done so clients can offer "rematch/leave"
  if (winner) room.state.winner = winner;
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
        const player = room.players.find(x => x.ws === ws);
        if (!player || player.pokemon) break;
        player.pokemon = p.pokemon;
        sendToPlayer(room, player.idx === 0 ? 1 : 0, { type: 'opponent_chose', payload: { name: p.pokemon.name } });
        if (room.players[1] && room.players[0].pokemon && room.players[1].pokemon) {
          startBattle(room);
        }
        break;
      }

      case 'move': {
        const room = findRoomByWs(ws);
        if (!room || !room.state || room.state.winner || !p.move) break;
        const player = room.players.find(x => x.ws === ws);
        if (!player || player.locked) break;
        const statePlayer = room.state.players[player.idx];
        if (!statePlayer || statePlayer.hp <= 0) break;
        statePlayer.ready = p.move;
        statePlayer.locked = true;
        broadcast(room, {
          type: 'locked_update',
          payload: { locked: room.state.players.map(p => !!p.locked) },
        });
        if (room.state.players[0].locked && room.state.players[1].locked) {
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
