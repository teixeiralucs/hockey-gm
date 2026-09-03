import type { Player, PlayerRole, Position, PlayerCategoryAttr } from '../models/Player';

export class PlayerGenerator {
  
  static async generateTeamRoster(): Promise<{ activeLines: Player[], bench: Player[] }> {
    // Buscar o pool de jogadores do mock
    const response = await fetch('/data/ohl_players.json');
    const allPlayers: any[] = await response.json();
    
    // Sortear exatamente as cotas: 4 C, 4 LW, 4 RW, 3 LD, 3 RD, 2 G
    const roster: Player[] = [];
    
    const quotas: Record<string, number> = {
      'C': 4,
      'LW': 4,
      'RW': 4,
      'LD': 3,
      'RD': 3,
      'G': 2
    };

    for (const [pos, count] of Object.entries(quotas)) {
      const available = allPlayers.filter(p => p.position === pos);
      // Shuffle
      const shuffled = available.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, count);
      
      let lineCounter = 1;
      selected.forEach((p, idx) => {
        roster.push(this.hydratePlayer(p, pos as Position, lineCounter++));
      });
    }

    return { activeLines: roster, bench: [] };
  }

  private static hydratePlayer(raw: any, pos: Position, lineHint: number): Player {
    const role = this.getRole(pos);
    
    // Tier D: OHL. Overall base 9 a 22.
    // Usaremos as stats simuladas dele para influenciar o Overall dentro dessa régua.
    let statScore = 0;
    if (role === 'Goalie') {
      const svPct = parseFloat(raw.stats.svPct);
      statScore = Math.max(0, (svPct - 0.880) / 0.050); 
    } else {
      statScore = Math.min(1, Math.max(0, (raw.stats.points - 10) / 80));
    }

    // Overall D-Tier = 9 a 22
    const baseOverall = Math.floor(9 + (statScore * 13));

    // Aplicar os ratios de atributos baseados na Role
    const attrs = this.generateAttributes(baseOverall, role);

    const birthYear = new Date(raw.dateOfBirth).getFullYear();
    const age = 2026 - birthYear; 

    let finalBaseOverall = baseOverall;
    let tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond' = 'Bronze';
    let draftPick: number | undefined = undefined;

    // Draft Prospects 2026
    const prospects: Record<string, number> = {
      'Caleb Malhotra': 3,
      'Chase Reid': 7,
      'Nikita Klepov': 15,
      'Ethan Belchetz': 17,
      'Adam Novotnǫ': 24,
      'Maksim Sokolovskii': 27,
      'Jaxon Cover': 32
    };

    if (prospects[raw.fullName]) {
      finalBaseOverall += 2;
      tier = 'Diamond';
      draftPick = prospects[raw.fullName];
    } else {
      // Normal Tier based on overall
      if (finalBaseOverall >= 19) {
        tier = 'Gold';
      } else if (finalBaseOverall >= 14) {
        tier = 'Silver';
      }
    }

    return {
      id: raw.id,
      firstName: raw.firstName,
      lastName: raw.lastName,
      fullName: raw.fullName,
      age,
      position: pos,
      role,
      height: raw.height,
      weight: raw.weight,
      hometown: raw.hometown,
      photo: raw.photo,
      shootsCatches: raw.shootsCatches,
      teamAbbr: raw.teamAbbr,
      stats: raw.stats,
      attributes: attrs,
      baseOverall: finalBaseOverall,
      currentOverall: finalBaseOverall,
      tier,
      draftPick,
      currentLine: lineHint > this.getMaxLines(role) ? null : lineHint 
    };
  }

  private static getMaxLines(role: PlayerRole) {
    if (role === 'Forward') return 4;
    if (role === 'Defenceman') return 3;
    return 2; 
  }

  private static getRole(pos: Position): PlayerRole {
    if (pos === 'G') return 'Goalie';
    if (pos === 'LD' || pos === 'RD') return 'Defenceman';
    return 'Forward';
  }

  private static generateAttributes(ovr: number, role: PlayerRole): any {
    let ratios = { sk: 1, cr: 1, sh: 1, de: 1 };
    
    if (role === 'Forward') {
      ratios = { sk: 2.0, cr: 1.0, sh: 2.0, de: 1.25 };
    } else if (role === 'Defenceman') {
      ratios = { sk: 1.75, cr: 1.75, sh: 1.75, de: 2.0 };
    } else {
      ratios = { sk: 1.0, cr: 2.0, sh: 1.0, de: 1.75 };
    }

    const avgRatio = (ratios.sk + ratios.cr + ratios.sh + ratios.de) / 4;
    
    const buildCat = (ratio: number) => {
      const val = Math.round(ovr * (ratio / avgRatio));
      return {
        value1: Math.ceil(val / 2),
        value2: Math.floor(val / 2),
        total: val
      } as PlayerCategoryAttr;
    };

    return {
      skating: buildCat(ratios.sk),
      creativity: buildCat(ratios.cr),
      shooting: buildCat(ratios.sh),
      defense: buildCat(ratios.de),
    };
  }
}
