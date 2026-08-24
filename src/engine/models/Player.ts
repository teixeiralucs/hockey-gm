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

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  age: number; // 16 a 20 para júniores
  position: Position;
  role: PlayerRole;
  attributes: PlayerAttributes;
  overall: number;
  tier: 'D' | 'C' | 'B' | 'A' | 'S'; // OHL é D-Tier
}
