import React from 'react';
import { Button } from '../../components/Button';
import './MainMenu.css';
import { Trophy, Users, Settings, Play } from 'lucide-react';

export const MainMenu: React.FC = () => {
  return (
    <div className="main-menu-container">
      {/* Elemento de fundo abstrato para dar clima */}
      <div className="ice-glow"></div>
      
      <div className="main-menu-content layout-asymmetric">
        {/* Esquerda: Conteúdo Principal */}
        <div className="menu-left">
          <header className="game-header">
            <h2 className="game-subtitle">The Ultimate Simulation</h2>
            <h1 className="game-title font-display">Hockey GM</h1>
            <div className="version-badge">v0.7.0 Beta</div>
          </header>

          <div className="menu-actions">
            <Button size="lg" className="action-btn">
              <Play size={24} className="btn-icon" />
              New Franchise
            </Button>
            <Button size="lg" variant="secondary" className="action-btn">
              <Users size={24} className="btn-icon" />
              Load Game
            </Button>
            <Button size="lg" variant="secondary" className="action-btn">
              <Trophy size={24} className="btn-icon" />
              Hall of Fame
            </Button>
            <Button size="lg" variant="secondary" className="action-btn">
              <Settings size={24} className="btn-icon" />
              Settings
            </Button>
          </div>
        </div>

        {/* Direita: Painel Glassmorphism de Informações (Assimetria) */}
        <div className="menu-right">
          <div className="glass-panel info-panel">
            <h3 className="font-display info-title">Latest Update</h3>
            <p className="info-text">
              <strong>Beta 0.7: NHL Expansion</strong><br/>
              Welcome to the big leagues. 32 teams, 84 games, and the ultimate quest for the Stanley Cup.
            </p>
            <div className="info-stats">
              <div className="stat">
                <span className="stat-value font-display">32</span>
                <span className="stat-label">Teams</span>
              </div>
              <div className="stat">
                <span className="stat-value font-display">7</span>
                <span className="stat-label">Leagues</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
