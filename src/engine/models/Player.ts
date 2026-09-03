export type ForwardPosition = 'C' | 'LW' | 'RW';
export type DefensePosition = 'LD' | 'RD';
export type GoaliePosition = 'G';
export type Position = ForwardPosition | DefensePosition | GoaliePosition;

export type PlayerRole = 'Forward' | 'Defenceman' | 'Goalie';

export interface PlayerCategoryAttr {
  value1: number; // e.g. Speed, Vision, Power, Hitting
  value2: number; // e.g. Agility, IQ, Accuracy, Positioning
  total: number;
}

export interface PlayerAttributes {
  skating: PlayerCategoryAttr;    // Speed + Agility
  creativity: PlayerCategoryAttr; // Vision + IQ
  shooting: PlayerCategoryAttr;   // Power + Accuracy
  defense: PlayerCategoryAttr;    // Hitting + Positioning
}

export interface PlayerStats {
  points: number;
  goals: number;
  assists: number;
  wins?: number;
  gaa?: number;
  svPct?: number;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  age: number;
  position: Position;
  role: PlayerRole;
  
  // Real Info
  height: string;
  weight: string;
  hometown: string;
  photo: string;
  shootsCatches: string;
  teamAbbr: string;
  
  stats: PlayerStats;
  attributes: PlayerAttributes;
  
  baseOverall: number;
  currentOverall: number;
  
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  draftPick?: number;
  
  // Placement
  currentLine?: number | null; // 1, 2, 3, 4 (null = bench)
}
