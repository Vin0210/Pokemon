/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, X, Link, Share2, Timer, Zap, Crown, Users, Loader } from 'lucide-react';
import { PvpService, PvpEvents } from '../Services/PvpService';

const typeColor = (t) => ({
  fire:'#ff3d00',water:'#3b82f6',grass:'#22c55e',electric:'#eab308',psychic:'#ec4899',ice:'#06b6d4',dragon:'#7c3aed',fairy:'#f472b6',normal:'#a8a29e',poison:'#a855f7',ground:'#ca8a04',flying:'#818cf8',bug:'#84cc16',rock:'#78716c',ghost:'#6b7280',steel:'#64748b',fighting:'#dc2626',dark:'#44403c'
}[t]||'#64748b');

const PvpBattle = ({ team }) => {
  const [you, setYou] = useState(0);
  const [phase, setPhase] = useState('lobby'); // lobby | select | battle | done
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [conn, setConn] = useState(false);
  const [myPick, setMyPick] = useState(null);
  const [oppPickName, setOppPickName] = useState(null);
  const [battle, setBattle] = useState(null); // { player:{pokemon,hp,maxHp,moves}, enemy:{...} }
  const [myLocked, setMyLocked] = useState(false);
  const [oppLocked, setOppLocked] = useState(false);
  const [turnCount, setTurnCount] = useState(1);
  const [winner, setWinner] = useState(null); // winning side index or null
  const [winnerName, setWinnerName] = useState('');
  const [anim, setAnim] = useState(null);
  const [damagePop, setDamagePop] = useState(null);
  const [log, setLog] = useState('');

  const battleRef = useRef(null);
  const busyRef = useRef(false);
  const youRef = useRef(0);
  useEffect(() => { battleRef.current = battle; }, [battle]);
  useEffect(() => { youRef.current = you; }, [you]);

  const typewriter = (text) => { setLog(text); };

  // ---- server handlers ----
  useEffect(() => {
    PvpService.connect();
    const unsubs = [
      PvpService.on(PvpEvents.OPEN, () => setConn(true)),
      PvpService.on(PvpEvents.CLOSE, () => setConn(false)),
      PvpService.on(PvpEvents.CREATED, (p) => {
        setYou(p.you);
        setCode(p.code);
        setPhase('select');
        setError('');
        setMyPick(null); setOppPickName(null);
      }),
      PvpService.on(PvpEvents.JOINED, (p) => {
        setYou(p.you);
        setCode(p.code);
        setPhase('select');
        setError('');
        setMyPick(null); setOppPickName(null);
      }),
      PvpService.on(PvpEvents.OPPONENT_JOINED, () => {
        typewriter('Opponent connected! Pick your Pokémon.');
      }),
      PvpService.on(PvpEvents.OPPONENT_CHOSE, (p) => {
        setOppPickName(p.name);
        typewriter(`Opponent picked ${p.name}. Pick yours!`);
      }),
      PvpService.on(PvpEvents.START, (p) => {
        setYou(p.you);
        setCode(p.code);
        setPhase('battle');
        setBattle({
          player: p.player,
          enemy: p.enemy,
        });
        setTurnCount(p.turnCount || 1);
        setMyLocked(false); setOppLocked(false);
        setWinner(null); setWinnerName('');
        typewriter('Battle started! Choose your move.');
      }),
      PvpService.on(PvpEvents.LOCKED_UPDATE, (p) => {
        setMyLocked(!!p.locked[you]);
        setOppLocked(!!p.locked[1 - you]);
        if (p.locked[you] && !p.locked[1 - you]) typewriter('Move sent — waiting for opponent…');
        if (!p.locked[you] && !p.locked[1 - you]) typewriter('Round resolved. Choose your move.');
      }),
      PvpService.on(PvpEvents.ROUND, (p) => {
        setTurnCount(p.turnCount);
        setOppLocked(false);
        setMyLocked(false);
        applyRound(p, you);
      }),
      PvpService.on(PvpEvents.OPPONENT_LEFT, () => {
        setError('Opponent left the battle.');
        setPhase('lobby');
        setBattle(null);
      }),
      PvpService.on(PvpEvents.ERROR, (p) => setError(p.message || 'Connection error')),
    ];
    return () => unsubs.forEach((u) => u());
  }, [you]);

  const applyRound = useCallback((p, viewerIdx) => {
    // Sequence the events
    let pos = 0;
    const step = () => {
      if (pos >= p.events.length) {
        // apply final HPs
        setBattle((prev) => {
          if (!prev) return prev;
          const next = {
            ...prev,
            player: { ...prev.player, hp: p.playerA.hp, maxHp: p.playerA.maxHp },
            enemy: { ...prev.enemy, hp: p.playerB.hp, maxHp: p.playerB.maxHp },
          };
          return next;
        });
        if (p.winner) {
          setWinner(p.winner);
          // each client wants to know if THEY won
          const winName = p.winner.name;
          setWinnerName(winName);
          setPhase('done');
          setLog(`${winName.toUpperCase()} wins!`);
        }
        return;
      }
      const e = p.events[pos];
      const isMine = e.who === viewerIdx;
      const whoKey = isMine ? 'player' : 'enemy';
      const defKey = isMine ? 'enemy' : 'player';
      setAnim({ who: whoKey, move: { name: e.move, type: e.moveType, cat: e.moveCat }, dmg: e.dmg, eff: e.eff, isCrit: e.isCrit, miss: e.miss });
      typewriter(`${e.attackerName} used ${e.move}!`);
      setTimeout(() => {
        if (e.miss) {
          typewriter('But it missed!');
          setDamagePop({ who: defKey, value: 'MISS', eff: e.eff });
          setAnim(null);
          setTimeout(() => { setDamagePop(null); pos++; step(); }, 500);
        } else if (e.eff === 0) {
          typewriter('It has no effect...');
          setDamagePop({ who: defKey, value: 'NO EFFECT', eff: e.eff });
          setAnim(null);
          setTimeout(() => { setDamagePop(null); pos++; step(); }, 500);
        } else {
          setDamagePop({ who: defKey, value: `-${e.dmg}`, eff: e.eff, isCrit: e.isCrit });
          if (e.isCrit) typewriter('A critical hit!');
          else if (e.eff > 1) typewriter('It\'s super effective!');
          else if (e.eff < 1) typewriter('It\'s not very effective...');
          // update hp live for the defender
          setBattle((prev) => {
            if (!prev) return prev;
            const next = { ...prev };
            next[defKey] = { ...next[defKey], hp: e.hpAfter };
            return next;
          });
          setTimeout(() => {
            if (e.healAmt) { setAnim(null); typewriter(`Restored ${e.healAmt} HP!`); setDamagePop(null); setTimeout(() => { pos++; step(); }, 450); return; }
            if (e.recoilAmt) { setAnim(null); typewriter(`Took ${e.recoilAmt} recoil damage!`); setDamagePop(null); setTimeout(() => { pos++; step(); }, 450); return; }
            setAnim(null); setDamagePop(null);
            pos++; step();
          }, 420);
        }
      }, 500);
    };
    step();
  }, []);

  // Provide battle snapshot when START arrives. We know our chosen pokemon and need opponent's.
  // Opponent's pokemon is revealed via OPONNENT_CHOSE (name only) and full data not sent.
  // Instead: server should send full battle snapshot on START. We'll handle by having
  // server include it; for now reconstruct from selections when possible.

  const pick = (p) => {
    if (!p) return;
    setMyPick(p);
    setOppPickName(oppPickName); // keep
    PvpService.choose(p);
    typewriter(oppPickName ? `You picked ${p.name}. Waiting for opponent...` : `You picked ${p.name}. Waiting for opponent to pick...`);
  };

  const sendMove = (m) => {
    const cur = battleRef.current;
    if (!cur || winner || myLocked || busyRef.current) return;
    if (m.pp <= 0) { typewriter('No PP left for that move!'); return; }
    busyRef.current = true;
    setMyLocked(true);
    PvpService.move(m.name);
    typewriter(`${cur.player.pokemon.name} used ${m.name} — waiting for opponent...`);
    setTimeout(() => { busyRef.current = false; }, 600);
  };

  const createRoom = () => {
    setError('');
    PvpService.connect();
    PvpService.ready(() => PvpService.create());
  };
  const joinRoom = () => {
    setError('');
    if (!joinCode.trim()) { setError('Enter a room code.'); return; }
    PvpService.connect();
    PvpService.ready(() => PvpService.join(joinCode.trim().toUpperCase()));
  };
  const leave = () => {
    PvpService.leave();
    setPhase('lobby'); setBattle(null); setCode(''); setMyPick(null); setOppPickName(null); setWinner(null); setWinnerName(''); setError('');
  };

  const copyCode = () => {
    try { navigator.clipboard.writeText(code); typewriter('Room code copied!'); } catch { typewriter(`Share code: ${code}`); }
  };

  const canPick = !!(team && team.length > 0);

  // ---- Shared battlefield markup ----
  const renderField = () => {
    if (!battle) return null;
    const playerPct = battle.player.maxHp ? (battle.player.hp / battle.player.maxHp) * 100 : 0;
    const enemyPct = battle.enemy.maxHp ? (battle.enemy.hp / battle.enemy.maxHp) * 100 : 0;
    return (
      <div className={`battle-stage realistic-stage ${anim?.who === 'player' ? 'shake-enemy' : ''} ${anim?.who === 'enemy' ? 'shake-player' : ''}`}>
        <div className="battle-field realistic-field">
          {/* Enemy */}
          <div className={`combatant enemy ${anim?.who === 'enemy' ? 'attacking' : ''} ${damagePop?.who === 'enemy' ? 'hit' : ''} ${battle.enemy.hp <= 0 ? 'fainted' : ''}`}>
            <div className="hp-card classic enemy-hp">
              <div className="hp-card-glow" />
              <div className="hp-top">
                <span className="hp-name">{battle.enemy.pokemon.name} <span className="hp-lv">:L50</span></span>
                <span className="hp-num">{battle.enemy.hp}/{battle.enemy.maxHp}</span>
              </div>
              <div className="hp-bar-classic"><div className="hp-bar-track"><div className={`hp-bar-fill ${enemyPct < 25 ? 'low' : enemyPct < 50 ? 'mid' : ''}`} style={{ width: `${enemyPct}%` }} /></div><span className="hp-label">HP</span></div>
              <div className="hp-types">{battle.enemy.pokemon.types?.map(t => <span key={t} className={`mini-type ${t}`}>{t}</span>)}</div>
            </div>
            <div className="sprite-wrap realistic">
              <div className="platform realistic-platform" />
              <motion.img src={battle.enemy.pokemon.image} alt={battle.enemy.pokemon.name} className="battle-sprite enemy-sprite"
                animate={anim?.who === 'enemy' ? { x: -36, scale: 1.07 } : { x: 0, y: [0, -4, 0], scale: 1 }}
                transition={anim?.who ? { type: 'spring', stiffness: 520, damping: 20 } : { duration: 2.4, repeat: Infinity }}
                style={{ filter: battle.enemy.hp <= 0 ? 'grayscale(1) brightness(.8)' : undefined }} />
              {damagePop?.who === 'enemy' && (
                <motion.div key={damagePop.value + Math.random()} initial={{ y: 8, opacity: 0 }} animate={{ y: -46, opacity: 1 }} transition={{ duration: .62 }} className={`dmg-pop ${damagePop.eff > 1 ? 'super' : ''} ${damagePop.eff < 1 && damagePop.eff > 0 ? 'resist' : ''} ${damagePop.isCrit ? 'crit' : ''} ${damagePop.value === 'MISS' ? 'miss' : ''}`}>{damagePop.value}</motion.div>
              )}
              {battle.enemy.hp <= 0 && <div className="faint-overlay">FAINTED</div>}
              {oppLocked && <div className="lock-pill">Opponent locked in…</div>}
            </div>
          </div>

          <div className="battle-divider">
            <span className="vs-mini">VS</span>
          </div>

          {/* Player */}
          <div className={`combatant player ${anim?.who === 'player' ? 'attacking' : ''} ${damagePop?.who === 'player' ? 'hit' : ''} ${battle.player.hp <= 0 ? 'fainted' : ''}`}>
            <div className="sprite-wrap realistic">
              <div className="platform realistic-platform player-plat" />
              <motion.img src={battle.player.pokemon.image} alt={battle.player.pokemon.name} className="battle-sprite player-sprite"
                animate={anim?.who === 'player' ? { x: 36, scale: 1.07 } : { x: 0, y: [0, -4, 0], scale: 1 }}
                transition={anim?.who ? { type: 'spring', stiffness: 520, damping: 20 } : { duration: 2.4, repeat: Infinity }}
                style={{ transform: 'scaleX(-1)', filter: battle.player.hp <= 0 ? 'grayscale(1) brightness(.8)' : undefined }} />
              {damagePop?.who === 'player' && (
                <motion.div key={damagePop.value + Math.random()} initial={{ y: 8, opacity: 0 }} animate={{ y: -46, opacity: 1 }} transition={{ duration: .62 }} className={`dmg-pop ${damagePop.eff > 1 ? 'super' : ''} ${damagePop.isCrit ? 'crit' : ''} ${damagePop.value === 'MISS' ? 'miss' : ''}`}>{damagePop.value}</motion.div>
              )}
              {battle.player.hp <= 0 && <div className="faint-overlay">FAINTED</div>}
              {myLocked && <div className="lock-pill mine">Move sent</div>}
            </div>
            <div className="hp-card classic player-hp">
              <div className="hp-card-glow player-glow" />
              <div className="hp-top">
                <span className="hp-name">{battle.player.pokemon.name} <span className="hp-lv">:L50</span></span>
                <span className="hp-num">{battle.player.hp}/{battle.player.maxHp}</span>
              </div>
              <div className="hp-bar-classic"><div className="hp-bar-track"><div className={`hp-bar-fill ${playerPct < 25 ? 'low' : playerPct < 50 ? 'mid' : ''}`} style={{ width: `${playerPct}%` }} /></div><span className="hp-label">HP</span></div>
              <div className="hp-types">{battle.player.pokemon.types?.map(t => <span key={t} className={`mini-type ${t}`}>{t}</span>)}</div>
            </div>
          </div>
        </div>

        <div className="battle-log realistic-log">
          <div className="dialog-cursor">▶</div>
          <AnimatePresence mode="wait">
            <motion.div key={log} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="log-line realistic-line">{log || 'Waiting...'}</motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  };

  // ---- RENDERING ----
  if (!canPick && phase !== 'lobby') {
    return (
      <div className="battle-simulator">
        <h2><Swords size={16} /> Battle Arena · PvP</h2>
        <div className="empty-team" style={{ marginTop: 14 }}><Swords size={28} style={{ color: '#94a3b8' }} /><p>Add Pokémon to your team to battle friends.</p></div>
      </div>
    );
  }

  return (
    <div className="battle-simulator">
      <h2><Swords size={16} /> Battle Arena <span className="pill" style={{ fontSize: '.72rem', marginLeft: 8, background: '#e0f2fe', color: '#0369a1' }}><Users size={12} /> PvP</span></h2>

      {phase === 'lobby' && (
        <div className="pvp-lobby">
          <p className="team-sub">Battle a friend in real time from two devices.</p>
          <div className="pvp-lobby-card">
            <button className="main-menu-btn fight" style={{ width: '100%', marginBottom: 10 }} onClick={createRoom}>
              <span><Link size={16} /> Create a room</span><small>Get a code to share</small>
            </button>
            <div className="pvp-join-row">
              <input className="pvp-code-input" placeholder="ROOM CODE" value={joinCode} maxLength={6}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && joinRoom()} />
              <button className="btn-refresh" onClick={joinRoom} style={{ height: 40 }}><Link size={13} /> Join</button>
            </div>
            {!conn && !error && <p className="pvp-hint"><Loader size={12} className="spin" /> Connecting to battle server…</p>}
            {error && (
              <div className="pvp-error-wrap">
                <p className="pvp-error">{error}</p>
                <button className="btn-refresh" onClick={() => { setError(''); PvpService.connect(); }}>
                  <Link size={12} /> Reconnect
                </button>
              </div>
            )}
            {conn && <p className="pvp-ok"><span className="ok-dot" /> Connected to battle server</p>}
          </div>
        </div>
      )}

      {phase === 'select' && (
        <div className="pvp-select">
          <div className="pvp-code-banner">
            <span>Room code:</span>
            <strong>{code}</strong>
            <button className="btn-refresh" onClick={copyCode}><Share2 size={13} /> Share</button>
            <button className="btn-refresh" onClick={leave}><X size={13} /> Leave</button>
          </div>
          <p className="team-sub">Pick 1 Pokémon to send into battle.</p>
          <div className="pvp-select-list">
            {team.map((p) => (
              <button key={p.id} className={`pvp-select-card ${myPick && myPick.id === p.id ? 'chosen' : ''}`} onClick={() => pick(p)} disabled={!!myPick}>
                <img src={p.image} alt={p.name} />
                <span>{p.name}</span>
                <small>{p.types.map(t => (<span key={t} className={`mini-type ${t}`}>{t}</span>))}</small>
              </button>
            ))}
          </div>
          <div className="pvp-lock-status">
            {myPick ? `You: ${myPick.name}` : 'You: —'} · {oppPickName ? `Opponent: ${oppPickName}` : 'Opponent: waiting…'}
            {myPick && !oppPickName && <span className="pvp-waiting"><Loader size={12} className="spin" /> Waiting for opponent…</span>}
          </div>
        </div>
      )}

      {(phase === 'battle' || phase === 'done') && (
        <div className="battle-simulator realistic" style={{ padding: 0, overflow: 'hidden', border: '3px solid #0f172a', boxShadow: '0 12px 32px rgba(0,0,0,.18)', marginTop: 4 }}>
          <div className="battle-arena-head">
            <button className="btn-refresh" onClick={leave} style={{ height: 32, padding: '0 10px', fontSize: '.78rem' }}><X size={12} /> Leave</button>
            <span className="pill" style={{ fontSize: '.72rem' }}><Timer size={12} /> Turn {turnCount} {winner ? '· Finished' : myLocked ? '· Waiting on opp' : '· Your move'}</span>
            <span className="pill" style={{ fontSize: '.72rem', background: winner ? '#22c55e' : '#fff' }}>{winner ? `Winner: ${winnerName}` : `#${code}`}</span>
          </div>
          {renderField()}
          {!winner ? (
            <div className="battle-controls realistic-controls">
              <div className="moves-grid realistic-moves">
                {battle && battle.player.moves.map((m) => {
                  const out = m.pp <= 0;
                  const disabled = !!anim || myLocked || out || battle.player.hp <= 0;
                  return (
                    <button key={m.name} className={`move-btn realistic-move type-${m.type} ${out ? 'out' : ''} ${disabled ? 'disabled' : ''}`}
                      onClick={() => sendMove(m)} disabled={disabled}
                      style={{ borderColor: out ? '#e2e8f0' : typeColor(m.type) }}>
                      <div className="move-head">
                        <span className="move-name">{m.name}</span>
                        <span className={`move-cat ${m.cat}`}>{m.cat === 'special' ? 'SP' : 'PH'}</span>
                        {m.priority > 0 && <span className="prio-badge">+{m.priority}</span>}
                      </div>
                      <div className="move-foot">
                        <span className="move-type" style={{ background: out ? '#94a3b8' : typeColor(m.type) }}>{m.type}</span>
                        <span className="move-pow"><Zap size={10} /> {m.power}</span>
                        <span className="move-pp" style={{ color: m.pp <= 5 ? '#ef4444' : '#64748b' }}>PP {m.pp}/{m.maxPp}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="pvp-status-bar">
                {myLocked ? <span className="pvp-waiting"><Loader size={12} className="spin" /> Waiting for opponent…</span> : <span>Pick a move — both players act simultaneously each turn.</span>}
              </div>
            </div>
          ) : (
            <div className="pvp-done">
              <Crown size={40} style={{ color: '#facc15' }} />
              <h3>{winnerName.toUpperCase()} wins!</h3>
              <button className="btn-refresh" onClick={leave}><X size={13} /> Back to lobby</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PvpBattle;
