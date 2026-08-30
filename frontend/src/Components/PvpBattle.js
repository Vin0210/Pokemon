/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, X, Link, Share2, Timer, Zap, Crown, Users, Loader, ArrowLeftRight } from 'lucide-react';
import { PvpService, PvpEvents } from '../Services/PvpService';

const typeColor = (t) => ({
  fire:'#ff3d00',water:'#3b82f6',grass:'#22c55e',electric:'#eab308',psychic:'#ec4899',ice:'#06b6d4',dragon:'#7c3aed',fairy:'#f472b6',normal:'#a8a29e',poison:'#a855f7',ground:'#ca8a04',flying:'#818cf8',bug:'#84cc16',rock:'#78716c',ghost:'#6b7280',steel:'#64748b',fighting:'#dc2626',dark:'#44403c'
}[t]||'#64748b');

const MIN_TEAM = 3;
const MAX_TEAM = 6;

const PvpBattle = ({ team }) => {
  const [you, setYou] = useState(0);
  const [phase, setPhase] = useState('lobby'); // lobby | select | battle | done
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [conn, setConn] = useState(false);
  const [mySelections, setMySelections] = useState([]);
  const [teamConfirmed, setTeamConfirmed] = useState(false);
  const [oppTeam, setOppTeam] = useState(null); // opponent's confirmed team (names)
  const [battle, setBattle] = useState(null); // { player, enemy, playerTeam, enemyTeam, activePlayerIdx, activeEnemyIdx }
  const [myLocked, setMyLocked] = useState(false);
  const [oppLocked, setOppLocked] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [turnCount, setTurnCount] = useState(1);
  const [winner, setWinner] = useState(null);
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
        setMySelections([]); setTeamConfirmed(false); setOppTeam(null);
      }),
      PvpService.on(PvpEvents.JOINED, (p) => {
        setYou(p.you);
        setCode(p.code);
        setPhase('select');
        setError('');
        setMySelections([]); setTeamConfirmed(false); setOppTeam(null);
      }),
      PvpService.on(PvpEvents.OPPONENT_JOINED, () => {
        typewriter('Opponent connected! Pick 3-6 Pokémon.');
      }),
      PvpService.on(PvpEvents.OPPONENT_CHOSE, (p) => {
        setOppTeam(p.team || []);
        typewriter(p.team && p.team.length ? `Opponent confirmed ${p.team.length} Pokémon.` : 'Opponent picked a team.');
      }),
      PvpService.on(PvpEvents.START, (p) => {
        setYou(p.you);
        setCode(p.code);
        const own = p.player;
        const ene = p.enemy;
        setPhase('battle');
        setBattle({
          player: own.team[own.active],
          enemy: ene.team[ene.active],
          playerTeam: own.team,
          enemyTeam: ene.team,
          activePlayerIdx: own.active,
          activeEnemyIdx: ene.active,
        });
        setTurnCount(p.turnCount || 1);
        setMyLocked(false); setOppLocked(false); setSwitchOpen(false);
        setWinner(null); setWinnerName('');
        typewriter(`Battle started! ${own.team[own.active].pokemon.name} vs ${ene.team[ene.active].pokemon.name}!`);
      }),
      PvpService.on(PvpEvents.LOCKED_UPDATE, (p) => {
        setMyLocked(!!p.locked[you]);
        setOppLocked(!!p.locked[1 - you]);
        if (p.locked[you] && !p.locked[1 - you]) typewriter('Action sent — waiting for opponent…');
        if (!p.locked[you] && !p.locked[1 - you]) typewriter('Round resolved. Choose your action.');
      }),
      PvpService.on(PvpEvents.ROUND, (p) => {
        setTurnCount(p.turnCount);
        setOppLocked(false);
        setMyLocked(false);
        setSwitchOpen(false);
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

  const mapSide = useCallback((p, viewerIdx) => {
    // round payload uses playerA/playerB keyed by absolute index 0/1
    const isA = viewerIdx === 0;
    const ownView = isA ? p.playerA : p.playerB;
    const eneView = isA ? p.playerB : p.playerA;
    if (!ownView || !eneView) return null;
    return {
      player: ownView.team[ownView.active],
      enemy: eneView.team[eneView.active],
      playerTeam: ownView.team,
      enemyTeam: eneView.team,
      activePlayerIdx: ownView.active,
      activeEnemyIdx: eneView.active,
    };
  }, []);

  const applyRound = useCallback((p, viewerIdx) => {
    const mapped = mapSide(p, viewerIdx);
    if (!mapped) return;
    let pos = 0;
    const step = () => {
      if (pos >= p.events.length) {
        setBattle(mapped);
        if (p.winner) {
          setWinner(p.winner);
          setWinnerName(p.winner.name);
          setPhase('done');
          setLog(`${p.winner.name.toUpperCase()} wins!`);
        }
        return;
      }
      const e = p.events[pos];
      const isMine = e.who === viewerIdx;
      const whoKey = isMine ? 'player' : 'enemy';
      const defKey = isMine ? 'enemy' : 'player';
      if (e.kind === 'switch') {
        typewriter(`${e.name} came in!`);
        setAnim({ who: e.who, move: { name: 'switch' }, dmg: 0 });
        setTimeout(() => { setAnim(null); pos++; step(); }, 500);
        return;
      }
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
          // reflect defender HP live
          setBattle((prev) => {
            if (!prev) return prev;
            const next = { ...prev };
            const dKey = defKey === 'player' ? 'playerTeam' : 'enemyTeam';
            const activeKey = defKey === 'player' ? 'activePlayerIdx' : 'activeEnemyIdx';
            if (typeof e.defenderIdx === 'number' && next[dKey]) {
              const t = next[dKey].map((m, i) => i === e.defenderIdx ? { ...m, hp: e.hpAfter, fainted: e.hpAfter <= 0 } : m);
              next[dKey] = t;
              next[defKey] = t[next[activeKey]];
            } else {
              next[defKey] = { ...next[defKey], hp: e.hpAfter };
            }
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
  }, [mapSide]);

  const togglePick = (p) => {
    if (teamConfirmed) return;
    setMySelections((cur) => {
      const has = cur.some((x) => x.id === p.id);
      if (has) return cur.filter((x) => x.id !== p.id);
      if (cur.length >= MAX_TEAM) { typewriter(`Team max is ${MAX_TEAM}.`); return cur; }
      return [...cur, p];
    });
  };

  const confirmTeam = () => {
    if (mySelections.length < MIN_TEAM) { typewriter(`Pick at least ${MIN_TEAM} Pokémon.`); return; }
    setTeamConfirmed(true);
    typewriter(`Team locked (${mySelections.length}). Waiting for opponent...`);
    PvpService.choose(mySelections);
  };

  const sendMove = (m) => {
    const cur = battleRef.current;
    if (!cur || winner || myLocked || busyRef.current || switchOpen) return;
    if (m.pp <= 0) { typewriter('No PP left for that move!'); return; }
    if (cur.playerTeam[cur.activePlayerIdx].fainted) return;
    busyRef.current = true;
    setMyLocked(true);
    PvpService.move(m.name);
    typewriter(`${cur.player.pokemon.name} used ${m.name} — waiting for opponent...`);
    setTimeout(() => { busyRef.current = false; }, 600);
  };

  const sendSwitch = (idx) => {
    const cur = battleRef.current;
    if (!cur || winner || myLocked || busyRef.current) return;
    if (idx === cur.activePlayerIdx) return;
    busyRef.current = true;
    setMyLocked(true);
    setSwitchOpen(false);
    PvpService.switch(idx);
    typewriter(`Sending ${cur.playerTeam[idx].pokemon.name} in — waiting for opponent...`);
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
    setPhase('lobby'); setBattle(null); setCode(''); setMySelections([]); setTeamConfirmed(false); setOppTeam(null); setWinner(null); setWinnerName(''); setError(''); setSwitchOpen(false);
  };

  const copyCode = () => {
    try { navigator.clipboard.writeText(code); typewriter('Room code copied!'); } catch { typewriter(`Share code: ${code}`); }
  };

  const canPick = !!(team && team.length >= MIN_TEAM);

  // ---- Shared battlefield markup ----
  const hpBar = (m) => (m.maxHp ? (m.hp / m.maxHp) * 100 : 0);

  const renderField = () => {
    if (!battle) return null;
    const playerPct = hpBar(battle.player);
    const enemyPct = hpBar(battle.enemy);
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
            <div className="team-strip enemy-strip">
              {battle.enemyTeam.map((m, i) => (
                <div key={i} className={`team-strip-pip ${m.fainted ? 'fainted' : ''} ${i === battle.activeEnemyIdx ? 'active' : ''}`} title={m.pokemon.name}>
                  <img src={m.pokemon.image} alt={m.pokemon.name} />
                  <span className="pip-hp">{m.hp>0?m.hp:0}/{m.maxHp}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="battle-divider">
            <span className="vs-mini">VS</span>
          </div>

          {/* Player */}
          <div className={`combatant player ${anim?.who === 'player' ? 'attacking' : ''} ${damagePop?.who === 'player' ? 'hit' : ''} ${battle.player.hp <= 0 ? 'fainted' : ''}`}>
            <div className="team-strip player-strip">
              {battle.playerTeam.map((m, i) => (
                <div key={i} className={`team-strip-pip ${m.fainted ? 'fainted' : ''} ${i === battle.activePlayerIdx ? 'active' : ''}`} title={m.pokemon.name}>
                  <img src={m.pokemon.image} alt={m.pokemon.name} />
                  <span className="pip-hp">{m.hp>0?m.hp:0}/{m.maxHp}</span>
                </div>
              ))}
            </div>
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
        <div className="empty-team" style={{ marginTop: 14 }}><Swords size={28} style={{ color: '#94a3b8' }} /><p>Add at least {MIN_TEAM} Pokémon to your team to battle friends.</p></div>
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
          <p className="team-sub">Pick {MIN_TEAM}-{MAX_TEAM} Pokémon to send into battle. Tap to add/remove.</p>
          <div className="pvp-select-list">
            {team.map((p) => {
              const selected = mySelections.some((x) => x.id === p.id);
              return (
                <button key={p.id} className={`pvp-select-card ${selected ? 'chosen' : ''}`} onClick={() => togglePick(p)} disabled={teamConfirmed}>
                  <img src={p.image} alt={p.name} />
                  <span>{p.name}</span>
                  <small>{p.types.map(t => (<span key={t} className={`mini-type ${t}`}>{t}</span>))}</small>
                  {selected && <b className="pick-index">{mySelections.findIndex((x) => x.id === p.id) + 1}</b>}
                </button>
              );
            })}
          </div>
          <div className="pvp-lock-status">
            <span>Team: {mySelections.length}/{MAX_TEAM} selected</span>
            {oppTeam ? <span> · Opponent: {oppTeam.length} Pokémon</span> : <span> · Opponent: confirming…</span>}
          </div>
          {!teamConfirmed ? (
            <button className="btn-refresh confirm-btn" onClick={confirmTeam} disabled={mySelections.length < MIN_TEAM}
              style={{ marginTop: 12, padding: '10px 18px', width: '100%', fontSize: '.9rem' }}>
              <Link size={14} /> Confirm Team ({mySelections.length}/{MAX_TEAM})
            </button>
          ) : (
            <div className="pvp-lock-status" style={{ marginTop: 12 }}>
              {!oppTeam && <span className="pvp-waiting"><Loader size={12} className="spin" /> Waiting for opponent to confirm team…</span>}
              {oppTeam && <span className="pvp-waiting"><Loader size={12} className="spin" /> Battle starting…</span>}
            </div>
          )}
        </div>
      )}

      {(phase === 'battle' || phase === 'done') && (
        <div className="battle-simulator realistic" style={{ padding: 0, overflow: 'hidden', border: '3px solid #0f172a', boxShadow: '0 12px 32px rgba(0,0,0,.18)', marginTop: 4 }}>
          <div className="battle-arena-head">
            <button className="btn-refresh" onClick={leave} style={{ height: 32, padding: '0 10px', fontSize: '.78rem' }}><X size={12} /> Leave</button>
            <span className="pill" style={{ fontSize: '.72rem' }}><Timer size={12} /> Turn {turnCount} {winner ? '· Finished' : myLocked ? '· Waiting on opp' : '· Your action'}</span>
            <span className="pill" style={{ fontSize: '.72rem', background: winner ? '#22c55e' : '#fff' }}>{winner ? `Winner: ${winnerName}` : `#${code}`}</span>
          </div>
          {renderField()}
          {!winner ? (
            <div className="battle-controls realistic-controls">
              {switchOpen ? (
                <div className="pvp-switch-panel">
                  <p className="pvp-status-bar" style={{ padding: '4px 0' }}>Choose a Pokémon to switch in (costs your turn):</p>
                  <div className="pvp-switch-list">
                    {battle && battle.playerTeam.map((m, i) => {
                      const isActive = i === battle.activePlayerIdx;
                      const out = m.fainted;
                      const disabled = isActive || out || myLocked || !!anim;
                      return (
                        <button key={i} className={`pvp-switch-card ${isActive ? 'active' : ''} ${out ? 'out' : ''}`} onClick={() => sendSwitch(i)} disabled={disabled}>
                          <img src={m.pokemon.image} alt={m.pokemon.name} />
                          <span>{m.pokemon.name}</span>
                          <small>{m.hp>0?m.hp:0}/{m.maxHp} {isActive ? '· Active' : ''} {out ? '· Fainted' : ''}</small>
                        </button>
                      );
                    })}
                  </div>
                  <button className="btn-refresh" onClick={() => setSwitchOpen(false)} style={{ marginTop: 8 }}><X size={12} /> Cancel</button>
                </div>
              ) : (
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
                  <button className="move-btn realistic-move switch-ctl" onClick={() => setSwitchOpen(true)} disabled={myLocked || !!anim}>
                    <div className="move-head"><span className="move-name"><ArrowLeftRight size={14} /> Switch</span></div>
                    <div className="move-foot"><span className="move-type" style={{ background: '#475569' }}>TEAM</span></div>
                  </button>
                </div>
              )}
              <div className="pvp-status-bar">
                {myLocked ? <span className="pvp-waiting"><Loader size={12} className="spin" /> Waiting for opponent…</span> : <span>Attack or switch each turn — both act simultaneously.</span>}
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
