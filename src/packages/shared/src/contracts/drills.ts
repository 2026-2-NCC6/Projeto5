/**
 * Smart Tennis Arena — Modelos, Validação e Contratos de Treinos (Drills)
 * Alinhado com: RF03, RF04, RF09, RF14, RF15, RF16, RF18, RF20
 */

import type { TargetId } from '../protocol/serial';

export const TargetZone = {
  TOP_LEFT: 1,
  TOP_RIGHT: 2,
  BOTTOM_LEFT: 3,
  BOTTOM_RIGHT: 4,
  CENTER: 5,
} as const;
export type TargetZone = (typeof TargetZone)[keyof typeof TargetZone];

export const TARGET_LABELS: Record<TargetId, string> = {
  1: 'Superior Esquerdo',
  2: 'Superior Direito',
  3: 'Inferior Esquerdo',
  4: 'Inferior Direito',
  5: 'Centro',
};

export const TARGET_TACTICAL_NAMES: Record<TargetId, string> = {
  1: 'Forehand Fundo',
  2: 'Backhand Fundo',
  3: 'Curta Esquerda',
  4: 'Saque / Paralela',
  5: 'Centro Estratégico',
};

export const DrillCategory = {
  AGILITY: 'AGILITY',
  REACTION: 'REACTION',
  PRECISION: 'PRECISION',
  ENDURANCE: 'ENDURANCE',
  KIDS_FUN: 'KIDS_FUN',
} as const;
export type DrillCategory = (typeof DrillCategory)[keyof typeof DrillCategory];

export const DRILL_CATEGORY_LABELS: Record<DrillCategory, string> = {
  [DrillCategory.AGILITY]: 'Agilidade & Deslocamento',
  [DrillCategory.REACTION]: 'Tempo de Reação',
  [DrillCategory.PRECISION]: 'Precisão Direcional',
  [DrillCategory.ENDURANCE]: 'Resistência & Intensidade',
  [DrillCategory.KIDS_FUN]: 'Lúdico Infantil (Kids)',
};

export const DrillDifficulty = {
  BEGINNER: 1,
  EASY: 2,
  INTERMEDIATE: 3,
  ADVANCED: 4,
  PRO: 5,
} as const;
export type DrillDifficulty = (typeof DrillDifficulty)[keyof typeof DrillDifficulty];

export type DrillStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export type DrillLicenseType = 'FREE_OPEN' | 'ACADEMY_PRO' | 'MARKETPLACE_PAID';

export type DrillRemunerationModel =
  | 'FREE'
  | 'REVENUE_SHARE_70_30'
  | 'SUBSCRIPTION_POOL'
  | 'FIXED_LICENSE';

export interface MarketplaceMetadata {
  commercialDescription: string;
  compatibility: string;
  licenseType: DrillLicenseType;
  remunerationModel: DrillRemunerationModel;
  suggestedPriceBrl?: number;
}

export interface DrillPreparationMetadata {
  instructions: string[];
  scoringRulesSummary: string;
  equipmentRequired: string[];
  safetyWarnings: string[];
  requiredSensors: TargetId[];
  estimatedDurationSec: number;
}

export interface DrillChangelogEntry {
  version: string;
  date: string;
  author: string;
  notes: string;
}

export interface DrillStep {
  stepNumber: number;
  targetId: TargetId;
  durationMs: number;
  ballSpeedKmh?: number;
  spinType?: 'FLAT' | 'TOPSPIN' | 'BACKSPIN';
  feedIntervalMs?: number;
}

export interface DrillDefinition {
  id: string;
  title: string;
  description: string;
  category: DrillCategory;
  difficulty: DrillDifficulty;
  recommendedAgeMin?: number;
  recommendedAgeMax?: number;
  isKidsAdapted: boolean;
  version: string;
  authorName: string;
  authorId?: number;
  status?: DrillStatus;
  publishedAt?: string;
  updatedAt?: string;
  steps: DrillStep[];
  preparation?: DrillPreparationMetadata;
  marketplace?: MarketplaceMetadata;
  changelog?: DrillChangelogEntry[];
}

export interface DrillValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedDurationSec: number;
  requiredSensors: TargetId[];
}

