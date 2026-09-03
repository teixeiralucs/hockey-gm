import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Player } from '../../../engine/models/Player';
import { useGameStore } from '../../../store/useGameStore';
import './PlayerCard.css';

interface PlayerCardProps {
  player: Player;
  isBench?: boolean;
  onClick?: () => void;
}

const getFallbackImage = (name: string) => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e293b&color=fff&size=256`;
};

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, isBench, onClick }) => {
  const { currentLeague, playerTeam } = useGameStore();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
    data: { player, isBench }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 999 : undefined,
  } : undefined;

  // Determinar buff/debuff
  let buffStatus = '';
  if (player.currentOverall > player.baseOverall) buffStatus = 'buffed';
  if (player.currentOverall < player.baseOverall) buffStatus = 'debuffed';

  let originalTeam: any = null;
  currentLeague?.conferences.forEach(c => c.divisions.forEach(d => d.teams.forEach(t => {
    if (t.abbreviation === player.teamAbbr) {
      originalTeam = t;
    }
  })));

  return (
    <div 
      ref={setNodeRef} 
      className={`player-card tier-${player.tier.toLowerCase()} ${isDragging ? 'dragging' : ''} ${isBench ? 'bench-card' : ''}`}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Prevent drag click from triggering click
        if (!isDragging && onClick) {
          onClick();
        }
      }}
    >
      <div className="player-photo-bg">
        <img 
          src={player.photo || getFallbackImage(player.fullName)} 
          onError={(e) => { e.currentTarget.src = getFallbackImage(player.fullName); }}
          alt={player.lastName} 
          draggable="false" 
        />
        <div className="photo-gradient-overlay"></div>
      </div>

      <div className="card-inner-frame">
        {/* Top Left League Logo */}
        <div className="league-logo">
          {currentLeague && currentLeague.logoUrl ? (
            <img src={currentLeague.logoUrl} alt={currentLeague.name} />
          ) : (
            <img src="/assets/logos/leagues/ohl-logo.svg" alt="OHL" />
          )}
        </div>
        
        {/* Bottom Left Info */}
        <div className="player-info-ref">
          <span className="player-first-name">{player.firstName}</span>
          <span className="player-last-name">{player.lastName}</span>
          <div className="player-team-pos">
            <span className="team-name" style={{ color: originalTeam?.colors?.primary || 'var(--tier-color)' }}>
              {originalTeam?.name || 'FREE AGENT'}
            </span>
            <span className="pos-label">{player.position}</span>
          </div>
        </div>

        {/* Bottom Right Diamond */}
        <div className="card-diamond-ovr">
          <div className={`diamond-inner ${buffStatus}`}>
            {player.currentOverall}
          </div>
        </div>

        {/* Top Right Draft Pick Diamond */}
        {player.draftPick && (
          <div className="card-diamond-draft">
            <div className="diamond-inner">
              #{player.draftPick}
            </div>
          </div>
        )}

        {/* Geometric Overlay Lines */}
        <svg className="geometric-overlay" viewBox="0 0 100 133" preserveAspectRatio="none">
          {/* Top Left Angle */}
          <polyline points="0,30 20,45 20,0" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          <polyline points="0,35 25,55 25,0" fill="none" stroke="var(--tier-color)" strokeWidth="0.5" />
          {/* Bottom Left Angle */}
          <polyline points="0,103 20,88 20,133" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          <polyline points="0,98 25,78 25,133" fill="none" stroke="var(--tier-color)" strokeWidth="0.5" />
          {/* Bottom Right Angle */}
          <polyline points="100,103 80,88 80,133" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          <polyline points="100,98 75,78 75,133" fill="none" stroke="var(--tier-color)" strokeWidth="0.5" />
          {/* Top Right Cut (Around Diamond) */}
          <polyline points="100,30 80,45 80,0" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
        </svg>
      </div>
      
      {/* Detalhes hover */}
      <div className="player-stats-hover">
        <div className="stat-row">
          <span>SKT</span>
          <span>{player.attributes.skating.total}</span>
        </div>
        <div className="stat-row">
          <span>SHT</span>
          <span>{player.attributes.shooting.total}</span>
        </div>
        <div className="stat-row">
          <span>DEF</span>
          <span>{player.attributes.defense.total}</span>
        </div>
        <div className="stat-row">
          <span>IQ</span>
          <span>{player.attributes.creativity.total}</span>
        </div>
      </div>
    </div>
  );
};
