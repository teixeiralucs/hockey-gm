import type { League, Conference, Division } from '../../models/League';
import type { Team } from '../../models/Team';

// Helper for generating an empty team state (roster will be populated later by generators)
function createEmptyTeam(
  id: string,
  city: string,
  name: string,
  abbreviation: string,
  conference: string,
  division: string,
  primaryColor: string,
  secondaryColor: string
): Team {
  return {
    id,
    city,
    name,
    abbreviation,
    conference,
    division,
    logoUrl: `/assets/logos/ohl/${id}.png`,
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
  // East Division
  createEmptyTeam('brantford-bulldogs', 'Brantford', 'Bulldogs', 'BFD', 'East', 'East', '#fcc82d', '#010101'),
  createEmptyTeam('kingston-frontenacs', 'Kingston', 'Frontenacs', 'KGN', 'East', 'East', '#cda435', '#010101'),
  createEmptyTeam('oshawa-generals', 'Oshawa', 'Generals', 'OSH', 'East', 'East', '#e51937', '#041e43'),
  createEmptyTeam('ottawa-67s', 'Ottawa', "67's", 'OTT', 'East', 'East', '#ab1b2c', '#010101'),
  createEmptyTeam('peterborough-petes', 'Peterborough', 'Petes', 'PBO', 'East', 'East', '#74253f', '#010101'),
  
  // Central Division
  createEmptyTeam('barrie-colts', 'Barrie', 'Colts', 'BAR', 'East', 'Central', '#ec2634', '#001c63'),
  createEmptyTeam('north-bay-battalion', 'North Bay', 'Battalion', 'NB', 'East', 'Central', '#fcd93b', '#010101'),
  createEmptyTeam('niagara-icedogs', 'Niagara', 'IceDogs', 'NIA', 'East', 'Central', '#e31a35', '#010101'),
  createEmptyTeam('sudbury-wolves', 'Sudbury', 'Wolves', 'SBY', 'East', 'Central', '#9fa8ab', '#045ea4'),
  createEmptyTeam('brampton-steelheads', 'Brampton', 'Steelheads', 'BRAM', 'East', 'Central', '#a7aaac', '#002868'),
];

export const OHL_WEST_TEAMS: Team[] = [
  // Midwest Division
  createEmptyTeam('erie-otters', 'Erie', 'Otters', 'ER', 'West', 'Midwest', '#fcc611', '#001e43'),
  createEmptyTeam('guelph-storm', 'Guelph', 'Storm', 'GUE', 'West', 'Midwest', '#900028', '#010101'),
  createEmptyTeam('kitchener-rangers', 'Kitchener', 'Rangers', 'KIT', 'West', 'Midwest', '#0460ac', '#e31e37'),
  createEmptyTeam('london-knights', 'London', 'Knights', 'LDN', 'West', 'Midwest', '#005030', '#f4cb55'),
  createEmptyTeam('owen-sound-attack', 'Owen Sound', 'Attack', 'OS', 'West', 'Midwest', '#d53b36', '#010101'),
  
  // West Division
  createEmptyTeam('windsor-spitfires', 'Windsor', 'Spitfires', 'WSR', 'West', 'West', '#e51e25', '#10284b'),
  createEmptyTeam('flint-firebirds', 'Flint', 'Firebirds', 'FLNT', 'West', 'West', '#f48226', '#002d62'),
  createEmptyTeam('soo-greyhounds', 'Soo', 'Greyhounds', 'SOO', 'West', 'West', '#cf2128', '#a4aaac'),
  createEmptyTeam('saginaw-spirit', 'Saginaw', 'Spirit', 'SAG', 'West', 'West', '#bf3139', '#042a5c'),
  createEmptyTeam('sarnia-sting', 'Sarnia', 'Sting', 'SAR', 'West', 'West', '#fdc426', '#010101'),
];

export const OHL_LEAGUE: League = {
  id: 'ohl',
  name: 'Ontario Hockey League',
  tier: 'D',
  totalGames: 68,
  colors: {
    primary: '#047ac4',
    secondary: '#aaaaaa',
  },
  logoUrl: '/assets/logos/leagues/ohl-logo.svg',
  conferences: [
    {
      id: 'east',
      name: 'Eastern Conference',
      divisions: [
        {
          id: 'east',
          name: 'East Division',
          teams: OHL_EAST_TEAMS.filter(t => t.division === 'East'),
        },
        {
          id: 'central',
          name: 'Central Division',
          teams: OHL_EAST_TEAMS.filter(t => t.division === 'Central'),
        },
      ],
    },
    {
      id: 'west',
      name: 'Western Conference',
      divisions: [
        {
          id: 'midwest',
          name: 'Midwest Division',
          teams: OHL_WEST_TEAMS.filter(t => t.division === 'Midwest'),
        },
        {
          id: 'west',
          name: 'West Division',
          teams: OHL_WEST_TEAMS.filter(t => t.division === 'West'),
        },
      ],
    },
  ]
};
