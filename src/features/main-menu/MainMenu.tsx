import React from 'react';
import { Button } from '../../components/Button';
import './MainMenu.css';
import { Trophy, Users, Settings, Play, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export const MainMenu: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'pt' : 'en');
  };

  return (
    <div className="main-menu-container">
      {/* Elemento de fundo abstrato para dar clima */}
      <div className="ice-glow"></div>
      
      <div style={{ position: 'absolute', top: 32, right: 32, zIndex: 10 }}>
        <Button size="sm" variant="secondary" onClick={toggleLanguage}>
          <Globe size={16} style={{marginRight: 8}} />
          {t('menu.languageToggle')}
        </Button>
      </div>

      <div className="main-menu-content layout-asymmetric">
        {/* Esquerda: Conteúdo Principal */}
        <div className="menu-left">
          <header className="game-header">
            <h2 className="game-subtitle">{t('menu.subtitle')}</h2>
            <h1 className="game-title font-display">{t('menu.title')}</h1>
          </header>

          <div className="menu-actions">
            <Button size="lg" className="action-btn" onClick={() => navigate('/select-team')}>
              <Play size={24} className="btn-icon" />
              {t('menu.newFranchise')}
            </Button>
            <Button size="lg" variant="secondary" className="action-btn">
              <Users size={24} className="btn-icon" />
              {t('menu.loadGame')}
            </Button>
            <Button size="lg" variant="secondary" className="action-btn">
              <Trophy size={24} className="btn-icon" />
              {t('menu.hallOfFame')}
            </Button>
            <Button size="lg" variant="secondary" className="action-btn">
              <Settings size={24} className="btn-icon" />
              {t('menu.settings')}
            </Button>
          </div>
        </div>

        {/* Direita: Painel Glassmorphism de Informações (Assimetria) */}
        <div className="menu-right">
          <div className="glass-panel info-panel">
            <h3 className="font-display info-title">{t('menu.latestUpdateTitle')}</h3>
            <p className="info-text">
              <strong>{t('menu.latestUpdateVersion')}</strong><br/>
              {t('menu.latestUpdateText')}
            </p>
            <div className="info-stats">
              <div className="stat">
                <span className="stat-value font-display">20</span>
                <span className="stat-label">{t('menu.statsTeams')}</span>
              </div>
              <div className="stat">
                <span className="stat-value font-display">1</span>
                <span className="stat-label">{t('menu.statsLeagues')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
