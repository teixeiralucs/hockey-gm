import { Player, PlayerRole, Position, PlayerCategoryAttr, PlayerAttributes } from '../models/Player';
import { v4 as uuidv4 } from 'uuid';

/**
 * Utilitário responsável por gerar jogadores baseados na liga e seus Tiers.
 * A geração de atributos respeita os ratios descritos no documento alpha-0.1.
 */

// Nomes aleatórios simples para o protótipo inicial (poderão vir de um banco de dados de nomes no futuro)
const FIRST_NAMES = ['Connor', 'Sidney', 'Alex', 'Auston', 'Nathan', 'Leon', 'Cale', 'Quinn', 'Elias', 'Mitch', 'Jack', 'Brady', 'Matthew'];
const LAST_NAMES = ['McDavid', 'Crosby', 'Ovechkin', 'Matthews', 'MacKinnon', 'Draisaitl', 'Makar', 'Hughes', 'Pettersson', 'Marner', 'Eichel', 'Tkachuk'];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomName() {
  return {
    firstName: FIRST_NAMES[randomInt(0, FIRST_NAMES.length - 1)],
    lastName: LAST_NAMES[randomInt(0, LAST_NAMES.length - 1)],
  };
}

export class PlayerGenerator {
  
  /**
   * Gera um jogador D-Tier (OHL). Médias entre 9 e 22 (Overall).
   */
  public static generateDTierPlayer(position?: Position): Player {
    const role = this.determineRole(position);
    const pos = position || this.randomPositionForRole(role);
    const { firstName, lastName } = getRandomName();
    
    // Para D-Tier, o range base de atributos (antes do ratio) é baixo. 
    // Para atingir media 9~22, a base seria em torno de 15.
    const baseMin = 5;
    const baseMax = 20;

    const attributes = this.generateAttributesByRole(role, baseMin, baseMax);
    const overall = this.calculateOverall(attributes);

    return {
      id: uuidv4(),
      firstName,
      lastName,
      age: randomInt(16, 20), // OHL age range
      position: pos,
      role,
      attributes,
      overall,
      tier: 'D'
    };
  }

  private static determineRole(pos?: Position): PlayerRole {
    if (!pos) {
      const rand = Math.random();
      if (rand < 0.6) return 'Forward';     // 12/20
      if (rand < 0.9) return 'Defenceman';  // 6/20
      return 'Goalie';                      // 2/20
    }
    if (['C', 'LW', 'RW'].includes(pos)) return 'Forward';
    if (['LD', 'RD'].includes(pos)) return 'Defenceman';
    return 'Goalie';
  }

  private static randomPositionForRole(role: PlayerRole): Position {
    if (role === 'Forward') {
      const pos = ['C', 'LW', 'RW'];
      return pos[randomInt(0, 2)] as Position;
    }
    if (role === 'Defenceman') {
      const pos = ['LD', 'RD'];
      return pos[randomInt(0, 1)] as Position;
    }
    return 'G';
  }

  private static generateAttributesByRole(role: PlayerRole, min: number, max: number): PlayerAttributes {
    const baseSkating = randomInt(min, max);
    const baseCreativity = randomInt(min, max);
    const baseShooting = randomInt(min, max);
    const baseDefense = randomInt(min, max);

    // Ratios from Alpha 0.1 Plan
    let ratios = { skating: 1, creativity: 1, shooting: 1, defense: 1 };
    
    if (role === 'Forward') {
      ratios = { skating: 2.0, creativity: 1.0, shooting: 2.0, defense: 1.25 };
    } else if (role === 'Defenceman') {
      ratios = { skating: 1.75, creativity: 1.75, shooting: 1.75, defense: 2.0 };
    } else if (role === 'Goalie') {
      ratios = { skating: 1.0, creativity: 2.0, shooting: 1.0, defense: 1.75 };
    }

    return {
      skating: this.createCategory(baseSkating * ratios.skating),
      creativity: this.createCategory(baseCreativity * ratios.creativity),
      shooting: this.createCategory(baseShooting * ratios.shooting),
      defense: this.createCategory(baseDefense * ratios.defense),
    };
  }

  private static createCategory(totalRaw: number): PlayerCategoryAttr {
    // Normaliza para não passar de 99 nem ficar abaixo de 1
    const total = Math.min(99, Math.max(1, Math.round(totalRaw)));
    
    // Split the total slightly randomly into two sub-attributes
    const variance = randomInt(-5, 5);
    const value1 = Math.min(99, Math.max(1, Math.round(total + variance)));
    const value2 = Math.min(99, Math.max(1, Math.round(total - variance)));
    
    // Recalcula o total baseado nos valores (a média deles)
    const finalTotal = Math.round((value1 + value2) / 2);

    return { value1, value2, total: finalTotal };
  }

  private static calculateOverall(attrs: PlayerAttributes): number {
    return Math.round((attrs.skating.total + attrs.creativity.total + attrs.shooting.total + attrs.defense.total) / 4);
  }
}
