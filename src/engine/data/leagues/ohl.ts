import { League, Conference, Division } from '../../models/League';
import { Team } from '../../models/Team';

// Helper for generating an empty team state (roster will be populated later by generators)
function createEmptyTeam(
  id: string,
  city: string,
  name: string,
  abbreviation: string,
  conference: string,
  primaryColor: string,
  secondaryColor: string
): Team {
  return {
    id,
    city,
    name,
    abbreviation,
    conference,
    colors: { primary: primaryColor, secondary: secondaryColor },
    players: [],
    lines: {
      forwards: { line1: [null, null, null], line2: [null, null, null], line3: [null, null, null], line4: [null, null, null] },
      defense: { line1: [null, null], line2: [null, null], line3: [null, null] },
      goalies: { starter: null, backup: null },
    },
    bench: [],
  };
}

export const OHL_EAST_TEAMS: Team[] = [
  createEmptyTeam('brantford-bulldogs', 'Brantford', 'Bulldogs', 'BBD', 'East', '#fcc82d', '#010101'),
  createEmptyTeam('barrie-colts', 'Barrie', 'Colts', 'BAR', 'East', '#ec2634', '#001c63'),
  createEmptyTeam('ottawa-67s', 'Ottawa', "67's", 'OTT', 'East', '#ab1b2c', '#010101'),
  createEmptyTeam('peterborough-petes', 'Peterborough', 'Petes', 'PET', 'East', '#74253f', '#010101'),
  createEmptyTeam('north-bay-battalion', 'North Bay', 'Battalion', 'NBY', 'East', '#fcd93b', '#010101'),
  createEmptyTeam('kingston-frontenacs', 'Kingston', 'Frontenacs', 'KGN', 'East', '#cda435', '#010101'),
  createEmptyTeam('niagara-icedogs', 'Niagara', 'IceDogs', 'NIA', 'East', '#e31a35', '#010101'),
  createEmptyTeam('sudbury-wolves', 'Sudbury', 'Wolves', 'SUD', 'East', '#9fa8ab', '#045ea4'),
  createEmptyTeam('brampton-steelheads', 'Brampton', 'Steelheads', 'BRA', 'East', '#a7aaac', '#002868'),
  createEmptyTeam('oshawa-generals', 'Oshawa', 'Generals', 'OSH', 'East', '#e51937', '#041e43'),
];

export const OHL_WEST_TEAMS: Team[] = [
  createEmptyTeam('kitchener-rangers', 'Kitchener', 'Rangers', 'KIT', 'West', '#0460ac', '#e31e37'),
  createEmptyTeam('windsor-spitfires', 'Windsor', 'Spitfires', 'WSR', 'West', '#e51e25', '#10284b'),
  createEmptyTeam('flint-firebirds', 'Flint', 'Firebirds', 'FLNT', 'West', '#f48226', '#002d62'),
  createEmptyTeam('london-knights', 'London', 'Knights', 'LDN', 'West', '#005030', '#f4cb55'),
  createEmptyTeam('soo-greyhounds', 'Soo', 'Greyhounds', 'SOO', 'West', '#cf2128', '#a4aaac'),
  createEmptyTeam('guelph-storm', 'Guelph', 'Storm', 'GUE', 'West', '#900028', '#010101'),
  createEmptyTeam('saginaw-spirit', 'Saginaw', 'Spirit', 'SAG', 'West', '#bf3139', '#042a5c'),
  createEmptyTeam('sarnia-sting', 'Sarnia', 'Sting', 'SAR', 'West', '#fdc426', '#010101'),
  createEmptyTeam('erie-otters', 'Erie', 'Otters', 'ERI', 'West', '#fcc611', '#001e43'),
  // Adicionado Owen Sound Attack baseado em cores.txt e ser time real
  createEmptyTeam('owen-sound-attack', 'Owen Sound', 'Attack', 'OS', 'West', '#d53b36', '#010101'),
];

export const OHL_LEAGUE: League = {
  id: 'ohl',
  name: 'Ontario Hockey League',
  tier: 'D',
  totalGames: 68,
  conferences: [
    {
      id: 'east',
      name: 'Eastern Conference',
      divisions: [
        {
          id: 'east-div',
          name: 'East Division',
          teams: OHL_EAST_TEAMS,
        }
      ]
    },
    {
      id: 'west',
      name: 'Western Conference',
      divisions: [
        {
          id: 'west-div',
          name: 'West Division',
          teams: OHL_WEST_TEAMS,
        }
      ]
    }
  ]
};
