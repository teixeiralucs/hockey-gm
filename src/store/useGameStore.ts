import { create } from 'zustand';
import { League } from '../engine/models/League';
import { Team } from '../engine/models/Team';
import { OHL_LEAGUE } from '../engine/data/leagues/ohl';
import { PlayerGenerator } from '../engine/generators/PlayerGenerator';

interface GameState {
  // Global State
  supportedLeagues: League[];
  currentLeague: League | null;
  playerTeam: Team | null;
  currentDate: string; 
  
  // Actions
  startNewGame: (leagueId: string, teamId: string) => void;
  advanceDay: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  supportedLeagues: [OHL_LEAGUE], // Mais ligas podem ser injetadas aqui
  currentLeague: null,
  playerTeam: null,
  currentDate: "2026-09-15", // Início de temporada aproximado
  
  startNewGame: (leagueId, teamId) => {
    const league = get().supportedLeagues.find(l => l.id === leagueId);
    if (!league) return;

    let selectedTeam: Team | null = null;
    
    // Procura o time e, em um jogo real, populariamos todos os times da liga.
    // Para simplificar a store e poupar memória, aqui populamos só o time escolhido.
    league.conferences.forEach(c => c.divisions.forEach(d => {
      d.teams.forEach(t => {
        if (t.id === teamId) selectedTeam = t;
      });
    }));

    if (selectedTeam) {
      // Clona o time para não mutar a base de dados
      const teamClone = JSON.parse(JSON.stringify(selectedTeam)) as Team;
      
      // Gera o elenco base (20 jogadores: 12F, 6D, 2G + extras para o banco)
      for (let i = 0; i < 14; i++) teamClone.players.push(PlayerGenerator.generateDTierPlayer('C')); // Falso genérico para encher, o gerador randomiza pos
      // Idealmente geraríamos com as posições certas ou deixaríamos o PlayerGenerator.randomPosition tratar tudo
      teamClone.players = []; // Reset do mock, vamos fazer certo:
      for(let i=0; i<30; i++) {
        teamClone.players.push(PlayerGenerator.generateDTierPlayer());
      }
      
      // TODO: Auto-assign lines e mandar pro banco
      teamClone.bench = [...teamClone.players];
      
      set({ currentLeague: league, playerTeam: teamClone, currentDate: "2026-09-15" });
    }
  },

  advanceDay: () => set((state) => {
    const nextDate = new Date(state.currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    return { currentDate: nextDate.toISOString().split('T')[0] };
  })
}));
