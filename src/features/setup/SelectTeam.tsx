import React, { useState, useMemo } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Activity, ArrowLeft, RefreshCw, Play } from 'lucide-react';
import { Button } from '../../components/Button';
import type { Team } from '../../engine/models/Team';
import '../main-menu/MainMenu.css';
import './SelectTeam.css';

// Função auxiliar para embaralhar o array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const SelectTeam: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { supportedLeagues, startNewGame } = useGameStore();

  const ohl = supportedLeagues.find(l => l.id === 'ohl');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  if (!ohl) return null;

  const handleStart = () => {
    if (selectedTeam) {
      startNewGame('ohl', selectedTeam.id);
      navigate('/dashboard'); // Para o futuro
    }
  };

  // Sorteia 6 times aleatórios apenas na montagem (ou recarregamento)
  const allTeams = useMemo(() => {
    const teams = ohl.conferences.flatMap(c => c.divisions.flatMap(d => d.teams));
    return shuffleArray(teams).slice(0, 6);
  }, [ohl]);

  return (
    <div className="main-menu-container" style={{ alignItems: 'flex-start' }}>
      <div className="ice-glow"></div>

      {/* Back Button */}
      <div style={{ position: 'absolute', top: 32, left: 32, zIndex: 10 }}>
        <button 
          onClick={() => navigate('/select-league')} 
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
          Back to League Selection
        </button>
      </div>

      <div className="main-menu-content layout-asymmetric" style={{ alignItems: 'flex-start' }}>
        {/* Coluna Esquerda (Listagem) */}
        <div className="menu-left" style={{ paddingBottom: '40px' }}>
          <header className="game-header">
            <h2 className="game-subtitle">The Ultimate Simulation</h2>
            <h1 className="game-title font-display" style={{ fontSize: '4rem' }}>
              Choose Your<br/>
              <span style={{ color: 'var(--color-accent)' }}>Team</span>
            </h1>
          </header>

          <div className="team-list custom-scrollbar menu-actions" style={{ maxWidth: '450px' }}>
            {allTeams.map(team => {
              const isSelected = selectedTeam?.id === team.id;
              return (
                <Button 
                  key={team.id}
                  size="lg"
                  variant={isSelected ? 'primary' : 'secondary'}
                  className="action-btn"
                  onClick={() => setSelectedTeam(team)}
                  style={{ 
                    justifyContent: 'flex-start',
                    backgroundColor: isSelected ? team.colors.primary : undefined,
                    borderColor: isSelected ? team.colors.primary : undefined,
                    color: isSelected ? '#fff' : undefined,
                    textTransform: 'uppercase'
                  }}
                >
                  <Play size={24} className="btn-icon" style={{ opacity: isSelected ? 1 : 0.7 }} />
                  {team.city} {team.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita (Detalhes táticos) */}
        <div className="menu-right">
          {selectedTeam ? (
            <div className="glass-panel info-panel" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ backgroundColor: selectedTeam.colors.primary, height: '4px', position: 'absolute', top: 0, left: 0, right: 0 }} />
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-2)' }}>
                  <img 
                    src={selectedTeam.logoUrl} 
                    alt={selectedTeam.name} 
                    style={{ 
                      maxHeight: '120px', 
                      width: 'auto',
                      filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.5))'
                    }} 
                  />
                </div>
                
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                  <h3 className="font-display" style={{ 
                    fontSize: '1.5rem', 
                    color: selectedTeam.colors.primary,
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                    margin: 0
                  }}>
                    {selectedTeam.city}
                  </h3>
                </div>

                <div className="info-stats" style={{ marginTop: 'var(--space-6)', gap: 'var(--space-8)', justifyContent: 'center' }}>
                  <div className="stat">
                    <span className="stat-value font-display">15</span>
                    <span className="stat-label">OVR</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value font-display">D</span>
                    <span className="stat-label">Tier</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value font-display">{selectedTeam.conference}</span>
                    <span className="stat-label">Conf.</span>
                  </div>
                </div>
              </div>
              
              <Button 
                size="lg"
                onClick={handleStart} 
                className="action-btn"
                style={{ 
                  marginTop: 'var(--space-8)', 
                  width: '100%', 
                  justifyContent: 'space-between',
                  backgroundColor: selectedTeam.colors.primary,
                  color: '#fff',
                  border: 'none',
                }}
                onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.2)'}
                onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
              >
                Sign Contract
                <ChevronRight size={24} />
              </Button>
            </div>
          ) : (
            <div className="glass-panel info-panel" style={{ alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Select a franchise
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
