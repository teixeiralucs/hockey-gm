import { create } from 'zustand';
import type { League } from '../engine/models/League';
import type { Team, RosterLines } from '../engine/models/Team';
import type { Player } from '../engine/models/Player';
import { OHL_LEAGUE } from '../engine/data/leagues/ohl';
import { PlayerGenerator } from '../engine/generators/PlayerGenerator';

interface GameState {
  // Global State
  supportedLeagues: League[];
  currentLeague: League | null;
  playerTeam: Team | null;
  currentDate: string; 
  
  // Actions
  startNewGame: (leagueId: string, teamId: string) => Promise<void>;
  advanceDay: () => void;
  updateLines: (newLines: RosterLines, newBench: Player[]) => void;
  clearLines: () => void;
  autoAssignLines: () => void;
}

const recalculateModifiers = (team: Team): Team => {
  team.bench.forEach(p => {
    p.currentOverall = p.baseOverall;
  });

  const evaluatePlayer = (
    player: Player | null, 
    expectedPositions: string[], 
    lineMates: (Player | null)[]
  ) => {
    if (!player) return;
    
    let buffMultiplier = 1.0;
    
    // Position
    if (expectedPositions.includes(player.position)) {
      buffMultiplier += 0.15;
    } else {
      buffMultiplier -= 0.25;
    }

    // Franchise
    if (player.teamAbbr === team.abbreviation) {
      buffMultiplier += 0.20;
    }

    // Chemistry (Goalies don't have linemates here)
    if (lineMates.length > 0) {
      const hasChemistry = lineMates.some(mate => mate && mate.id !== player.id && mate.teamAbbr === player.teamAbbr);
      if (hasChemistry) {
        buffMultiplier += 0.15;
      }
    }

    // Cap at +50%
    if (buffMultiplier > 1.50) buffMultiplier = 1.50;

    player.currentOverall = Math.round(player.baseOverall * buffMultiplier);
  };

  Object.values(team.lines.forwards).forEach(line => {
    evaluatePlayer(line[0], ['LW'], line);
    evaluatePlayer(line[1], ['C'], line);
    evaluatePlayer(line[2], ['RW'], line);
  });

  Object.values(team.lines.defense).forEach(line => {
    evaluatePlayer(line[0], ['LD'], line);
    evaluatePlayer(line[1], ['RD'], line);
  });

  evaluatePlayer(team.lines.goalies.starter, ['G'], []);
  evaluatePlayer(team.lines.goalies.backup, ['G'], []);

  return team;
};

export const useGameStore = create<GameState>((set, get) => ({
  supportedLeagues: [OHL_LEAGUE],
  currentLeague: null,
  playerTeam: null,
  currentDate: "2026-09-15",
  
  startNewGame: async (leagueId, teamId) => {
    const league = get().supportedLeagues.find(l => l.id === leagueId);
    if (!league) return;

    let selectedTeam: Team | null = null;
    
    league.conferences.forEach(c => c.divisions.forEach(d => {
      d.teams.forEach(t => {
        if (t.id === teamId) selectedTeam = t;
      });
    }));

    if (selectedTeam) {
      const teamClone = JSON.parse(JSON.stringify(selectedTeam)) as Team;
      
      const { activeLines, bench } = await PlayerGenerator.generateTeamRoster();
      
      // Quando inicia, TODOS começam no banco. A geração garante os 20 que precisamos.
      const allPlayers = [...activeLines, ...bench].map(p => ({ ...p, currentLine: null }));
      
      teamClone.players = allPlayers;
      teamClone.bench = allPlayers;
      
      teamClone.lines = {
        forwards: {
          line1: [null, null, null],
          line2: [null, null, null],
          line3: [null, null, null],
          line4: [null, null, null],
        },
        defense: {
          line1: [null, null],
          line2: [null, null],
          line3: [null, null],
        },
        goalies: {
          starter: null,
          backup: null
        }
      };
      
      set({ currentLeague: league, playerTeam: teamClone, currentDate: "2026-09-15" });
    }
  },

  clearLines: () => set((state) => {
    if (!state.playerTeam) return state;
    const team = state.playerTeam;
    const clearedTeam = {
      ...team,
      bench: [...team.players].map(p => ({ ...p, currentLine: null })),
      lines: {
        forwards: {
          line1: [null, null, null], line2: [null, null, null], line3: [null, null, null], line4: [null, null, null]
        },
        defense: {
          line1: [null, null], line2: [null, null], line3: [null, null]
        },
        goalies: {
          starter: null, backup: null
        }
      }
    };
    return {
      playerTeam: recalculateModifiers(clearedTeam as Team)
    };
  }),

  autoAssignLines: () => set((state) => {
    if (!state.playerTeam) return state;
    const team = state.playerTeam;
    
    // Separa por posição, ordenando por Overall descrescente
    const forwards = team.players.filter(p => p.role === 'Forward').sort((a,b) => b.baseOverall - a.baseOverall);
    const defense = team.players.filter(p => p.role === 'Defenceman').sort((a,b) => b.baseOverall - a.baseOverall);
    const goalies = team.players.filter(p => p.role === 'Goalie').sort((a,b) => b.baseOverall - a.baseOverall);
    
    // Preenche as linhas buscando quem é a melhor opção para a posição exata, se não houver, pega o melhor disponível daquela role
    const extractBest = (pool: Player[], preferredPos: string) => {
      const idx = pool.findIndex(p => p.position === preferredPos);
      if (idx !== -1) return pool.splice(idx, 1)[0];
      if (pool.length > 0) return pool.splice(0, 1)[0];
      return null;
    };

    const newLines: RosterLines = {
      forwards: {
        line1: [extractBest(forwards, 'LW'), extractBest(forwards, 'C'), extractBest(forwards, 'RW')],
        line2: [extractBest(forwards, 'LW'), extractBest(forwards, 'C'), extractBest(forwards, 'RW')],
        line3: [extractBest(forwards, 'LW'), extractBest(forwards, 'C'), extractBest(forwards, 'RW')],
        line4: [extractBest(forwards, 'LW'), extractBest(forwards, 'C'), extractBest(forwards, 'RW')]
      },
      defense: {
        line1: [extractBest(defense, 'LD'), extractBest(defense, 'RD')],
        line2: [extractBest(defense, 'LD'), extractBest(defense, 'RD')],
        line3: [extractBest(defense, 'LD'), extractBest(defense, 'RD')]
      },
      goalies: {
        starter: extractBest(goalies, 'G'),
        backup: extractBest(goalies, 'G')
      }
    };

    // Todo mundo que sobrou fica no banco
    const newBench = [...forwards, ...defense, ...goalies];

    const newTeam = {
      ...team,
      lines: newLines,
      bench: newBench
    } as Team;

    return {
      playerTeam: recalculateModifiers(newTeam)
    };
  }),

  updateLines: (newLines, newBench) => set((state) => {
    if (!state.playerTeam) return state;
    const newTeam = {
      ...state.playerTeam,
      lines: newLines,
      bench: newBench
    } as Team;

    return {
      playerTeam: recalculateModifiers(newTeam)
    };
  }),

  advanceDay: () => set((state) => {
    const nextDate = new Date(state.currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    return { currentDate: nextDate.toISOString().split('T')[0] };
  })
}));
