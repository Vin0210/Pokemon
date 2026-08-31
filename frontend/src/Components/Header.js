import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';

const Header = () => {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <div className="brand-mark" aria-hidden />
          <div className="brand-text">
            <h1>POKÉ<span>DEX</span></h1>
            <p>Gotta Catch &apos;Em All — by <b>Elvin Ramos</b></p>
          </div>
        </div>

        <div className="header-actions">
          <div className="pill" title="System status">
            <span className="pill-dot" />
            <span><b>Online</b> • PokéAPI</span>
          </div>
          <div className="pill" style={{ display: 'none' }}>
            <Sparkles size={14} />
            <span>New UI</span>
          </div>
          <div className="pill" style={{ gap: 6 }}>
            <ShieldCheck size={14} style={{ color: '#3b4cca' }} />
            <span style={{ fontWeight: 800 }}>Team Guard</span>
            <span style={{ color: '#64748b', fontWeight: 600 }}>6 max</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
