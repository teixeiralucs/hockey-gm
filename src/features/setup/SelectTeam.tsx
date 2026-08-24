import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Shield, Activity, ArrowLeft } from 'lucide-react';
import type { Team } from '../../engine/models/Team';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col gap-6 font-body">
      
      {/* Botão de Voltar */}
      <div className="flex items-center">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center text-slate-400 hover:text-accent transition-colors duration-150 font-mono text-sm uppercase tracking-widest cursor-pointer"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Menu
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 flex-1">
        {/* Coluna Esquerda (Listagem) - 60% */}
        <div className="flex-1 flex flex-col">
          <header className="mb-6">
            <h2 className="font-mono text-sm tracking-widest text-accent uppercase mb-2">Franchise Selection</h2>
            <h1 className="font-display text-5xl uppercase tracking-wider">{ohl.name}</h1>
            <p className="text-slate-500 font-mono mt-2 text-sm">{t('menu.statsTeams')}: {allTeams.length} | Tier: {ohl.tier}</p>
          </header>

          <div className="flex-1 overflow-y-auto pr-4 space-y-2 pb-8">
            {allTeams.map(team => {
              const isSelected = selectedTeam?.id === team.id;
              return (
                <div 
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`flex border-b border-slate-800 bg-slate-900/40 p-4 transition-colors duration-150 relative cursor-crosshair group ${isSelected ? 'bg-slate-800/80' : 'hover:bg-slate-800/60'}`}
                >
                  {/* Acento da cor do time (fininho na esquerda) */}
                  <div 
                    className={`absolute left-0 top-0 bottom-0 w-1 transition-opacity duration-150 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ backgroundColor: team.colors.primary }}
                  />

                  <div className="flex-1 pl-4 flex flex-col justify-center">
                    <h3 className="text-2xl font-display font-bold uppercase tracking-wide text-slate-100">
                      {team.city} {team.name}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">
                      {team.conference} Conference
                    </span>
                  </div>

                  <div className="flex space-x-8 text-right items-center pr-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">
                        Tier
                      </span>
                      <span className="text-sm font-mono text-slate-300">D</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">
                        EST OVR
                      </span>
                      <span className="text-xl font-mono text-white font-semibold shadow-sm">
                        ~15
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita (Detalhes táticos) - 40% Assimetria */}
        <div className="w-full md:w-96 flex flex-col">
          {selectedTeam ? (
            <div className="bg-slate-900/60 border border-slate-800 p-8 flex flex-col relative h-[500px] mt-[100px]">
              {/* Linha topo cor do time */}
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: selectedTeam.colors.primary }} />
              
              <h2 className="font-display text-4xl uppercase tracking-wider mb-2 mt-4">{selectedTeam.name}</h2>
              <h3 className="font-mono text-sm text-slate-400 mb-8">{selectedTeam.city}</h3>

              <div className="space-y-6 flex-1">
                <div className="flex items-center gap-3">
                  <Shield className="text-slate-500" size={18} />
                  <span className="font-mono text-sm text-slate-300">Primary: <span style={{color: selectedTeam.colors.primary}}>{selectedTeam.colors.primary}</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <Activity className="text-slate-500" size={18} />
                  <span className="font-mono text-sm text-slate-300">Conference: {selectedTeam.conference}</span>
                </div>
              </div>

              <button 
                onClick={handleStart}
                className="mt-8 bg-accent text-slate-950 font-display text-2xl uppercase tracking-wider py-4 px-6 hover:bg-accent-hover transition-colors duration-150 flex items-center justify-between"
              >
                Sign Contract
                <ChevronRight size={24} />
              </button>
            </div>
          ) : (
            <div className="bg-slate-900/20 border border-slate-800/50 p-6 flex flex-col items-center justify-center h-[500px] mt-[100px] text-center">
              <span className="font-mono text-slate-600 text-sm tracking-widest uppercase">Select a franchise to view details</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
