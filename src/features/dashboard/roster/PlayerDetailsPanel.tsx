import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Player } from '../../../engine/models/Player';
import { useGameStore } from '../../../store/useGameStore';
import './PlayerDetailsPanel.css';

interface PlayerDetailsPanelProps {
  player: Player;
  onBack: () => void;
}

// Function to map Hometown string to a Flag emoji
const getFlagFromHometown = (hometown: string): string => {
  if (!hometown) return '🇺🇸'; // default to USA if missing

  const canadianProvinces = ['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE'];
  const ht = hometown.toUpperCase();

  // Se tiver vírgula, checamos o estado/país após a vírgula
  if (ht.includes(',')) {
    const parts = ht.split(',');
    const region = parts[parts.length - 1].trim();

    if (canadianProvinces.includes(region)) {
      return '🇨🇦';
    }
    // Check specific European countries often found in CHL
    const europeMap: Record<string, string> = {
      'CZECHIA': '🇨🇿', 'CZECH REPUBLIC': '🇨🇿',
      'RUSSIA': '🇷🇺',
      'SWEDEN': '🇸🇪',
      'FINLAND': '🇫🇮',
      'SLOVAKIA': '🇸🇰',
      'GERMANY': '🇩🇪',
      'SWITZERLAND': '🇨🇭',
      'LATVIA': '🇱🇻',
      'BELARUS': '🇧🇾'
    };
    
    if (europeMap[region]) return europeMap[region];
    
    // Assume USA otherwise
    return '🇺🇸';
  }

  return '🇺🇸';
};

const getFullPosition = (pos: string) => {
  const map: Record<string, string> = {
    'C': 'Center',
    'LW': 'Left Wing',
    'RW': 'Right Wing',
    'LD': 'Left Defense',
    'RD': 'Right Defense',
    'G': 'Goalie'
  };
  return map[pos] || pos;
};

const getTierColorClass = (tier: string) => {
  switch(tier.toLowerCase()) {
    case 'bronze': return 'text-bronze';
    case 'silver': return 'text-silver';
    case 'gold': return 'text-gold';
    case 'diamond': return 'text-diamond';
    default: return 'text-white';
  }
};

const getTierColorHex = (tier: string) => {
  switch(tier.toLowerCase()) {
    case 'bronze': return '#cd7f32';
    case 'silver': return '#c0c0c0';
    case 'gold': return '#ffd700';
    case 'diamond': return '#4b9cff';
    default: return '#fff';
  }
};

const getFallbackImage = (name: string) => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e293b&color=fff&size=256`;
};

export const PlayerDetailsPanel: React.FC<PlayerDetailsPanelProps> = ({ player, onBack }) => {
  const { currentLeague } = useGameStore();

  let originalTeam: any = null;
  currentLeague?.conferences.forEach(c => c.divisions.forEach(d => d.teams.forEach(t => {
    if (t.abbreviation === player.teamAbbr) {
      originalTeam = t;
    }
  })));

  const flagEmoji = getFlagFromHometown(player.hometown);
  
  // Format attributes for Recharts
  const chartData = [
    { name: 'Skating', value: player.attributes.skating.total, full: 20 },
    { name: 'Shooting', value: player.attributes.shooting.total, full: 20 },
    { name: 'Defense', value: player.attributes.defense.total, full: 20 },
    { name: 'Creativity', value: player.attributes.creativity.total, full: 20 },
  ];

  // Determine buffs/debuffs explanation
  let buffMessage = null;
  const isBuffed = player.currentOverall > player.baseOverall;
  const isDebuffed = player.currentOverall < player.baseOverall;

  if (isBuffed) {
    buffMessage = <div className="buff-msg positive">Player is experiencing a synergy boost (+20% Franchise or Position)!</div>;
  } else if (isDebuffed) {
    buffMessage = <div className="buff-msg negative">Player is struggling (-25% Wrong Position)!</div>;
  } else {
    buffMessage = <div className="buff-msg neutral">Playing at base potential.</div>;
  }

  // Se o jogador estiver no banco, o currentOverall será sempre igual ao baseOverall.
  const isBench = player.currentLine === null || player.currentLine === undefined;

  return (
    <div className="player-details-panel">
      {/* Header */}
      <button className="back-btn" onClick={onBack}>
        <ChevronLeft size={20} /> Back to team
      </button>

      {/* Top Profile Area (Image + Info) */}
      <div className="profile-header-area">
        <div className={`hero-section tier-${player.tier.toLowerCase()}`}>
          <img 
            src={player.photo || getFallbackImage(player.fullName)} 
            onError={(e) => { e.currentTarget.src = getFallbackImage(player.fullName); }}
            alt={player.fullName} 
            className="hero-photo" 
          />
          <div className="hero-gradient"></div>
          {player.draftPick && (
            <div className="draft-badge">#{player.draftPick}</div>
          )}
        </div>

        <div className="profile-info-section">
          {/* Name & Basic Title */}
          <div className="title-section">
            <h2 className={`player-name ${getTierColorClass(player.tier)}`}>{player.fullName}</h2>
            <div className="subtitle-row">
              <span className="subtitle-pos">{getFullPosition(player.position)}</span>
              <span className="subtitle-points">
                {player.stats?.points || 0} Points / {player.stats?.goals || 0} Goals
              </span>
            </div>
          </div>

          {/* Pills */}
          <div className="pills-section">
            <div className="info-pill team-pill" style={{ borderColor: originalTeam?.colors?.primary || '#555' }}>
              {originalTeam?.logoUrl && <img src={originalTeam.logoUrl} alt="Team" />}
              <span>{originalTeam?.name || 'FREE AGENT'}</span>
            </div>
            <div className="info-pill country-pill">
              <span className="flag-emoji">{flagEmoji}</span>
              <span>{player.hometown}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Block */}
      <div className="stats-block">
        <div className="stat-line">
          <span className="stat-label">AGE</span>
          <span className="stat-value">{player.age} Years</span>
        </div>
        <div className="stat-line">
          <span className="stat-label">HEIGHT</span>
          <span className="stat-value">{player.height}"</span>
        </div>
        <div className="stat-line">
          <span className="stat-label">WEIGHT</span>
          <span className="stat-value">{player.weight} lbs</span>
        </div>
        <div className="stat-line">
          <span className="stat-label">GAMES PLAYED</span>
          <span className="stat-value">--</span>
        </div>
        <div className="stat-line">
          <span className="stat-label">GOALS</span>
          <span className="stat-value">{player.stats?.goals || 0}</span>
        </div>
        <div className="stat-line">
          <span className="stat-label">ASSISTS</span>
          <span className="stat-value">{player.stats?.assists || 0}</span>
        </div>
      </div>

      {/* Attributes & Buffs Block */}
      <div className="chart-block">
        <div className="chart-header">
          <h3 className="chart-title">Attributes</h3>
          <div className="ovr-display">
            <span className="ovr-label">OVR</span>
            <span className={`ovr-value ${isBuffed ? 'text-green' : isDebuffed ? 'text-red' : ''}`}>
              {player.currentOverall}
            </span>
          </div>
        </div>
        
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <XAxis type="number" domain={[0, 20]} hide />
              <YAxis type="category" dataKey="name" width={75} axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12, fontWeight: 700 }} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#111', border: 'none', borderRadius: '4px', fontWeight: 700 }} />
              <Bar dataKey="value" fill={getTierColorHex(player.tier)} radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {!isBench && buffMessage}
        {isBench && <div className="buff-msg neutral">Benched players play at base potential.</div>}
      </div>
    </div>
  );
};
