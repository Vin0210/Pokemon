import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Eye, Sparkles, Zap, Crown, Filter, ArrowLeft, ArrowRight, Flame, Droplets, Leaf, CloudLightning } from 'lucide-react';
import { getPokemonList, getPokemonDetails } from '../Services/pokeapi';
import { addToTeam } from '../Services/teamService';

const CATEGORY_OPTIONS = ['All', 'Starter', 'Legendary', 'Mythical', 'Gen 1', 'Gen 2', 'Other'];

const typeGradient = (type) => {
  const map = {
    fire: 'linear-gradient(135deg,#ff7a18,#ff3d00)',
    water: 'linear-gradient(135deg,#4facfe,#3b4cca)',
    grass: 'linear-gradient(135deg,#7ed321,#2e7d32)',
    electric: 'linear-gradient(135deg,#ffde59,#ff9f1c)',
    psychic: 'linear-gradient(135deg,#ff6b9d,#c44569)',
    ice: 'linear-gradient(135deg,#a8edea,#4fb3bf)',
    dragon: 'linear-gradient(135deg,#7b2dff,#3a0ca3)',
    fairy: 'linear-gradient(135deg,#ffb3d1,#ff6b9d)',
    normal: 'linear-gradient(135deg,#c0c0a8,#8a8a6a)',
    poison: 'linear-gradient(135deg,#a86ad1,#6d28a8)',
    ground: 'linear-gradient(135deg,#e7c86a,#b9972f)',
    fighting: 'linear-gradient(135deg,#c03028,#7a1a1a)',
    flying: 'linear-gradient(135deg,#a8b5ff,#6b7cff)',
    bug: 'linear-gradient(135deg,#a8c020,#6b7a12)',
    rock: 'linear-gradient(135deg,#b8a048,#7a6a2a)',
    ghost: 'linear-gradient(135deg,#6b5b95,#3d2b56)',
    steel: 'linear-gradient(135deg,#b8c0d0,#7a8599)',
    dark: 'linear-gradient(135deg,#5a4a3a,#2b2117)',
  };
  return map[type] || 'linear-gradient(135deg,#e2e8f0,#cbd5e1)';
};

const TYPE_FIRE = {
  fire:      { colors:['#ff3d00','#ff7a18','#ff9f1c','#ffb86a','#ff6b35'], emoji:'🔥', label:'FIRE BLAST',  shape:'flame',  burst:'burst-fire' },
  water:     { colors:['#3b4cca','#4facfe','#60a5fa','#38bdf8','#7dd3fc'], emoji:'💧', label:'HYDRO BURST', shape:'drop',   burst:'burst-water' },
  grass:     { colors:['#22c55e','#4ade80','#86efac','#7ed321','#a7f3d0'], emoji:'🌿', label:'BLOOM BURST', shape:'leaf',   burst:'burst-grass' },
  electric:  { colors:['#facc15','#ffde59','#fde047','#fef08a','#fffbeb'], emoji:'⚡', label:'THUNDER',     shape:'spark',  burst:'burst-electric' },
  psychic:   { colors:['#ec4899','#f472b6','#f9a8d4','#ff6b9d','#f0abfc'], emoji:'🔮', label:'PSY BURST',   shape:'star',   burst:'burst-psychic' },
  ice:       { colors:['#06b6d4','#22d3ee','#7dd3fc','#a5f3fc','#e0f2fe'], emoji:'❄️', label:'FROST NOVA',  shape:'snow',   burst:'burst-ice' },
  dragon:    { colors:['#7c3aed','#8b5cf6','#a78bfa','#6d28d9','#c4b5fd'], emoji:'🐉', label:'DRAGON FLARE',shape:'flame',  burst:'burst-dragon' },
  fairy:     { colors:['#f472b6','#f9a8d4','#fbcfe8','#f0abfc','#fce7f3'], emoji:'✨', label:'FAIRY WIND',  shape:'star',   burst:'burst-fairy' },
  poison:    { colors:['#a855f7','#c084fc','#e9d5ff','#9333ea','#6b21a8'], emoji:'☠️', label:'TOXIN CLOUD', shape:'bubble', burst:'burst-poison' },
  ground:    { colors:['#a16207','#ca8a04','#eab308','#facc15','#d97706'], emoji:'⛰️', label:'QUAKE',       shape:'rock',   burst:'burst-ground' },
  flying:    { colors:['#818cf8','#a5b4fc','#c7d2fe','#6366f1','#e0e7ff'], emoji:'🌪️', label:'GUST',        shape:'feather',burst:'burst-flying' },
  bug:       { colors:['#84cc16','#a3e635','#bef264','#65a30d','#a8b820'], emoji:'🐛', label:'SWARM',       shape:'leaf',   burst:'burst-bug' },
  rock:      { colors:['#78716c','#a8a29e','#d6d3d1','#57534e','#44403c'], emoji:'🪨', label:'ROCK BLAST',  shape:'rock',   burst:'burst-rock' },
  ghost:     { colors:['#6b7280','#8b5cf6','#a78bfa','#4b5563','#1f2937'], emoji:'👻', label:'SHADOW',      shape:'ghost',  burst:'burst-ghost' },
  steel:     { colors:['#94a3b8','#cbd5e1','#e2e8f0','#64748b','#475569'], emoji:'⚙️', label:'STEEL SPARK', shape:'spark',  burst:'burst-steel' },
  fighting:  { colors:['#dc2626','#ef4444','#f87171','#b91c1c','#991b1b'], emoji:'🥊', label:'FIGHTING SPIRIT', shape:'burst', burst:'burst-fighting' },
  dark:      { colors:['#44403c','#57534e','#1c1917','#292524','#44403c'], emoji:'🌑', label:'DARK PULSE',  shape:'pulse', burst:'burst-dark' },
  normal:    { colors:['#a8a29e','#d6d3d1','#e7e5e4','#78716c','#57534e'], emoji:'⭐', label:'CAUGHT!',     shape:'star', burst:'burst-normal' },
};
const getTypeEffect = (t) => TYPE_FIRE[t] || TYPE_FIRE.normal;

