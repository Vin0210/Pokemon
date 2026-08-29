import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Crown, Trash2, Zap, Heart, Shield, Sparkles } from 'lucide-react';
import { removeFromTeam } from '../Services/teamService';

const Team = ({ team, setTeam }) => {
  const totalPower = useMemo(() => team.reduce((acc, p) => acc + (p.stats?.reduce((a, s) => a + s.base, 0) || 0), 0), [team]);
  const avgPower = team.length ? Math.round(totalPower / team.length) : 0;

  const handleRemove = async (pokemonId) => {
    try {
      await removeFromTeam(pokemonId);
      setTeam(currentTeam => currentTeam.filter(p => p.id !== pokemonId));
    } catch (error) {
      console.error('Remove error:', error);
      const d = document.createElement('div');
      d.className = 'game-dialog';
      d.textContent = `Release failed: ${error.message}`;
      document.body.appendChild(d);
      setTimeout(() => { d.classList.add('fade-out'); setTimeout(() => d.remove(), 380); }, 2200);
    }
  };

  return (
    <div className="team-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h2>Your Squad</h2>
          <p className="team-sub">{team.length === 0 ? 'Build a balanced team of up to 6' : `${team.length}/6 Pokémon • Tap Release to free a slot`}</p>
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

      {team.length === 0 ? (
        <div className="empty-team">
          <div style={{ width: 56, height: 56, borderRadius: 999, background: '#fff', border: '1px solid #e2e8f0', display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(15,23,42,.06)' }}>
            <Sparkles size={22} style={{ color: '#3b4cca' }} />
          </div>
          <h3 style={{ fontWeight: 900, fontSize: '1.05rem' }}>Your team is empty</h3>
          <p>Head to <b>Discover</b> and catch your first Pokémon. Tip: try a Starter like <b>Charmander</b> or <b>Bulbasaur</b>.</p>
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png" alt="Pikachu" style={{ width: 110, marginTop: 4 }} />
        </div>
      ) : (
        <div className="team-members">
          {team.map((p) => {
            const pwr = p.stats?.reduce((a, s) => a + s.base, 0) || 0;
            return (
              <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="team-member">
                <div style={{ position: 'absolute', top: 8, right: 8, background: '#0f172a', color: '#fff', padding: '3px 7px', borderRadius: 999, fontSize: '.68rem', fontWeight: 800, letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Crown size={10} /> #{String(p.id).padStart(4, '0')}
                </div>
                <img src={p.image} alt={p.name} />
                <h3 className="team-member-name">{p.name}</h3>
                <div className="team-member-types">
                  {p.types.map(type => <span key={type} className={`type-badge type-${type}`} style={{ fontSize: '.64rem' }}>{type}</span>)}
                </div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 6, fontSize: '.72rem', fontWeight: 800, color: '#64748b' }}>
                  <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}><Shield size={12} /> {pwr}</span>
                </div>
                <button className="release-btn" onClick={() => handleRemove(p.id)}>
                  <Trash2 size={14} /> Release
                </button>
              </motion.div>
            );
          })}

          {/* empty slot placeholders */}
          {Array.from({ length: Math.max(0, 6 - team.length) }).map((_, i) => (
            <div key={`empty-${i}`} style={{ border: '1.5px dashed #cbd5e1', borderRadius: 18, background: 'rgba(255,255,255,.6)', display: 'grid', placeItems: 'center', padding: 18, minHeight: 196, color: '#94a3b8', fontWeight: 700, textAlign: 'center' }}>
              <div>
                <div style={{ width: 44, height: 44, borderRadius: 999, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', placeItems: 'center', margin: '0 auto 8px' }}>＋</div>
                Empty slot<br /><span style={{ fontSize: '.78rem', fontWeight: 600 }}>Catch to fill</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Team;
