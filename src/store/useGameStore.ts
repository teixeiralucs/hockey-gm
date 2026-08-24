import { create } from 'zustand';
import { League } from '../engine/models/League';
import { Team } from '../engine/models/Team';

interface GameState {
  // Global State
  currentLeague: League | null;
  playerTeam: Team | null;
  currentDate: string; 
  
  // Actions
  startNewGame: (leagueId: string, teamId: string) => void;
  advanceDay: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentLeague: null,
  playerTeam: null,
  currentDate: "2026-09-15", // Início de temporada aproximado
  
  startNewGame: (leagueId, teamId) => {
    // TODO: Usar o PlayerGenerator para preencher a liga e encontrar o teamId
    // Por enquanto, placeholder para ligar à UI.
    console.log(`Starting game in league ${leagueId} with team ${teamId}`);
  },

  advanceDay: () => set((state) => {
    const nextDate = new Date(state.currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    return { currentDate: nextDate.toISOString().split('T')[0] };
  })
}));
