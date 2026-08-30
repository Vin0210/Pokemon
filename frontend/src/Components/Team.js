import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Trash2, Zap, Heart, Shield, Sparkles, X, Compass } from 'lucide-react';
import { removeFromTeam } from '../Services/teamService';

const typeHex = { fire:'#ff3d00', water:'#3b82f6', grass:'#22c55e', electric:'#eab308', psychic:'#ec4899', ice:'#06b6d4', dragon:'#7c3aed', fairy:'#f472b6', normal:'#a8a29e', poison:'#a855f7', ground:'#ca8a04', flying:'#818cf8', bug:'#84cc16', rock:'#78716c', ghost:'#6b7280', steel:'#64748b', fighting:'#dc2626', dark:'#44403c' };
const ALL_TYPES = ['fire', 'water', 'grass', 'electric', 'normal', 'bug', 'dark', 'dragon', 'fairy', 'fighting', 'flying', 'ghost', 'ground', 'ice', 'poison', 'psychic', 'rock', 'steel'];

const Team = ({ team, setTeam, onNavigate }) => {
  const [releasingId, setReleasingId] = useState(null);
  const totalPower = useMemo(() => team.reduce((acc, p) => acc + (p.stats?.reduce((a, s) => a + s.base, 0) || 0), 0), [team]);
  const avgPower = team.length ? Math.round(totalPower / team.length) : 0;
  const coverage = useMemo(() => {
    const covered = new Set();
    team.forEach(p => (p.types || []).forEach(t => covered.add(t)));
    return covered;
  }, [team]);

  const handleRemove = async (pokemon) => {
    if (releasingId) return;
    setReleasingId(pokemon.id);

    // play release animation for 1.1s then actually delete
    setTimeout(async () => {
      try {
        await removeFromTeam(pokemon.id);
        setTeam(currentTeam => currentTeam.filter(p => p.id !== pokemon.id));
        // success toast
        const d = document.createElement('div');
        d.className = 'game-dialog';
        d.innerHTML = `<span style="width:28px;height:28px;border-radius:999px;background:#22c55e;color:#fff;display:grid;place-items:center;font-weight:900;">✓</span><span><b>${pokemon.name}</b> was released — goodbye!</span>`;
        document.body.appendChild(d);
        setTimeout(() => { d.classList.add('fade-out'); setTimeout(() => d.remove(), 380); }, 1800);
      } catch (error) {
        console.error('Remove error:', error);
        const d = document.createElement('div');
        d.className = 'game-dialog';
        d.textContent = `Release failed: ${error.message}`;
        document.body.appendChild(d);
        setTimeout(() => { d.classList.add('fade-out'); setTimeout(() => d.remove(), 380); }, 2200);
      } finally {
        setReleasingId(null);
      }
    }, 1100);
  };

  const handleCancel = () => setReleasingId(null);

  return (
    <div className="team-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h2>Your Squad</h2>
          <p className="team-sub">{team.length === 0 ? 'Build a balanced team of up to 6' : `${team.length}/6 Pokémon • Tap Release to send one back to the wild`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="pill"><Zap size={14} style={{ color: '#eab308' }} /> <b>{totalPower.toLocaleString()}</b> total</span>
          <span className="pill"><Heart size={14} style={{ color: '#ef4444' }} /> <b>{avgPower}</b> avg</span>
        </div>
      </div>

      <div className="team-summary">
        <div className="summary-chip">
          <span>Slots used</span><b>{team.length} / 6</b>
        </div>
        <div className="summary-chip">
          <span>Roster power</span><b>{totalPower || '—'}</b>
        </div>
        <div className="summary-chip">
          <span>Status</span><b style={{ color: team.length === 6 ? '#22c55e' : '#64748b' }}>{team.length === 6 ? 'Ready to battle' : team.length >= 3 ? 'Battle-ready' : 'Keep catching'}</b>
        </div>
      </div>

      <div className="coverage-panel" title="Types present on your squad">
        <div className="coverage-head">
          <span className="coverage-title"><Shield size={14} /> Your types</span>
          <span className="coverage-count"><b>{coverage.size}</b> type{coverage.size === 1 ? '' : 's'}</span>
        </div>
        {coverage.size === 0 ? (
          <p className="coverage-empty">Catch some Pokémon to see their types here.</p>
        ) : (
          <div className="coverage-grid">
            {ALL_TYPES.filter(t => coverage.has(t)).map(t => (
              <span key={t} title={`${t}-type on your squad`} className={`type-coverage-dot type-${t}`}>
                {t}<span className="coverage-check">✓</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {team.length === 0 ? (
        <div className="empty-team">
          <div style={{ width: 56, height: 56, borderRadius: 999, background: '#fff', border: '1px solid #e2e8f0', display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(15,23,42,.06)' }}>
            <Sparkles size={22} style={{ color: '#3b4cca' }} />
          </div>
          <h3 style={{ fontWeight: 900, fontSize: '1.05rem' }}>Your team is empty</h3>
          <p>Head to <b>Discover</b> and catch your first Pokémon. Tip: try a Starter like <b>Charmander</b> or <b>Bulbasaur</b>.</p>
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png" alt="Pikachu" style={{ width: 110, marginTop: 4 }} />
          <button className="cta-btn empty-team-cta" onClick={() => onNavigate?.('browse')} style={{ marginTop: 14 }}>
            <Compass size={16} /> Go catch one
          </button>
        </div>
      ) : (
        <div className="team-members">
          {team.map((p) => {
            const pwr = p.stats?.reduce((a, s) => a + s.base, 0) || 0;
            const isReleasing = releasingId === p.id;
            const type = p.types?.[0] || 'normal';
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className={`team-member ${isReleasing ? 'releasing' : ''} type-${type}`}
              >
                <div style={{ position: 'absolute', top: 8, right: 8, background: '#0f172a', color: '#fff', padding: '3px 7px', borderRadius: 999, fontSize: '.68rem', fontWeight: 800, letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 4, zIndex: 1 }}>
                  <Crown size={10} /> #{String(p.id).padStart(4, '0')}
                </div>

                <div className="member-sprite-wrap">
                  <img src={p.image} alt={p.name} className={`team-member-img ${isReleasing ? 'releasing-pokemon' : ''}`} />
                  <div className="member-platform" />

                  <AnimatePresence>
                    {isReleasing && (
                      <motion.div
                        className="release-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {/* beam */}
                        <motion.div className="release-beam" initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} style={{ background: `linear-gradient(180deg, transparent, ${type === 'fire' ? '#ff6b35' : type === 'water' ? '#38bdf8' : type === 'grass' ? '#22c55e' : type === 'electric' ? '#facc15' : '#ffcb05'}33, ${type === 'fire' ? '#ff3d00' : type === 'water' ? '#3b82f6' : '#ffcb05'})` }} />
                        {/* pokeball */}
                        <motion.div className="pokeball-release" initial={{ scale: 0.4, y: 16 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
                          <div className="pb-top" />
                          <div className="pb-center">
                            <div className="pb-center-inner" />
                          </div>
                          <div className="pb-bottom" />
                          <motion.div className="pb-light" initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ delay: 0.32, duration: 0.42 }} />
                        </motion.div>
                        {/* particles */}
                        <div className="release-particles">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <span key={i} className="rp" style={{ '--a': `${(i / 10) * 360}deg`, '--d': `${44 + Math.random() * 18}px`, '--delay': `${i * 42}ms`, background: typeHex[type] || '#ffcb05' }} />
                          ))}
                        </div>
                        <motion.div className="release-text" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.18 }}>
                          <Sparkles size={12} /> Returning to the wild…
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <h3 className="team-member-name">{p.name}</h3>
                <div className="team-member-types">
                  {p.types.map(t => <span key={t} className={`type-badge type-${t}`} style={{ fontSize: '.64rem' }}>{t}</span>)}
                </div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 6, fontSize: '.72rem', fontWeight: 800, color: '#64748b' }}>
                  <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}><Shield size={12} /> {pwr}</span>
                </div>

                <button
                  className={`release-btn ${isReleasing ? 'releasing-btn' : ''}`}
                  onClick={() => handleRemove(p)}
                  disabled={!!releasingId}
                >
                  {isReleasing ? (
                    <>
                      <span className="btn-spinner" /> Releasing…
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} /> Release
                    </>
                  )}
                </button>

                {isReleasing && (
                  <button className="release-cancel" onClick={handleCancel} aria-label="Cancel">
                    <X size={14} />
                  </button>
                )}
              </motion.div>
            );
          })}

          {Array.from({ length: Math.max(0, 6 - team.length) }).map((_, i) => (
            <button
              key={`empty-${i}`}
              type="button"
              className="empty-slot"
              onClick={() => onNavigate?.('browse')}
              aria-label="Add a Pokémon — go to Discover"
              title="Catch a Pokémon to fill this slot"
            >
              <div className="empty-slot-plus">＋</div>
              Empty slot
              <span>Catch to fill →</span>
            </button>
          ))}
        </div>
      )}

      {/* Global releasing dim */}
      <AnimatePresence>
        {releasingId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="releasing-dim" onClick={handleCancel} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Team;
