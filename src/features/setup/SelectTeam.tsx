import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Shield, Activity, ArrowLeft } from 'lucide-react';
import type { Team } from '../../engine/models/Team';
import './SelectTeam.css';

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

  // Extrair todos os times para listar
  const allTeams = ohl.conferences.flatMap(c => c.divisions.flatMap(d => d.teams));

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

          <div className="team-list custom-scrollbar" style={{ marginTop: 'var(--space-8)' }}>
            {allTeams.map(team => {
              const isSelected = selectedTeam?.id === team.id;
              return (
                <div 
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`team-card ${isSelected ? 'selected' : ''}`}
                >
                  <div 
                    className="team-card-accent"
                    style={{ backgroundColor: team.colors.primary }}
                  />

                  <div className="team-card-info">
                    <h3 className="team-card-name">
                      {team.city} {team.name}
                    </h3>
                    <span className="team-card-conf">
                      {team.conference} Conference
                    </span>
                  </div>

                  <div className="team-card-stats">
                    <div className="stat-block">
                      <span className="stat-label" style={{ fontSize: '0.5625rem' }}>Tier</span>
                      <span className="stat-value" style={{ fontSize: '0.875rem' }}>D</span>
                    </div>
                    <div className="stat-block">
                      <span className="stat-label" style={{ fontSize: '0.5625rem' }}>EST OVR</span>
                      <span className="stat-value highlight" style={{ fontSize: '1.25rem' }}>~15</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita (Detalhes táticos) */}
        <div className="menu-right" style={{ position: 'sticky', top: '20vh' }}>
          {selectedTeam ? (
            <div className="glass-panel info-panel" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ backgroundColor: selectedTeam.colors.primary, height: '4px', position: 'absolute', top: 0, left: 0, right: 0 }} />
              
              <div>
                <h3 className="font-display info-title" style={{ 
                  fontSize: '2.5rem', 
                  borderBottom: 'none', 
                  paddingBottom: 0, 
                  marginBottom: 'var(--space-2)',
                  color: selectedTeam.colors.primary,
                  textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                  lineHeight: '1.1'
                }}>
                  {selectedTeam.city} {selectedTeam.name}
                </h3>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
                  {selectedTeam.conference} Conference
                </div>

                <div className="info-stats" style={{ marginTop: 'var(--space-6)', gap: 'var(--space-8)' }}>
                  <div className="stat">
                    <span className="stat-value font-display" style={{ fontSize: '2.5rem' }}>~15</span>
                    <span className="stat-label" style={{ fontSize: '0.75rem' }}>Est OVR</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value font-display" style={{ fontSize: '2.5rem' }}>D</span>
                    <span className="stat-label" style={{ fontSize: '0.75rem' }}>Tier</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleStart} 
                className="action-btn"
                style={{ 
                  marginTop: 'var(--space-8)', 
                  width: '100%', 
                  justifyContent: 'space-between',
                  backgroundColor: selectedTeam.colors.primary,
                  color: '#fff',
                  border: 'none',
                  padding: 'var(--space-4) var(--space-6)'
                }}
                onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.2)'}
                onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
              >
                Sign Contract
                <ChevronRight size={24} />
              </button>
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
