import type { Player } from './Player';

export interface RosterLines {
  forwards: {
    line1: [Player | null, Player | null, Player | null]; // LW, C, RW
    line2: [Player | null, Player | null, Player | null];
    line3: [Player | null, Player | null, Player | null];
    line4: [Player | null, Player | null, Player | null];
  };
  defense: {
    line1: [Player | null, Player | null]; // LD, RD
    line2: [Player | null, Player | null];
    line3: [Player | null, Player | null];
  };
  goalies: {
    starter: Player | null;
    backup: Player | null;
  };
}

export interface TeamColors {
  primary: string;
  secondary: string;
}

export interface Team {
  id: string;
  city: string; // Ex: 'Barrie'
  name: string; // Ex: 'Colts'
  abbreviation: string; // Ex: 'BAR'
  conference: string;
  
  colors: TeamColors;
  logoUrl?: string;
  
  // Lista raw de jogadores pertencentes ao time
  players: Player[];
  
  // Jogadores organizados em linhas (20 vestidos para jogo: 12F, 6D, 2G)
  lines: RosterLines;
  
  // Banco de reservas
  bench: Player[];
}
