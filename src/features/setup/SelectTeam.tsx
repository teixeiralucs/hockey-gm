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
    <div className="select-team-container">
      {/* Botão de Voltar */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={() => navigate('/')} className="back-btn">
          <ArrowLeft size={16} style={{ marginRight: '8px' }} />
          Back to Menu
        </button>
      </div>

      <div className="layout-asymmetric">
        {/* Coluna Esquerda (Listagem) */}
        <div className="team-list-col">
          <header className="screen-header">
            <h2 className="screen-eyebrow">Franchise Selection</h2>
            <h1 className="screen-title">{ohl.name}</h1>
            <p className="screen-stats">{t('menu.statsTeams')}: {allTeams.length} | Tier: {ohl.tier}</p>
          </header>

          <div className="team-list custom-scrollbar">
            {allTeams.map(team => {
              const isSelected = selectedTeam?.id === team.id;
              return (
                <div 
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`team-card ${isSelected ? 'selected' : ''}`}
                >
                  {/* Acento da cor do time */}
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
                      <span className="stat-label">Tier</span>
                      <span className="stat-value">D</span>
                    </div>
                    <div className="stat-block">
                      <span className="stat-label">EST OVR</span>
                      <span className="stat-value highlight">~15</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita (Detalhes táticos) */}
        <div className="team-details-col">
          {selectedTeam ? (
            <div className="details-panel">
              {/* Linha topo cor do time */}
              <div className="details-accent-top" style={{ backgroundColor: selectedTeam.colors.primary }} />
              
              <h2 className="details-title">{selectedTeam.name}</h2>
              <h3 className="details-subtitle">{selectedTeam.city}</h3>

              <div className="details-info-list">
                <div className="info-item">
                  <Shield className="info-item-icon" size={18} />
                  <span className="info-item-text">
                    Primary: <span style={{ color: selectedTeam.colors.primary }}>{selectedTeam.colors.primary}</span>
                  </span>
                </div>
                <div className="info-item">
                  <Activity className="info-item-icon" size={18} />
                  <span className="info-item-text">Conference: {selectedTeam.conference}</span>
                </div>
              </div>

              <button onClick={handleStart} className="sign-btn">
                Sign Contract
                <ChevronRight size={24} />
              </button>
            </div>
          ) : (
            <div className="empty-panel">
              <span className="empty-text">Select a franchise to view details</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