/**
 * Validação determinística de regras do treino antes da publicação (RF15 + Teoria da Computação)
 */
export function validateDrillDefinition(drill: Partial<DrillDefinition>): DrillValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!drill.title || drill.title.trim().length < 4) {
    errors.push('O título do treino deve possuir pelo menos 4 caracteres.');
  }

  if (!drill.description || drill.description.trim().length < 10) {
    errors.push('A descrição técnica/pedagógica deve possuir pelo menos 10 caracteres.');
  }

  if (!drill.authorName || drill.authorName.trim().length < 2) {
    errors.push('O nome do autor/treinador responsável é obrigatório.');
  }

  if (!drill.version || !/^\d+\.\d+\.\d+$/.test(drill.version.trim())) {
    errors.push('A versão deve seguir o padrão semântico X.Y.Z (ex: 1.0.0).');
  }

  if (!drill.steps || !Array.isArray(drill.steps) || drill.steps.length < 2) {
    errors.push('O treino deve possuir uma sequência mínima de 2 disparos/alvos.');
  }

  const sensorSet = new Set<TargetId>();
  let totalDurationMs = 0;

  if (Array.isArray(drill.steps)) {
    drill.steps.forEach((step, idx) => {
      const label = `Passo #${idx + 1}`;
      if (!step.targetId || step.targetId < 1 || step.targetId > 5) {
        errors.push(`${label}: Alvo inválido (${step.targetId}). Deve estar entre 1 e 5.`);
      } else {
        sensorSet.add(step.targetId);
      }

      if (typeof step.durationMs !== 'number' || step.durationMs < 800 || step.durationMs > 15000) {
        errors.push(`${label}: Janela de tempo (${step.durationMs}ms) fora do limite seguro (800ms a 15000ms).`);
      } else {
        totalDurationMs += step.durationMs;
      }

      if (step.ballSpeedKmh !== undefined) {
        if (step.ballSpeedKmh < 20 || step.ballSpeedKmh > 160) {
          errors.push(`${label}: Velocidade da bola (${step.ballSpeedKmh} km/h) fora da faixa operacional (20 a 160 km/h).`);
        }
        if (drill.isKidsAdapted && step.ballSpeedKmh > 75) {
          warnings.push(`${label}: Velocidade de ${step.ballSpeedKmh} km/h elevada para Modo Kids (recomendado <= 75 km/h).`);
        }
      }
    });
  }

  if (drill.isKidsAdapted && totalDurationMs / (drill.steps?.length || 1) < 2500) {
    warnings.push('Treino Kids com janela média inferior a 2500ms; o motor aplicará bônus de +50% (RN09).');
  }

  const requiredSensors = Array.from(sensorSet).sort() as TargetId[];
  const estimatedDurationSec = Math.max(5, Math.round(totalDurationMs / 1000) + 3);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    estimatedDurationSec,
    requiredSensors,
  };
}

/**
 * Incrementa a versão semântica (ex: 1.0.0 -> 1.1.0) para controle de publicação (RF16)
 */
export function bumpDrillVersion(currentVersion: string, type: 'PATCH' | 'MINOR' | 'MAJOR' = 'MINOR'): string {
  const parts = currentVersion.split('.').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) {
    return '1.0.0';
  }
  if (type === 'MAJOR') return `${parts[0] + 1}.0.0`;
  if (type === 'MINOR') return `${parts[0]}.${parts[1] + 1}.0`;
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

/**
 * Treinos pré-definidos padrão para teste inicial e catálogo básico
 */
