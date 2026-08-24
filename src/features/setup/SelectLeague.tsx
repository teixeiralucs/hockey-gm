import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Play, ChevronRight } from 'lucide-react';
import { Button } from '../../components/Button';
import { useGameStore } from '../../store/useGameStore';
import type { League } from '../../engine/models/League';
import '../main-menu/MainMenu.css';

export const SelectLeague: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { supportedLeagues } = useGameStore();
  const [selectedLeague, setSelectedLeague] = useState<League | null>(supportedLeagues[0] || null);

  const handleContinue = () => {
    if (selectedLeague) {
      navigate('/select-team');
    }
  };

  return (
    <div className="main-menu-container">
      {/* Background Element */}
      <div className="ice-glow"></div>
      
      {/* Back Button */}
      <div style={{ position: 'absolute', top: 32, left: 32, zIndex: 10 }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ 
            color: 'var(--color-text-secondary)', 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.875rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em', 
            cursor: 'pointer', 
            background: 'none', 
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s ease-out'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-accent)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
        >
          <ArrowLeft size={16} style={{ marginRight: '8px' }} />
          Back to Menu
        </button>
      </div>

      <div className="main-menu-content layout-asymmetric">
        {/* Esquerda: Conteúdo Principal */}
        <div className="menu-left">
          <header className="game-header">
            <h2 className="game-subtitle" style={{ color: 'var(--color-text-secondary)' }}>The Ultimate Simulation</h2>
            <h1 className="game-title font-display" style={{ fontSize: '4rem' }}>
              Choose Your<br/>
              <span style={{ color: 'var(--color-accent)' }}>League</span>
            </h1>
          </header>

          <div className="menu-actions">
            {supportedLeagues.map(league => (
              <Button 
                key={league.id} 
                size="lg" 
                variant={selectedLeague?.id === league.id ? 'primary' : 'secondary'} 
                className="action-btn"
                onClick={() => setSelectedLeague(league)}
                style={{
                  justifyContent: 'flex-start'
                }}
              >
                <Play size={24} className="btn-icon" style={{ opacity: selectedLeague?.id === league.id ? 1 : 0.7 }} />
                {league.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Direita: Painel Glassmorphism de Informações */}
        <div className="menu-right">
          {selectedLeague ? (
            <div className="glass-panel info-panel" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 className="font-display info-title" style={{ 
                  fontSize: '2.5rem', 
                  borderBottom: 'none', 
                  paddingBottom: 0, 
                  marginBottom: 'var(--space-2)',
                  whiteSpace: 'nowrap',
                  color: selectedLeague.colors.primary,
                  textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                }}>
                  {selectedLeague.name}
                </h3>
                <div className="info-stats" style={{ marginTop: 'var(--space-6)', gap: 'var(--space-8)' }}>
                  <div className="stat">
                    <span className="stat-value font-display" style={{ fontSize: '3.5rem' }}>{selectedLeague.conferences.flatMap(c => c.divisions.flatMap(d => d.teams)).length}</span>
                    <span className="stat-label" style={{ fontSize: '1rem' }}>Teams</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value font-display" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', height: '100%', paddingBottom: '0.5rem' }}>
                      Junior<br/>Hockey
                    </span>
                  </div>
                </div>
              </div>
              
              <Button 
                size="lg" 
                className="action-btn" 
                style={{ 
                  marginTop: 'var(--space-8)', 
                  width: '100%', 
                  justifyContent: 'space-between',
                  backgroundColor: selectedLeague.colors.primary,
                  color: '#fff',
                  border: 'none'
                }} 
                onClick={handleContinue}
                onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.2)'}
                onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
              >
                Continue
                <ChevronRight size={24} />
              </Button>
            </div>
          ) : (
            <div className="glass-panel info-panel" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Select a league
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
