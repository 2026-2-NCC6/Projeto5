/**
 * Smart Tennis Arena — Modelos e Contratos de Treinos (Drills)
 * Alinhado com: docs/spec/01-system-requirements.md e docs/spec/04-api-contracts-openapi.yaml
 */

import { TargetId } from '../protocol/serial';

export enum TargetZone {
  TOP_LEFT = 1,
  TOP_RIGHT = 2,
  BOTTOM_LEFT = 3,
  BOTTOM_RIGHT = 4,
  CENTER = 5,
}

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

export enum DrillCategory {
  AGILITY = 'AGILITY',
  REACTION = 'REACTION',
  PRECISION = 'PRECISION',
  ENDURANCE = 'ENDURANCE',
  KIDS_FUN = 'KIDS_FUN',
}

export enum DrillDifficulty {
  BEGINNER = 1,
  EASY = 2,
  INTERMEDIATE = 3,
  ADVANCED = 4,
  PRO = 5,
}

export interface DrillStep {
  stepNumber: number;
  targetId: TargetId;
  durationMs: number;
  ballSpeedKmh?: number;
  spinType?: 'FLAT' | 'TOPSPIN' | 'BACKSPIN';
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
  steps: DrillStep[];
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
    steps: [
      { stepNumber: 1, targetId: 5, durationMs: 4000 },
      { stepNumber: 2, targetId: 1, durationMs: 4000 },
      { stepNumber: 3, targetId: 2, durationMs: 4000 },
      { stepNumber: 4, targetId: 5, durationMs: 4000 },
      { stepNumber: 5, targetId: 3, durationMs: 4000 },
      { stepNumber: 6, targetId: 4, durationMs: 4000 },
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
    steps: [
      { stepNumber: 1, targetId: 1, durationMs: 2800, ballSpeedKmh: 95 },
      { stepNumber: 2, targetId: 4, durationMs: 2800, ballSpeedKmh: 100 },
      { stepNumber: 3, targetId: 2, durationMs: 2600, ballSpeedKmh: 95 },
      { stepNumber: 4, targetId: 3, durationMs: 2600, ballSpeedKmh: 105 },
      { stepNumber: 5, targetId: 5, durationMs: 2400, ballSpeedKmh: 110 },
      { stepNumber: 6, targetId: 1, durationMs: 2400, ballSpeedKmh: 110 },
      { stepNumber: 7, targetId: 2, durationMs: 2200, ballSpeedKmh: 112 },
      { stepNumber: 8, targetId: 4, durationMs: 2200, ballSpeedKmh: 115 },
      { stepNumber: 9, targetId: 3, durationMs: 2000, ballSpeedKmh: 115 },
      { stepNumber: 10, targetId: 5, durationMs: 2000, ballSpeedKmh: 120 },
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
    steps: [
      { stepNumber: 1, targetId: 1, durationMs: 3200, ballSpeedKmh: 80 },
      { stepNumber: 2, targetId: 2, durationMs: 3200, ballSpeedKmh: 80 },
      { stepNumber: 3, targetId: 3, durationMs: 3000, ballSpeedKmh: 85 },
      { stepNumber: 4, targetId: 4, durationMs: 3000, ballSpeedKmh: 85 },
      { stepNumber: 5, targetId: 5, durationMs: 3000, ballSpeedKmh: 85 },
      { stepNumber: 6, targetId: 1, durationMs: 2800, ballSpeedKmh: 90 },
      { stepNumber: 7, targetId: 4, durationMs: 2800, ballSpeedKmh: 90 },
      { stepNumber: 8, targetId: 2, durationMs: 2800, ballSpeedKmh: 90 },
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
    steps: [
      { stepNumber: 1, targetId: 5, durationMs: 2000, ballSpeedKmh: 110 },
      { stepNumber: 2, targetId: 1, durationMs: 1900, ballSpeedKmh: 115 },
      { stepNumber: 3, targetId: 4, durationMs: 1900, ballSpeedKmh: 115 },
      { stepNumber: 4, targetId: 2, durationMs: 1800, ballSpeedKmh: 120 },
      { stepNumber: 5, targetId: 3, durationMs: 1800, ballSpeedKmh: 120 },
      { stepNumber: 6, targetId: 5, durationMs: 1700, ballSpeedKmh: 125 },
      { stepNumber: 7, targetId: 2, durationMs: 1600, ballSpeedKmh: 125 },
      { stepNumber: 8, targetId: 1, durationMs: 1600, ballSpeedKmh: 130 },
    ],
  },
];
