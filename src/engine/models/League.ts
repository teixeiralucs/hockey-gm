import type { Team } from './Team';

export type LeagueTier = 'S' | 'A' | 'B' | 'C' | 'D';

export interface Division {
  id: string;
  name: string;
  teams: Team[];
}

export interface Conference {
  id: string;
  name: string;
  divisions: Division[];
}

export interface League {
  id: string;
  name: string;
  tier: LeagueTier;
  conferences: Conference[];
  totalGames: number; // e.g., 68 for OHL, 84 for NHL
  colors: {
    primary: string;
    secondary: string;
  };
}
