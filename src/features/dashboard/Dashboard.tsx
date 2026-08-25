import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Play } from 'lucide-react';
import { Button } from '../../components/Button';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { playerTeam } = useGameStore();
  
  // Usar o playerTeam diretamente do store
  const team = playerTeam;

  // Fallbacks de Placeholder caso recarregue a página sem store setado
  const pTeamName = team ? `${team.city} ${team.name}` : 'MOCK TEAM';
  const pLogo = team ? team.logoUrl : '';
  const pColor = team ? team.colors.primary : '#00ffd0';
  const pRecord = "0-0-0";
  const pNextOpponent = "LONDON KNIGHTS";

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

        {/* Próximo Jogo */}
        <div className="dash-panel" style={{ padding: 'var(--space-8)' }}>
          <div className="dash-panel-header">
            <h2 className="dash-panel-title">NEXT MATCH</h2>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>OCT 12, 2026 - 19:00</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-6)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>OPPONENT</span>
              <h2 className="font-display" style={{ fontSize: '2.5rem', margin: 0, color: '#fff' }}>{pNextOpponent}</h2>
              <span style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: '#ec2634', marginTop: 'var(--space-2)' }}>17 OVR (A)</span>
            </div>
            
            <Button size="lg" variant="primary" style={{ backgroundColor: pColor, border: 'none', color: '#000' }}>
              <Play size={24} style={{ marginRight: '8px' }} />
              SIMULATE MATCH
            </Button>
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
