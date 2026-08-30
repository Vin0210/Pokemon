// Thin WebSocket client wrapper for PvP battles. Emits events to subscribers.

const DEFAULT_URL =
  process.env.REACT_APP_WS_URL ||
  (window.location.protocol === 'https:'
    ? 'wss://pokemon-pvp-server.up.railway.app'
    : `ws://${window.location.hostname || 'localhost'}:3002`);

const listeners = new Map(); // type -> Set<fn>

export const PvpEvents = {
  CREATED: 'created',
  JOINED: 'joined',
  OPPONENT_JOINED: 'opponent_joined',
  OPPONENT_CHOSE: 'opponent_chose',
  START: 'start',
  LOCKED_UPDATE: 'locked_update',
  ROUND: 'round',
  OPPONENT_LEFT: 'opponent_left',
  ERROR: 'error',
  OPEN: 'open',
  CLOSE: 'close',
};

let ws = null;
let connState = 'idle'; // idle | connecting | open | closed
const pending = [];
const waiters = [];

const emit = (type, payload) => {
  (listeners.get(type) || []).forEach((fn) => {
    try { fn(payload); } catch (e) { console.error(e); }
  });
};

const handleMessage = (raw) => {
  let m;
  try { m = JSON.parse(raw); } catch { return; }
  emit(m.type, m.payload);
};

const connect = () => {
  if (connState === 'connecting' || connState === 'open') return;
  connState = 'connecting';
  try {
    ws = new WebSocket(DEFAULT_URL);
  } catch (e) {
    connState = 'closed';
    emit(PvpEvents.ERROR, { message: 'Cannot connect to battle server.' });
    return;
  }
  ws.onopen = () => {
    connState = 'open';
    emit(PvpEvents.OPEN, {});
    while (pending.length) ws.send(JSON.stringify(pending.shift()));
    waiters.forEach((w) => w());
    waiters.length = 0;
  };
  ws.onmessage = (e) => handleMessage(e.data);
  ws.onclose = () => {
    connState = 'closed';
    emit(PvpEvents.CLOSE, {});
  };
  ws.onerror = () => {
    connState = 'closed';
  };
};

const send = (type, payload) => {
  const msg = { type, ...(payload ? { payload } : {}) };
  if (ws && connState === 'open') ws.send(JSON.stringify(msg));
  else pending.push(msg);
};

export const PvpService = {
  connected: () => connState === 'open',
  connect,
  disconnect: () => { if (ws) { try { ws.close(); } catch {} } ws = null; connState = 'closed'; },
  create: () => send('create'),
  join: (code) => send('join', { code }),
  choose: (pokemon) => send('choose', { pokemon }),
  move: (moveName) => send('move', { move: moveName }),
  leave: () => send('leave'),
  on: (type, fn) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => listeners.get(type).delete(fn);
  },
  ready: (fn) => {
    if (connState === 'open') fn();
    else waiters.push(fn);
  },
};
