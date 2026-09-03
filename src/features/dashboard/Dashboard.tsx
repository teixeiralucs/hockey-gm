import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Play, FastForward, ArrowRight } from 'lucide-react';
import { Button } from '../../components/Button';
import './Dashboard.css';
import './DashboardMatches.css';

export const Dashboard: React.FC = () => {
  const { playerTeam } = useGameStore();
  
  // Usar o playerTeam diretamente do store
  const team = playerTeam;

  // Fallbacks de Placeholder caso recarregue a página sem store setado
  const pTeamName = team ? `${team.city} ${team.name}` : 'MOCK TEAM';
  const pLogo = team ? team.logoUrl : '';
  const pColor = team ? team.colors.primary : '#00ffd0';
  const pAbbr = team?.abbreviation || 'YOU';
  const pRecord = "0-0-0";

  // Mock de próximas partidas (Mantemos 4 no array para a animação)
  const [matches, setMatches] = useState([
    { id: 1, opponent: 'LONDON KNIGHTS', abbr: 'LDN', date: 'OCT 12, 2026 - 19:00', status: 'upcoming', result: null, home: true },
    { id: 2, opponent: 'KITCHENER RANGERS', abbr: 'KIT', date: 'OCT 14, 2026 - 19:30', status: 'upcoming', result: null, home: false },
    { id: 3, opponent: 'WINDSOR SPITFIRES', abbr: 'WSR', date: 'OCT 16, 2026 - 19:00', status: 'upcoming', result: null, home: true },
    { id: 4, opponent: 'GUELPH STORM', abbr: 'GUE', date: 'OCT 18, 2026 - 19:00', status: 'upcoming', result: null, home: false },
  ]);
  const [animating, setAnimating] = useState(false);

  const handleSimulate = (matchId: number) => {
    setMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        return { ...m, status: 'finished', result: { us: Math.floor(Math.random() * 5) + 1, them: Math.floor(Math.random() * 5) } };
      }
      return m;
    }));
  };

  const handleAdvance = () => {
    setAnimating(true);
    setTimeout(() => {
      setMatches(prev => {
        const newMatches = [...prev.slice(1)];
        // Add a new random match to the end
        newMatches.push({
          id: Date.now(),
          opponent: 'SAGINAW SPIRIT',
          abbr: 'SAG',
          date: 'OCT 20, 2026 - 19:00',
          status: 'upcoming',
          result: null,
          home: Math.random() > 0.5
        });
        return newMatches;
      });
      setAnimating(false);
    }, 500); // tempo da transição css
  };

  return (
    <div className="dashboard-grid">
      {/* Coluna Principal */}
      <div className="dashboard-col">
        {/* Header do Time */}
        <div className="dash-panel team-header-panel">
          {team && <div style={{ backgroundColor: pColor, height: '100%', width: '4px', position: 'absolute', top: 0, left: 0 }} />}
          
          {pLogo ? (
            <img src={pLogo} alt="Team Logo" className="team-header-logo" />
          ) : (
            <div className="team-header-logo" style={{ background: '#333', width: '120px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>LOGO</div>
          )}
          
          <div className="team-header-info">
            <h1>{pTeamName}</h1>
            <div className="team-header-stats">
              <div className="stat-block">
                <span className="stat-label" style={{ fontSize: '0.625rem' }}>RECORD</span>
                <span className="stat-value font-display" style={{ fontSize: '1.5rem', color: pColor }}>{pRecord}</span>
              </div>
              <div className="stat-block">
                <span className="stat-label" style={{ fontSize: '0.625rem' }}>EST OVR</span>
                <span className="stat-value font-display" style={{ fontSize: '1.5rem' }}>15</span>
              </div>
              <div className="stat-block">
                <span className="stat-label" style={{ fontSize: '0.625rem' }}>SALARY CAP</span>
                <span className="stat-value font-mono" style={{ fontSize: '1.25rem', paddingBottom: '4px' }}>$12.5M</span>
              </div>
            </div>
          </div>
        </div>

        {/* Próximos Jogos (Cards Horizontais) */}
        <div>
          <h2 className="dash-panel-title" style={{ marginBottom: 'var(--space-4)' }}>UPCOMING MATCHES</h2>
          <div className="matches-row">
            {matches.map((match, index) => {
              // Determinar o estado de animação das cartas
              let cardClass = '';
              if (animating) {
                if (index === 0) cardClass = 'match-card-leaving'; // Sai da tela (encolhendo)
                else if (index === 1) cardClass = 'match-card-primary'; // Fica grande (era index 1, vai virar 0)
                else if (index === 3) cardClass = 'match-card-entering'; // Entra na tela (crescendo)
              } else {
                if (index === 0) cardClass = 'match-card-primary'; // Padrão
                else if (index === 3) cardClass = 'match-card-hidden'; // Esconde a 4ª carta até precisar animar
              }

              const isFinished = match.status === 'finished';

              return (
                <div key={match.id} className={`dash-panel match-card ${cardClass}`}>
                  {/* Top Bar */}
                  <div className="match-card-top">
                    <span style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{match.date}</span>
                    <span className="match-card-badge">OHL REGULAR</span>
                  </div>

                  {/* Matchup */}
                  <div className="match-card-teams">
                    <div className="match-team">
                      <div className="match-logo-box" style={{ borderColor: match.home ? pColor : 'rgba(255,255,255,0.1)' }}>
                        {match.home ? (pLogo ? <img src={pLogo} alt="Us" /> : <div className="placeholder-logo">{pAbbr}</div>) : <div className="placeholder-logo">{match.abbr}</div>}
                      </div>
                      <span className="match-team-name">{match.home ? pAbbr : match.abbr}</span>
                    </div>

                    <div className="match-score">
                      {isFinished ? (
                        <div className="score-display">
                          <span style={{ color: match.result.us > match.result.them ? pColor : '#fff' }}>{match.home ? match.result.us : match.result.them}</span>
                          <span>-</span>
                          <span style={{ color: match.result.them > match.result.us ? '#ec2634' : '#fff' }}>{match.home ? match.result.them : match.result.us}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>VS</span>
                      )}
                    </div>

                    <div className="match-team">
                      <div className="match-logo-box" style={{ borderColor: !match.home ? pColor : 'rgba(255,255,255,0.1)' }}>
                        {!match.home ? (pLogo ? <img src={pLogo} alt="Us" /> : <div className="placeholder-logo">{pAbbr}</div>) : <div className="placeholder-logo">{match.abbr}</div>}
                      </div>
                      <span className="match-team-name">{!match.home ? pAbbr : match.abbr}</span>
                    </div>
                  </div>

                  {/* Actions (Only on first card) */}
                  {index === 0 && (
                    <div className="match-card-actions">
                      {isFinished ? (
                        <Button 
                          style={{ width: '100%', justifyContent: 'center', backgroundColor: '#fff', color: '#000', border: 'none' }}
                          onClick={handleAdvance}
                        >
                          ADVANCE TO NEXT MATCH <ArrowRight size={16} style={{ marginLeft: '8px' }} />
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="primary" 
                            style={{ flex: 1, justifyContent: 'center', color: pColor, borderColor: pColor, boxShadow: `0 0 10px ${pColor}40`, backgroundColor: '#111114' }}
                          >
                            <Play size={16} style={{ marginRight: '8px' }} /> PLAY
                          </Button>
                          <Button 
                            variant="secondary"
                            style={{ flex: 1, justifyContent: 'center', color: playerTeam?.colors.secondary || '#fff', borderColor: playerTeam?.colors.secondary || '#fff', backgroundColor: '#111114' }}
                            onClick={() => handleSimulate(match.id)}
                          >
                            <FastForward size={16} style={{ marginRight: '8px' }} /> SIMULATE
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Coluna Secundária */}
      <div className="dashboard-col">
        {/* Lineup Rápido */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <h2 className="dash-panel-title">LINEUP STRENGTH</h2>
          </div>
          
          <table className="data-table">
            <thead>
              <tr>
                <th>LINE</th>
                <th style={{ textAlign: 'right' }}>OVR</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Line 1</td>
                <td className="numeric" style={{ color: pColor }}>18</td>
              </tr>
              <tr>
                <td>Line 2</td>
                <td className="numeric">15</td>
              </tr>
              <tr>
                <td>Line 3</td>
                <td className="numeric">13</td>
              </tr>
              <tr>
                <td>Line 4</td>
                <td className="numeric" style={{ color: 'var(--color-text-muted)' }}>11</td>
              </tr>
              <tr>
                <td style={{ paddingTop: 'var(--space-4)' }}>Defense 1</td>
                <td className="numeric" style={{ paddingTop: 'var(--space-4)', color: pColor }}>17</td>
              </tr>
              <tr>
                <td>Defense 2</td>
                <td className="numeric">14</td>
              </tr>
              <tr>
                <td>Goalie</td>
                <td className="numeric" style={{ color: pColor }}>19</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Division Standings */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <h2 className="dash-panel-title">DIVISION STANDINGS</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>TEAM</th>
                <th style={{ textAlign: 'right' }}>PTS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ color: pColor }}>{team?.abbreviation || 'YOU'}</td>
                <td className="numeric">0</td>
              </tr>
              <tr>
                <td>LDN</td>
                <td className="numeric">0</td>
              </tr>
              <tr>
                <td>KIT</td>
                <td className="numeric">0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