const PokemonList = ({ team, setTeam }) => {
  const [allPokemon, setAllPokemon] = useState([]);
  const [filteredPokemon, setFilteredPokemon] = useState([]);
  const [currentPokemon, setCurrentPokemon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPokemon, setTotalPokemon] = useState(0);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [catchAnimation, setCatchAnimation] = useState(null);
  const [catchType, setCatchType] = useState(null);
  const confettiRef = useRef(null);
  const pokemonPerPage = 24;

  useEffect(() => {
    const categorizePokemon = (pokemon) => {
      const starters = ['bulbasaur', 'charmander', 'squirtle', 'chikorita', 'cyndaquil', 'totodile', 'treecko', 'torchic', 'mudkip'];
      const legendaries = ['mewtwo', 'lugia', 'ho-oh', 'rayquaza', 'dialga', 'palkia', 'giratina'];
      const mythical = ['mew', 'celebi', 'jirachi', 'manaphy'];
      if (starters.includes(pokemon.name)) return 'Starter';
      if (legendaries.includes(pokemon.name)) return 'Legendary';
      if (mythical.includes(pokemon.name)) return 'Mythical';
      if (pokemon.id <= 151) return 'Gen 1';
      if (pokemon.id <= 251) return 'Gen 2';
      return 'Other';
    };

    const fetchAllPokemonList = async () => {
      try {
        setLoading(true);
        setError(null);
        const initialList = await getPokemonList(1, 0);
        setTotalPokemon(initialList.count);
        const listData = await getPokemonList(initialList.count, 0);
        const lightweightList = listData.results.map((p) => {
          const id = Number(p.url.split('/').filter(Boolean).pop());
          return { id, name: p.name, category: categorizePokemon({ id, name: p.name }) };
        });
        setAllPokemon(lightweightList);
        setFilteredPokemon(lightweightList);
      } catch (err) {
        setError("Failed to load Pokémon. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllPokemonList();
  }, []);

  useEffect(() => {
    let filtered = allPokemon.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (selectedCategory) filtered = filtered.filter(p => p.category === selectedCategory);
    setFilteredPokemon(filtered);
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, allPokemon]);

  useEffect(() => {
    if (showConfetti && catchType) {
      const effect = getTypeEffect(catchType);
      const createConfetti = () => {
        if (!confettiRef.current) return;
        const el = document.createElement('div');
        const isFlame = effect.shape === 'flame' || effect.shape === 'spark';
        el.className = `confetti type-${catchType} ${isFlame ? 'confetti-flame' : ''}`;
        el.style.left = `${Math.random() * 100}%`;
        el.style.background = effect.colors[Math.floor(Math.random() * effect.colors.length)];
        el.style.backgroundColor = effect.colors[Math.floor(Math.random() * effect.colors.length)];
        if (effect.shape === 'drop') { el.style.borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%'; el.style.width='10px'; el.style.height='14px'; }
        if (effect.shape === 'leaf') { el.style.borderRadius = '2px 10px 2px 10px'; el.style.transform = `rotate(${Math.random()*60-30}deg)`; }
        if (effect.shape === 'spark') { el.style.width='3px'; el.style.height='14px'; el.style.borderRadius='999px'; el.style.boxShadow='0 0 8px currentColor'; }
        if (effect.shape === 'star') { el.style.clipPath='polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)'; el.style.width='14px'; el.style.height='14px'; }
        el.style.opacity = '1';
        const dur = effect.shape==='spark' ? (0.7 + Math.random()*0.6) : (1.6 + Math.random()*1.8);
        el.style.animation = `confetti ${dur}s linear forwards, ${effect.shape==='flame' ? 'flameFlicker .18s infinite alternate' : ''}`;
        el.style.animationDelay = `${Math.random()*0.15}s`;
        confettiRef.current.appendChild(el);
        setTimeout(() => el.remove(), 4200);
      };
      // denser burst for fire/electric
      const density = (catchType==='fire' || catchType==='electric' || catchType==='dragon') ? 55 : 38;
      let count=0;
      const burst = setInterval(() => { createConfetti(); if(++count>density) clearInterval(burst); }, 32);
      // secondary shockwave ring
      const ring = document.createElement('div');
      ring.className = `burst-ring burst-${catchType}`;
      ring.style.cssText = `left:50%;top:62%;background:${effect.colors[0]}`;
      confettiRef.current.appendChild(ring);
      setTimeout(()=>ring.remove(), 900);
      const interval = setInterval(createConfetti, 70);
      setTimeout(() => { clearInterval(interval); clearInterval(burst); setShowConfetti(false); setCatchType(null); }, 2400);
      return () => { clearInterval(interval); clearInterval(burst); };
    } else if (showConfetti) {
      // fallback
      const cols=['#ffcb05','#3b4cca','#ff0000','#22c55e'];
      const create=()=>{
        if(!confettiRef.current) return;
        const el=document.createElement('div');
        el.className='confetti';
        el.style.left=`${Math.random()*100}%`;
        el.style.backgroundColor=cols[Math.floor(Math.random()*cols.length)];
        el.style.animation=`confetti ${Math.random()*2+2}s linear forwards`;
        confettiRef.current.appendChild(el);
        setTimeout(()=>el.remove(),4000);
      };
      const iv=setInterval(create,90);
      setTimeout(()=>{clearInterval(iv); setShowConfetti(false)},2200);
      return ()=>clearInterval(iv);
    }
  }, [showConfetti, catchType]);

  const totalPages = Math.ceil(filteredPokemon.length / pokemonPerPage);

  useEffect(() => {
    let cancelled = false;
    const indexOfFirst = (currentPage - 1) * pokemonPerPage;
    const slices = filteredPokemon.slice(indexOfFirst, indexOfFirst + pokemonPerPage);
    const loadPageDetails = async () => {
      if (slices.length === 0) { setCurrentPokemon([]); setPageLoading(false); return; }
      setPageLoading(true);
      try {
        const detailed = await Promise.all(
          slices.map(async (p) => {
            const details = await getPokemonDetails(p.id);
            return {
              id: details.id,
              name: details.name,
              image: details.sprites.other['official-artwork'].front_default || details.sprites.front_default,
              types: details.types.map(t => t.type.name),
              stats: details.stats.map(s => ({ name: s.stat.name, base: s.base_stat })),
              abilities: details.abilities.map(a => a.ability.name),
              category: p.category,
              height: details.height,
              weight: details.weight
            };
          })
        );
        if (!cancelled) setCurrentPokemon(detailed);
      } catch (err) {
        if (!cancelled) setError("Failed to load Pokémon. Please try again.");
        console.error(err);
      } finally { if (!cancelled) setPageLoading(false); }
    };
    loadPageDetails();
    return () => { cancelled = true; };
  }, [filteredPokemon, currentPage]);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToTeam = async (pokemon) => {
    try {
      if (team.length >= 6) { showGameDialog("Your team is full — maximum 6 Pokémon."); return; }
      setCatchAnimation(pokemon.id);
      setCatchType(pokemon.types[0]);
      setTimeout(async () => {
        try {
          await addToTeam(pokemon);
          setTeam([...team, pokemon]);
          setShowConfetti(true);
          // keep catchType for burst; will be cleared by confetti effect
        } catch (e) {
          showGameDialog(e.message.includes('full') ? e.message : "Failed to add Pokémon to team");
          setCatchType(null);
        } finally {
          setCatchAnimation(null);
        }
      }, 950);
    } catch (err) {
      showGameDialog("Failed to add Pokémon to team");
      setCatchAnimation(null);
      setCatchType(null);
      console.error(err);
    }
  };

  const showGameDialog = (message) => {
    const dialog = document.createElement('div');
    dialog.className = 'game-dialog';
    dialog.innerHTML = `<span style="width:28px;height:28px;border-radius:999px;background:#ffcb05;color:#0f172a;display:grid;place-items:center;font-weight:900;">!</span><span>${message}</span>`;
    document.body.appendChild(dialog);
    setTimeout(() => {
      dialog.classList.add('fade-out');
      setTimeout(() => dialog.remove(), 380);
    }, 2200);
  };

  const formatStatName = (name) => {
    switch (name) {
      case 'hp': return 'HP';
      case 'attack': return 'ATK';
      case 'defense': return 'DEF';
      case 'special-attack': return 'SP.A';
      case 'special-defense': return 'SP.D';
      case 'speed': return 'SPD';
      default: return name.toUpperCase();
    }
  };
  const getStatBarWidth = (value) => Math.min((value / 180) * 100, 100);
  const getStatBarColor = (value) => value < 50 ? 'stat-bar-low' : value < 90 ? 'stat-bar-medium' : 'stat-bar-high';

  const power = (p) => p.stats?.reduce((s, x) => s + x.base, 0) || 0;

  if (loading) {
    return (
      <div className="pokemon-container">
        <div className="filters-card">
          <div className="skeleton" style={{ height: 44, width: 280, borderRadius: 999, background: '#f1f5f9' }} />
          <div className="skeleton" style={{ height: 36, width: 360, borderRadius: 999, background: '#f1f5f9' }} />
        </div>
        <div className="loading-container" style={{ marginTop: 16 }}>
          <div className="loading-pokeball" />
          <p className="loading-text">Warming up the tall grass…</p>
          <p style={{ fontSize: '.82rem', color: '#94a3b8', fontWeight: 600 }}>{totalPokemon ? `Fetching ${totalPokemon.toLocaleString()} Pokémon` : 'Contacting PokéAPI'}</p>
        </div>
        <div className="skeleton-grid">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton-card" />)}
        </div>
      </div>
    );
  }

  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="pokemon-container">
      <div ref={confettiRef} className="confetti-container" />

      <div className="game-panel">
        <div className="filters-card">
          <div className="filters-left">
            <div className="search-wrap">
              <Search size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name — try ‘pikachu’"
                className="search-input"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: 999, border: '1px solid #e2e8f0', background: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="filter-pills">
              {CATEGORY_OPTIONS.map(opt => {
                const val = opt === 'All' ? '' : opt;
                const active = selectedCategory === val;
                return (
                  <button key={opt} className={`chip ${active ? 'active' : ''}`} onClick={() => setSelectedCategory(val)}>
                    {opt === 'Starter' && <Crown size={12} />}
                    {opt === 'Legendary' && <Sparkles size={12} />}
                    {opt === 'Gen 1' && <Zap size={12} />}
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="filters-right">
            <div className="count-badge">
              <Filter size={14} style={{ color: '#3b4cca' }} />
              <span>Showing <strong>{filteredPokemon.length.toLocaleString()}</strong> of {totalPokemon.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="pokemon-grid" style={{ position: 'relative', minHeight: pageLoading ? 320 : undefined }}>
          {pageLoading && (
            <div className="page-loading-overlay">
              <div className="loading-pokeball" style={{ width: 44, height: 44 }} />
              <span>Summoning Pokémon…</span>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {currentPokemon.map((p) => {
              const inTeam = team.some(m => m.id === p.id);
              const primary = p.types?.[0];
              const total = power(p);
              const effect = getTypeEffect(primary);
              const isCatching = catchAnimation === p.id;
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: .98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: .22, ease: [0.22, 1, 0.36, 1] }}
                  className={`pokemon-card ${isCatching ? 'catch-animation' : ''} ${isCatching ? `catching-${primary}` : ''}`}
                >
                  <div className="card-top">
                    <div className="type-accent" style={{ background: typeGradient(primary), opacity: .12 }} />
                    <span className="pokemon-id">#{String(p.id).padStart(4, '0')}</span>
                    <div className="card-actions-top">
                      <button className="icon-btn" onClick={() => setSelectedPokemon(p)} aria-label={`View ${p.name}`}>
                        <Eye size={14} />
                      </button>
                    </div>
                    <div className="pokeball-watermark" aria-hidden />
                    <div className="pokemon-image-container">
                      <img src={p.image} alt={p.name} className="pokemon-image" loading="lazy" />
                      {/* TYPE FIRE BURST */}
                      <AnimatePresence>
                        {isCatching && (
                          <motion.div
                            className={`catch-burst ${effect.burst} type-${primary}`}
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.25 }}
                          >
                            <div className="catch-burst-core" style={{ background: effect.colors[0], boxShadow:`0 0 24px ${effect.colors[0]}, 0 0 48px ${effect.colors[1]}` }} />
                            <div className="catch-burst-ring" style={{ borderColor: effect.colors[0] }} />
                            <div className="catch-burst-ring delay" style={{ borderColor: effect.colors[1] }} />
                            <div className="catch-burst-label" style={{ background: effect.colors[0], color: primary==='electric' || primary==='ice' ? '#0f172a' : '#fff' }}>
                              <span>{effect.emoji}</span> {effect.label}
                            </div>
                            {/* particles */}
                            {Array.from({length: 12}).map((_, i) => {
                              const angle = (i / 12) * 360;
                              const dist = 46 + Math.random()*18;
                              const x = Math.cos(angle*Math.PI/180)*dist;
                              const y = Math.sin(angle*Math.PI/180)*dist - 8;
                              const c = effect.colors[i % effect.colors.length];
                              return (
                                <span
                                  key={i}
                                  className={`catch-particle p-${effect.shape}`}
                                  style={{
                                    '--x': `${x}px`,
                                    '--y': `${y}px`,
                                    '--c': c,
                                    '--d': `${i*38}ms`,
                                    background: c,
                                    animationDelay: `${i*38}ms`
                                  }}
                                />
                              );
                            })}
                            {/* rising flames for fire/dragon */}
                            {(primary==='fire' || primary==='dragon') && (
                              <div className="flame-riser">
                                <Flame size={18} style={{ color: effect.colors[0] }} />
                                <Flame size={14} style={{ color: effect.colors[1] }} />
                                <Flame size={12} style={{ color: effect.colors[2] }} />
                              </div>
                            )}
                            {primary==='water' && <div className="splash-riser"><Droplets size={16} style={{ color: effect.colors[0] }}/><Droplets size={12} style={{ color: effect.colors[2] }}/></div>}
                            {primary==='grass' && <div className="leaf-riser"><Leaf size={16} style={{ color: effect.colors[0] }}/><Leaf size={12} style={{ color: effect.colors[1] }}/></div>}
                            {primary==='electric' && <div className="spark-riser"><CloudLightning size={18} style={{ color: effect.colors[1] }}/><Zap size={14} style={{ color: effect.colors[0] }}/></div>}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="card-content">
                    <div className="pokemon-name-row">
                      <h3 className="pokemon-name">{p.name}</h3>
                      <span className="pokemon-meta">{p.category} <span className="meta-dot" /> {total} PWR</span>
                    </div>

                    <div className="pokemon-types">
                      {p.types.map(t => (
                        <span key={t} className={`type-badge type-${t}`}>{t}</span>
                      ))}
                    </div>

                    <div className="card-stats">
                      {p.stats.slice(0, 3).map(s => (
                        <div key={s.name} className="mini-stat">
                          <b>{s.base}</b>
                          <span>{formatStatName(s.name)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="card-buttons">
                      <button
                        className={`btn pokeball-button ${inTeam ? 'in-team' : ''}`}
                        onClick={() => handleAddToTeam(p)}
                        disabled={inTeam || catchAnimation !== null}
                      >
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: inTeam ? '#e2e8f0' : '#fff', border: '2px solid #0f172a', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
                          <span style={{ width: 6, height: 6, background: inTeam ? '#22c55e' : '#0f172a', borderRadius: '50%' }} />
                        </span>
                        {inTeam ? 'Caught' : isCatching ? 'Catching…' : 'Catch'}
                      </button>
                      <button className="btn info-button" onClick={() => setSelectedPokemon(p)}>
                        Info
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredPokemon.length === 0 && !pageLoading && (
          <div className="empty-team" style={{ marginTop: 16 }}>
            <p>No Pokémon matches <b>“{searchTerm}”</b> {selectedCategory && `in ${selectedCategory}`}. Try a different search.</p>
            <button className="cta-btn" onClick={() => { setSearchTerm(''); setSelectedCategory(''); }}>Clear filters</button>
          </div>
        )}

        <div className="pagination">
          <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="pagination-button" aria-label="Previous page">
            <ArrowLeft size={14} /> Prev
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNumber;
            if (totalPages <= 5) pageNumber = i + 1;
            else if (currentPage <= 3) pageNumber = i + 1;
            else if (currentPage >= totalPages - 2) pageNumber = totalPages - 4 + i;
            else pageNumber = currentPage - 2 + i;
            return (
              <button
                key={pageNumber}
                onClick={() => paginate(pageNumber)}
                className={`pagination-button ${currentPage === pageNumber ? 'active' : ''}`}
              >
                {pageNumber}
              </button>
            );
          })}
          <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="pagination-button" aria-label="Next page">
            Next <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {selectedPokemon && (
          <motion.div className="modal-overlay" onClick={() => setSelectedPokemon(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content" onClick={e => e.stopPropagation()} initial={{ y: 12, scale: .98, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 8, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
              <div className="modal-header">
                <div>
                  <h2 className="pokemon-detail-name">{selectedPokemon.name}</h2>
                  <div style={{ fontSize: '.82rem', color: '#64748b', fontWeight: 700, marginTop: 2 }}>{selectedPokemon.category} • #{String(selectedPokemon.id).padStart(4, '0')}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="pokemon-detail-id">#{String(selectedPokemon.id).padStart(4, '0')}</span>
                  <button className="modal-close-x" onClick={() => setSelectedPokemon(null)} aria-label="Close">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="pokemon-detail-container">
                <div className="pokemon-detail-image-container">
                  <div style={{ position: 'absolute', inset: 0, background: typeGradient(selectedPokemon.types[0]), opacity: .08, borderRadius: 18 }} />
                  <img src={selectedPokemon.image} alt={selectedPokemon.name} className="pokemon-detail-image" style={{ position: 'relative' }} />
                  <div className="pokemon-detail-types">
                    {selectedPokemon.types.map(type => (
                      <span key={type} className={`type-badge type-${type}`}>{type}</span>
                    ))}
                  </div>
                  <div className="pokemon-physical">
                    <div className="physical-stat">
                      <span className="physical-label">Height</span>
                      <span className="physical-value">{(selectedPokemon.height / 10).toFixed(1)} m</span>
                    </div>
                    <div className="physical-stat">
                      <span className="physical-label">Weight</span>
                      <span className="physical-value">{(selectedPokemon.weight / 10).toFixed(1)} kg</span>
                    </div>
                    <div className="physical-stat">
                      <span className="physical-label">Power</span>
                      <span className="physical-value">{power(selectedPokemon)}</span>
                    </div>
                  </div>
                </div>

                <div className="pokemon-detail-info">
                  <div className="detail-section">
                    <h4 className="section-title">Base stats</h4>
                    <div className="stats-container">
                      {selectedPokemon.stats.map(stat => (
                        <div key={stat.name} className="stat-bar">
                          <span className="stat-name">{formatStatName(stat.name)}</span>
                          <div className="stat-bar-container">
                            <div className={`stat-bar-fill ${getStatBarColor(stat.base)}`} style={{ width: `${getStatBarWidth(stat.base)}%` }} />
                          </div>
                          <span className="stat-value">{stat.base}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4 className="section-title">Abilities</h4>
                    <div className="abilities-list">
                      {selectedPokemon.abilities.map(ab => (
                        <div key={ab} className="ability-item">{ab.replace('-', ' ')}</div>
                      ))}
                    </div>
                  </div>

                  <button className="close-button" onClick={() => setSelectedPokemon(null)}>Close Pokédex</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PokemonList;