export const DEFAULT_DRILLS: DrillDefinition[] = [
  {
    id: 'drill-kids-magic-targets',
    title: 'Alvos Mágicos do Tênis',
    description: 'Treino lúdico para crianças praticarem coordenação e agilidade com ritmo suave.',
    category: DrillCategory.KIDS_FUN,
    difficulty: DrillDifficulty.BEGINNER,
    recommendedAgeMin: 5,
    recommendedAgeMax: 12,
    isKidsAdapted: true,
    version: '1.0.0',
    authorName: 'Professor Rafa (Arena Kids)',
    status: 'PUBLISHED',
    publishedAt: '2026-08-15T10:00:00.000Z',
    steps: [
      { stepNumber: 1, targetId: 5, durationMs: 4000, ballSpeedKmh: 45, spinType: 'FLAT' },
      { stepNumber: 2, targetId: 1, durationMs: 4000, ballSpeedKmh: 45, spinType: 'TOPSPIN' },
      { stepNumber: 3, targetId: 2, durationMs: 4000, ballSpeedKmh: 45, spinType: 'TOPSPIN' },
      { stepNumber: 4, targetId: 5, durationMs: 4000, ballSpeedKmh: 50, spinType: 'FLAT' },
      { stepNumber: 5, targetId: 3, durationMs: 4000, ballSpeedKmh: 45, spinType: 'FLAT' },
      { stepNumber: 6, targetId: 4, durationMs: 4000, ballSpeedKmh: 50, spinType: 'FLAT' },
    ],
    preparation: {
      instructions: [
        'Posicione a criança no centro da linha de saque curta (Mini-Tennis).',
        'Utilize bolas Soft (Estágio Vermelho ou Laranja ITF) para menor compressão.',
        'Ao ver o anel de LED brilhar, rebata a bola em direção à estrela correspondente.',
      ],
      scoringRulesSummary: 'Modo Kids (RN09): +50% de janela temporal automática, zero penalidade em alvos trocados e estrelas por participação.',
      equipmentRequired: ['Raquete Infantil (19" a 25")', 'Bolas Low-Compression', '5 Módulos Piezo + LEDs'],
      safetyWarnings: [
        'Verifique se a área ao redor dos 5 alvos e cabos está livre de obstáculos.',
        'Em caso de aproximação da criança aos alvos, acione imediatamente a Parada Segura (!EMG).',
      ],
      requiredSensors: [1, 2, 3, 4, 5],
      estimatedDurationSec: 27,
    },
    marketplace: {
      commercialDescription: 'Pacote pedagógico infantil oficial baseado na metodologia Play & Stay da ITF.',
      compatibility: 'Arduino Uno R3 + Simulador Spinshot / Todos os 5 Sensores Piezo',
      licenseType: 'FREE_OPEN',
      remunerationModel: 'FREE',
      suggestedPriceBrl: 0,
    },
    changelog: [
      {
        version: '1.0.0',
        date: '2026-08-15',
        author: 'Professor Rafa (Arena Kids)',
        notes: 'Versão oficial publicada com 6 rodadas e adaptação lúdica RN09.',
      },
    ],
  },
  {
    id: 'drill-pro-rapid-reflex',
    title: 'Reflexo Rápido (Fundo de Quadra)',
    description: 'Acionamento aleatório dos alvos com janela curta de resposta e alta exigência.',
    category: DrillCategory.REACTION,
    difficulty: DrillDifficulty.ADVANCED,
    recommendedAgeMin: 14,
    isKidsAdapted: false,
    version: '1.0.0',
    authorName: 'Treinador Carlos',
    status: 'PUBLISHED',
    publishedAt: '2026-08-20T14:30:00.000Z',
    steps: [
      { stepNumber: 1, targetId: 1, durationMs: 2800, ballSpeedKmh: 95, spinType: 'TOPSPIN' },
      { stepNumber: 2, targetId: 4, durationMs: 2800, ballSpeedKmh: 100, spinType: 'FLAT' },
      { stepNumber: 3, targetId: 2, durationMs: 2600, ballSpeedKmh: 95, spinType: 'TOPSPIN' },
      { stepNumber: 4, targetId: 3, durationMs: 2600, ballSpeedKmh: 105, spinType: 'BACKSPIN' },
      { stepNumber: 5, targetId: 5, durationMs: 2400, ballSpeedKmh: 110, spinType: 'FLAT' },
      { stepNumber: 6, targetId: 1, durationMs: 2400, ballSpeedKmh: 110, spinType: 'TOPSPIN' },
      { stepNumber: 7, targetId: 2, durationMs: 2200, ballSpeedKmh: 112, spinType: 'TOPSPIN' },
      { stepNumber: 8, targetId: 4, durationMs: 2200, ballSpeedKmh: 115, spinType: 'FLAT' },
      { stepNumber: 9, targetId: 3, durationMs: 2000, ballSpeedKmh: 115, spinType: 'BACKSPIN' },
      { stepNumber: 10, targetId: 5, durationMs: 2000, ballSpeedKmh: 120, spinType: 'FLAT' },
    ],
    preparation: {
      instructions: [
        'Inicie posicionado no centro da linha de base em split-step ativo.',
        'A janela temporal reduz progressivamente de 2800ms até 2000ms na décima bola.',
        'Priorize tempo de reação rápido e potência de impacto (bônus ADC até +20 pts).',
      ],
      scoringRulesSummary: 'Regra RN03: Base 100 pts × (1 + T_rest/T_total) × Multiplicador de Streak (até 1.5x) + Bônus de Força ADC. Erro de alvo: -30 pts.',
      equipmentRequired: ['Raquete Adulto Padrão', '5 Alvos Piezoelétricos Calibrados (Threshold >= 250mV)', 'Simulador/Lançadora Spinshot'],
      safetyWarnings: [
        'Velocidade simulada de lançamento entre 95 e 120 km/h — mantenha distância mínima de 6m da lançadora.',
        'Utilize calçado adequado de quadra e verifique fixação dos cabos seriais.',
      ],
      requiredSensors: [1, 2, 3, 4, 5],
      estimatedDurationSec: 27,
    },
    marketplace: {
      commercialDescription: 'Protocolo de alto rendimento para aprimoramento de split-step e transição fundo-rede.',
      compatibility: 'Arduino Uno R3 + Spinshot Plus-2 / Player API Mock',
      licenseType: 'ACADEMY_PRO',
      remunerationModel: 'REVENUE_SHARE_70_30',
      suggestedPriceBrl: 29.9,
    },
    changelog: [
      {
        version: '1.0.0',
        date: '2026-08-20',
        author: 'Treinador Carlos',
        notes: 'Calibração de decaimento temporal progressivo (2.8s -> 2.0s) homologada em quadra.',
      },
    ],
  },
  {
    id: 'drill-interm-cross-precision',
    title: 'Precisão Cruzada (Forehand & Backhand)',
    description: 'Alternância tática entre diagonais superiores e curtas para controle direcional.',
    category: DrillCategory.PRECISION,
    difficulty: DrillDifficulty.INTERMEDIATE,
    recommendedAgeMin: 12,
    isKidsAdapted: false,
    version: '1.0.0',
    authorName: 'Comissão Técnica Arena',
    status: 'PUBLISHED',
    publishedAt: '2026-09-01T09:00:00.000Z',
    steps: [
      { stepNumber: 1, targetId: 1, durationMs: 3200, ballSpeedKmh: 80, spinType: 'TOPSPIN' },
      { stepNumber: 2, targetId: 2, durationMs: 3200, ballSpeedKmh: 80, spinType: 'TOPSPIN' },
      { stepNumber: 3, targetId: 3, durationMs: 3000, ballSpeedKmh: 85, spinType: 'BACKSPIN' },
      { stepNumber: 4, targetId: 4, durationMs: 3000, ballSpeedKmh: 85, spinType: 'FLAT' },
      { stepNumber: 5, targetId: 5, durationMs: 3000, ballSpeedKmh: 85, spinType: 'FLAT' },
      { stepNumber: 6, targetId: 1, durationMs: 2800, ballSpeedKmh: 90, spinType: 'TOPSPIN' },
      { stepNumber: 7, targetId: 4, durationMs: 2800, ballSpeedKmh: 90, spinType: 'FLAT' },
      { stepNumber: 8, targetId: 2, durationMs: 2800, ballSpeedKmh: 90, spinType: 'TOPSPIN' },
    ],
    preparation: {
      instructions: [
        'Alterne golpes cruzados de Forehand (Alvo 1) e Backhand (Alvo 2) mantendo regularidade.',
        'Nos Alvos 3 e 4, avance dentro da quadra para atacar bolas mais curtas.',
      ],
      scoringRulesSummary: 'Regra RN03: Foco em manter Streak contínuo de 5+ acertos para atingir multiplicador máximo de 1.5x.',
      equipmentRequired: ['Raquete Intermediária/Adulto', '5 Alvos Piezoelétricos + Controlador Serial'],
      safetyWarnings: [
        'Certifique-se de que não há bolas soltas na zona de deslocamento lateral.',
      ],
      requiredSensors: [1, 2, 3, 4, 5],
      estimatedDurationSec: 27,
    },
    marketplace: {
      commercialDescription: 'Treino estruturado para consistência direcional e troca de direção em ralis de regularidade.',
      compatibility: 'Arduino Uno R3 + Simulador Spinshot',
      licenseType: 'FREE_OPEN',
      remunerationModel: 'SUBSCRIPTION_POOL',
      suggestedPriceBrl: 0,
    },
    changelog: [
      {
        version: '1.0.0',
        date: '2026-09-01',
        author: 'Comissão Técnica Arena',
        notes: 'Lançamento inicial para atletas nível intermediário.',
      },
    ],
  },
  {
    id: 'drill-pro-endurance-tour',
    title: 'Desafio Grand Slam (Resistência Pro)',
    description: 'Cadência progressiva cobrindo todas as 5 zonas com janelas sub-2s de nível profissional.',
    category: DrillCategory.ENDURANCE,
    difficulty: DrillDifficulty.PRO,
    recommendedAgeMin: 16,
    isKidsAdapted: false,
    version: '1.0.0',
    authorName: 'Treinador Carlos',
    status: 'PUBLISHED',
    publishedAt: '2026-09-10T16:00:00.000Z',
    steps: [
      { stepNumber: 1, targetId: 5, durationMs: 2000, ballSpeedKmh: 110, spinType: 'FLAT' },
      { stepNumber: 2, targetId: 1, durationMs: 1900, ballSpeedKmh: 115, spinType: 'TOPSPIN' },
      { stepNumber: 3, targetId: 4, durationMs: 1900, ballSpeedKmh: 115, spinType: 'FLAT' },
      { stepNumber: 4, targetId: 2, durationMs: 1800, ballSpeedKmh: 120, spinType: 'TOPSPIN' },
      { stepNumber: 5, targetId: 3, durationMs: 1800, ballSpeedKmh: 120, spinType: 'BACKSPIN' },
      { stepNumber: 6, targetId: 5, durationMs: 1700, ballSpeedKmh: 125, spinType: 'FLAT' },
      { stepNumber: 7, targetId: 2, durationMs: 1600, ballSpeedKmh: 125, spinType: 'TOPSPIN' },
      { stepNumber: 8, targetId: 1, durationMs: 1600, ballSpeedKmh: 130, spinType: 'TOPSPIN' },
    ],
    preparation: {
      instructions: [
        'Exige aquecimento articular prévio de pelo menos 10 minutos.',
        'Janelas ultra-curtas (2000ms a 1600ms) simulando rali agressivo de torneio.',
      ],
      scoringRulesSummary: 'Regra RN03: Penalidade estrita de -30 pts por erro de alvo; bônus máximo de velocidade e impacto.',
      equipmentRequired: ['Raquete Competição', '5 Alvos Piezoelétricos Alta Sensibilidade', 'Botão de Emergência !EMG acessível'],
      safetyWarnings: [
        'Alta intensidade cardiovascular — interrompa imediatamente em caso de fadiga excessiva.',
        'Velocidade máxima simulada de 130 km/h.',
      ],
      requiredSensors: [1, 2, 3, 4, 5],
      estimatedDurationSec: 18,
    },
    marketplace: {
      commercialDescription: 'Simulação oficial de intensidade ATP/WTA para atletas competitivos e academias.',
      compatibility: 'Arduino Uno R3 + Spinshot Player Pro',
      licenseType: 'MARKETPLACE_PAID',
      remunerationModel: 'REVENUE_SHARE_70_30',
      suggestedPriceBrl: 49.9,
    },
    changelog: [
      {
        version: '1.0.0',
        date: '2026-09-10',
        author: 'Treinador Carlos',
        notes: 'Homologação de cadência sub-2s para torneios universitários.',
      },
    ],
  },
];
