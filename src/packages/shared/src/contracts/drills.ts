/**
<<<<<<< HEAD
 * Smart Tennis Arena — Modelos, Validação e Contratos de Treinos (Drills)
 * Alinhado com: RF03, RF04, RF09, RF14, RF15, RF16, RF18, RF20
=======
 * Smart Tennis Arena — Modelos, Contratos, Versionamento, Validação e Marketplace de Treinos (Drills)
 * Alinhado com: RF03, RF04, RF09, RF10, RF14, RF15, RF16, RF18, RF20
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
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

export type DrillTargetAudience =
  | 'KIDS'
  | 'INICIANTES'
  | 'INTERMEDIARIOS'
  | 'AVANCADOS'
  | 'TODOS';

export type DrillRequiredSensor =
  | 'PIEZO_TARGETS'
  | 'LED_RING'
  | 'BUZZER'
  | 'EMERGENCY_STOP'
  | 'DISPLAY'
  | 'BALL_MACHINE_SIM';

export type BallOscillationMode =
  | 'NONE'
  | 'HORIZONTAL'
  | 'VERTICAL'
  | 'RANDOM'
  | 'TWO_LINE';

export type DrillLifecycleStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type MarketplaceLicenseType =
  | 'OPEN_EDUCATIONAL'
  | 'PERSONAL_USE'
  | 'CLUB_COMMERCIAL'
  | 'PREMIUM_EXCLUSIVE';

export type MarketplaceMonetizationModel =
  | 'FREE'
  | 'ONE_TIME_PURCHASE'
  | 'SUBSCRIPTION'
  | 'REVENUE_SHARE';

/**
 * Etapa individual do exercício com parâmetros de janela IoT e máquina lançadora Spinshot (RF09, RF14)
 */
export interface DrillStep {
  stepNumber: number;
  targetId: TargetId;
  durationMs: number;
  ballSpeedKmh?: number;
  spinType?: 'FLAT' | 'TOPSPIN' | 'BACKSPIN';
<<<<<<< HEAD
  feedIntervalMs?: number;
=======
  spinIntensity?: number; // -10 (backspin intenso) a +10 (topspin intenso)
  horizontalAngleDeg?: number; // -25 (esquerda) a +25 (direita)
  elevationDeg?: number; // 5° a 45° (altura da trajetória)
  oscillationMode?: BallOscillationMode;
  feedIntervalMs?: number; // Intervalo de alimentação da bola (ms)
  instruction?: string;
}

/**
 * Regras parametrizáveis de pontuação, séries e critérios de conclusão do treino (RF10, RF14)
 */
export interface DrillScoringRules {
  basePoints: number;
  timeBonusWeight: number;
  wrongTargetPenalty: number;
  kidsWrongTargetPenalty: number;
  maxStreakMultiplier: number;
  seriesCount: number;
  targetScoreGoal: number;
  minAccuracyPercent: number;
  completionCriteria: string;
}

/**
 * Instruções, equipamentos, posicionamento e checklist de segurança pré-sessão (RF04)
 */
export interface DrillPreparationInfo {
  courtPositioning: string;
  requiredEquipment: string[];
  safetyInstructions: string[];
  physicalRisks: string[];
}

/**
 * Metadados comerciais e de licenciamento para futuro Marketplace (RF20 — sem cobrança obrigatória no MVP)
 */
export interface DrillMarketplaceMetadata {
  commercialDescription: string;
  categorySlug: string;
  compatibleMachines: string[];
  compatibleHardware: string[];
  licenseType: MarketplaceLicenseType;
  monetizationModel: MarketplaceMonetizationModel;
  suggestedPriceBrl: number;
  revenueSharePercent: number;
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
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
<<<<<<< HEAD
  authorId?: number;
  status?: DrillStatus;
  publishedAt?: string;
  updatedAt?: string;
=======
  authorUserId?: number | null;
  status?: DrillLifecycleStatus;
  publishedAt?: string | null;
  targetAudience?: DrillTargetAudience;
  objective?: string;
  estimatedDurationSec?: number;
  requiredSensors?: DrillRequiredSensor[];
  scoringRules?: DrillScoringRules;
  preparation?: DrillPreparationInfo;
  marketplace?: DrillMarketplaceMetadata;
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
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
 * Registro imutável de versão e changelog de treino (RF16, RF18)
 */
export interface DrillVersionRecord {
  id: number;
  drillId: string;
  version: string;
  status: DrillLifecycleStatus;
  changelog: string;
  compatibleMachines: string[];
  compatibleHardware: string[];
  publishedAt: string | null;
  createdByUserId: number | null;
  createdByName: string;
  snapshot: DrillDefinition;
  createdAt: string;
}

export interface CreateOrUpdateDrillDto {
  id?: string;
  title: string;
  description: string;
  category: DrillCategory;
  difficulty: DrillDifficulty;
  recommendedAgeMin?: number;
  recommendedAgeMax?: number;
  isKidsAdapted: boolean;
  version?: string;
  changelog?: string;
  targetAudience?: DrillTargetAudience;
  objective?: string;
  estimatedDurationSec?: number;
  requiredSensors?: DrillRequiredSensor[];
  scoringRules?: DrillScoringRules;
  preparation?: DrillPreparationInfo;
  marketplace?: DrillMarketplaceMetadata;
  steps: DrillStep[];
}

export interface DrillValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  computedDurationSec: number;
}

/**
 * Validador determinístico pré-publicação de treinos (RF14, RF15, RF16)
 * Verifica estados, limites seguros da máquina lançadora, janelas de sensores e regras Kids.
 */
export function validateDrillDefinition(drill: Partial<CreateOrUpdateDrillDto>): DrillValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!drill.title || drill.title.trim().length < 4 || drill.title.trim().length > 140) {
    errors.push('O título do treino deve possuir entre 4 e 140 caracteres.');
  }

  if (!drill.description || drill.description.trim().length < 10) {
    errors.push('A descrição técnica/pedagógica deve possuir pelo menos 10 caracteres.');
  }

  const validCategories = Object.values(DrillCategory);
  if (!drill.category || !validCategories.includes(drill.category)) {
    errors.push('Categoria de treino inválida.');
  }

  if (
    typeof drill.difficulty !== 'number' ||
    drill.difficulty < DrillDifficulty.BEGINNER ||
    drill.difficulty > DrillDifficulty.PRO
  ) {
    errors.push('Nível de dificuldade deve estar entre 1 (BEGINNER) e 5 (PRO).');
  }

  if (!Array.isArray(drill.steps) || drill.steps.length === 0) {
    errors.push('O treino deve conter pelo menos 1 etapa na sequência de exercícios.');
  } else if (drill.steps.length > 60) {
    errors.push('O treino não pode exceder 60 etapas por série no MVP.');
  }

  let totalMs = 0;

  if (Array.isArray(drill.steps)) {
    drill.steps.forEach((step, idx) => {
      const label = `Etapa #${idx + 1}`;
      if (![1, 2, 3, 4, 5].includes(step.targetId)) {
        errors.push(`${label}: alvo inválido (${String(step.targetId)}). Use zonas de 1 a 5.`);
      }
      if (typeof step.durationMs !== 'number' || step.durationMs < 800 || step.durationMs > 15000) {
        errors.push(`${label}: janela de tempo (${step.durationMs}ms) fora do intervalo seguro [800ms..15000ms].`);
      } else {
        totalMs += step.durationMs + (step.feedIntervalMs ?? 900);
      }

      if (step.ballSpeedKmh !== undefined) {
        if (step.ballSpeedKmh < 20 || step.ballSpeedKmh > 135) {
          errors.push(`${label}: velocidade da máquina (${step.ballSpeedKmh} km/h) fora do limite físico Spinshot [20..135 km/h].`);
        }
        if (drill.isKidsAdapted && step.ballSpeedKmh > 65) {
          errors.push(`${label}: treinos infantis (Modo Kids) não permitem bolas acima de 65 km/h por segurança física.`);
        }
      }

      if (
        step.elevationDeg !== undefined &&
        (step.elevationDeg < 5 || step.elevationDeg > 45)
      ) {
        errors.push(`${label}: ângulo de elevação (${step.elevationDeg}°) fora do intervalo [5°..45°].`);
      }

      if (
        step.horizontalAngleDeg !== undefined &&
        (step.horizontalAngleDeg < -25 || step.horizontalAngleDeg > 25)
      ) {
        errors.push(`${label}: ângulo horizontal (${step.horizontalAngleDeg}°) fora do intervalo [-25°..+25°].`);
      }
    });
  }

  if (drill.isKidsAdapted && drill.scoringRules && drill.scoringRules.kidsWrongTargetPenalty < 0) {
    warnings.push('Modo Kids recomenda penalidade zero (0 pts) para erro de alvo (RN09).');
  }

  if (drill.scoringRules) {
    if (drill.scoringRules.basePoints <= 0 || drill.scoringRules.basePoints > 1000) {
      errors.push('Pontuação base deve estar entre 1 e 1000 pontos.');
    }
    if (drill.scoringRules.minAccuracyPercent < 0 || drill.scoringRules.minAccuracyPercent > 100) {
      errors.push('Meta mínima de precisão deve estar entre 0% e 100%.');
    }
  }

  const seriesMultiplier = drill.scoringRules?.seriesCount ?? 1;
  const computedDurationSec = Math.max(10, Math.round((totalMs * seriesMultiplier) / 1000));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    computedDurationSec,
  };
}

/**
 * Treinos pré-definidos padrão para teste inicial, sementes da API e fallback offline (RF03, RF18, RF21)
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
<<<<<<< HEAD
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
=======
    publishedAt: '2026-08-15T12:00:00.000Z',
    targetAudience: 'KIDS',
    objective: 'Desenvolver coordenação motora óculo-manual, noção espacial e prazer pelo esporte sem punição por erro.',
    estimatedDurationSec: 32,
    requiredSensors: ['PIEZO_TARGETS', 'LED_RING', 'BUZZER', 'EMERGENCY_STOP', 'BALL_MACHINE_SIM'],
    scoringRules: {
      basePoints: 100,
      timeBonusWeight: 1.0,
      wrongTargetPenalty: 0,
      kidsWrongTargetPenalty: 0,
      maxStreakMultiplier: 1.5,
      seriesCount: 1,
      targetScoreGoal: 650,
      minAccuracyPercent: 50,
      completionCriteria: 'Concluir as 6 etapas lúdicas com alegria e acertar ao menos 3 estrelas luminosas.',
    },
    preparation: {
      courtPositioning: 'Posicionar a criança na linha de saque (quadra reduzida Kids / bola laranja ou vermelha).',
      requiredEquipment: ['Raquete infantil (19" a 25")', 'Bolas baixa pressão (Red/Orange Dot)', 'Painel de 5 alvos IoT'],
      safetyInstructions: [
        'Confirmar supervisão presencial do treinador ou responsável legal.',
        'Garantir área livre de bolas espalhadas ao redor dos pés da criança.',
        'Testar botão de parada segura (!EMG) antes de iniciar.',
      ],
      physicalRisks: ['Tropeço em bolas soltas no piso', 'Impacto leve caso se aproxime a menos de 2m do lançador'],
    },
    marketplace: {
      commercialDescription: 'Módulo pedagógico infantil certificado para escolinhas e clubes com narrativa de alvos luminosos.',
      categorySlug: 'kids-ludico',
      compatibleMachines: ['SPINSHOT_PLUS_2', 'SPINSHOT_PLAYER', 'STA_SIMULATOR_V1'],
      compatibleHardware: ['STA-UNO-R3', 'ESP32-BRIDGE', 'MOCK-DRIVER'],
      licenseType: 'OPEN_EDUCATIONAL',
      monetizationModel: 'FREE',
      suggestedPriceBrl: 0,
      revenueSharePercent: 0,
    },
    steps: [
      { stepNumber: 1, targetId: 5, durationMs: 4000, ballSpeedKmh: 38, spinType: 'FLAT', spinIntensity: 0, horizontalAngleDeg: 0, elevationDeg: 22, oscillationMode: 'NONE', feedIntervalMs: 1400, instruction: 'Rebata no alvo central brilhante!' },
      { stepNumber: 2, targetId: 1, durationMs: 4000, ballSpeedKmh: 40, spinType: 'TOPSPIN', spinIntensity: 2, horizontalAngleDeg: -10, elevationDeg: 24, oscillationMode: 'NONE', feedIntervalMs: 1400, instruction: 'Mire na estrela superior esquerda!' },
      { stepNumber: 3, targetId: 2, durationMs: 4000, ballSpeedKmh: 40, spinType: 'TOPSPIN', spinIntensity: 2, horizontalAngleDeg: 10, elevationDeg: 24, oscillationMode: 'NONE', feedIntervalMs: 1400, instruction: 'Agora na estrela superior direita!' },
      { stepNumber: 4, targetId: 5, durationMs: 4000, ballSpeedKmh: 42, spinType: 'FLAT', spinIntensity: 0, horizontalAngleDeg: 0, elevationDeg: 20, oscillationMode: 'NONE', feedIntervalMs: 1400, instruction: 'Volte ao centro mágico!' },
      { stepNumber: 5, targetId: 3, durationMs: 4000, ballSpeedKmh: 38, spinType: 'FLAT', spinIntensity: 0, horizontalAngleDeg: -8, elevationDeg: 18, oscillationMode: 'NONE', feedIntervalMs: 1400, instruction: 'Toque suave no canto inferior esquerdo!' },
      { stepNumber: 6, targetId: 4, durationMs: 4000, ballSpeedKmh: 38, spinType: 'FLAT', spinIntensity: 0, horizontalAngleDeg: 8, elevationDeg: 18, oscillationMode: 'NONE', feedIntervalMs: 1400, instruction: 'Grande final no canto inferior direito!' },
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
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
<<<<<<< HEAD
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
=======
    targetAudience: 'AVANCADOS',
    objective: 'Reduzir o tempo de reação neuromuscular abaixo de 1400ms sob bolas rápidas de fundo de quadra.',
    estimatedDurationSec: 34,
    requiredSensors: ['PIEZO_TARGETS', 'LED_RING', 'BUZZER', 'EMERGENCY_STOP', 'BALL_MACHINE_SIM'],
    scoringRules: {
      basePoints: 100,
      timeBonusWeight: 1.0,
      wrongTargetPenalty: -30,
      kidsWrongTargetPenalty: 0,
      maxStreakMultiplier: 1.5,
      seriesCount: 1,
      targetScoreGoal: 1450,
      minAccuracyPercent: 70,
      completionCriteria: 'Atingir pelo menos 70% de precisão e pontuação mínima de 1450 pts sem acionar alvo incorreto.',
    },
    preparation: {
      courtPositioning: 'Posicionar-se 1 metro atrás da linha de base central em split-step ativo.',
      requiredEquipment: ['Raquete adulto padrão', 'Calçado específico de tênis', 'Controlador STA-UNO-R3 + Lançadora/Simulador'],
      safetyInstructions: [
        'Verificar se não há pessoas ou objetos na zona de disparo (até 120 km/h).',
        'Realizar aquecimento articular de ombros, punhos e tornozelos antes do início.',
        'Manter o botão de emergência acessível na lateral da quadra.',
      ],
      physicalRisks: ['Bolas em alta velocidade (95 a 120 km/h)', 'Deslocamento lateral explosivo — risco de torção sem calçado adequado'],
    },
    marketplace: {
      commercialDescription: 'Treino de reação competitiva inspirado em circuitos ATP/WTA para academias de alto rendimento.',
      categorySlug: 'reacao-competitiva',
      compatibleMachines: ['SPINSHOT_PLUS_2', 'SPINSHOT_PLAYER', 'STA_SIMULATOR_V1'],
      compatibleHardware: ['STA-UNO-R3', 'ESP32-BRIDGE', 'MOCK-DRIVER'],
      licenseType: 'CLUB_COMMERCIAL',
      monetizationModel: 'SUBSCRIPTION',
      suggestedPriceBrl: 29.9,
      revenueSharePercent: 70,
    },
    steps: [
      { stepNumber: 1, targetId: 1, durationMs: 2800, ballSpeedKmh: 95, spinType: 'TOPSPIN', spinIntensity: 5, horizontalAngleDeg: -14, elevationDeg: 16, oscillationMode: 'HORIZONTAL', feedIntervalMs: 1000, instruction: 'Forehand fundo cruzado rápido' },
      { stepNumber: 2, targetId: 4, durationMs: 2800, ballSpeedKmh: 100, spinType: 'FLAT', spinIntensity: 0, horizontalAngleDeg: 12, elevationDeg: 12, oscillationMode: 'HORIZONTAL', feedIntervalMs: 1000, instruction: 'Ataque na paralela direita' },
      { stepNumber: 3, targetId: 2, durationMs: 2600, ballSpeedKmh: 95, spinType: 'TOPSPIN', spinIntensity: 6, horizontalAngleDeg: 15, elevationDeg: 17, oscillationMode: 'TWO_LINE', feedIntervalMs: 1000, instruction: 'Backhand profundo no canto superior' },
      { stepNumber: 4, targetId: 3, durationMs: 2600, ballSpeedKmh: 105, spinType: 'BACKSPIN', spinIntensity: -4, horizontalAngleDeg: -12, elevationDeg: 10, oscillationMode: 'RANDOM', feedIntervalMs: 950, instruction: 'Subida rápida para bola curta esquerda' },
      { stepNumber: 5, targetId: 5, durationMs: 2400, ballSpeedKmh: 110, spinType: 'FLAT', spinIntensity: 1, horizontalAngleDeg: 0, elevationDeg: 14, oscillationMode: 'NONE', feedIntervalMs: 950, instruction: 'Winner pelo centro estratégico' },
      { stepNumber: 6, targetId: 1, durationMs: 2400, ballSpeedKmh: 110, spinType: 'TOPSPIN', spinIntensity: 6, horizontalAngleDeg: -16, elevationDeg: 15, oscillationMode: 'RANDOM', feedIntervalMs: 900, instruction: 'Forehand angular em velocidade' },
      { stepNumber: 7, targetId: 2, durationMs: 2200, ballSpeedKmh: 112, spinType: 'TOPSPIN', spinIntensity: 6, horizontalAngleDeg: 16, elevationDeg: 15, oscillationMode: 'RANDOM', feedIntervalMs: 900, instruction: 'Transição rápida para backhand fundo' },
      { stepNumber: 8, targetId: 4, durationMs: 2200, ballSpeedKmh: 115, spinType: 'FLAT', spinIntensity: 0, horizontalAngleDeg: 14, elevationDeg: 11, oscillationMode: 'HORIZONTAL', feedIntervalMs: 850, instruction: 'Definir ponto na paralela baixa' },
      { stepNumber: 9, targetId: 3, durationMs: 2000, ballSpeedKmh: 115, spinType: 'BACKSPIN', spinIntensity: -5, horizontalAngleDeg: -14, elevationDeg: 10, oscillationMode: 'RANDOM', feedIntervalMs: 850, instruction: 'Resposta curta reflexa à esquerda' },
      { stepNumber: 10, targetId: 5, durationMs: 2000, ballSpeedKmh: 120, spinType: 'FLAT', spinIntensity: 0, horizontalAngleDeg: 0, elevationDeg: 12, oscillationMode: 'NONE', feedIntervalMs: 850, instruction: 'Fechamento de potência no centro' },
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
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
<<<<<<< HEAD
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
=======
    publishedAt: '2026-08-22T10:00:00.000Z',
    targetAudience: 'INTERMEDIARIOS',
    objective: 'Aprimorar controle direcional cruzado e consistência de batida alternando forehand e backhand.',
    estimatedDurationSec: 33,
    requiredSensors: ['PIEZO_TARGETS', 'LED_RING', 'BUZZER', 'EMERGENCY_STOP', 'BALL_MACHINE_SIM'],
    scoringRules: {
      basePoints: 100,
      timeBonusWeight: 1.0,
      wrongTargetPenalty: -30,
      kidsWrongTargetPenalty: 0,
      maxStreakMultiplier: 1.5,
      seriesCount: 1,
      targetScoreGoal: 1150,
      minAccuracyPercent: 75,
      completionCriteria: 'Alcançar 75% de acertos nas diagonais mantendo regularidade de tempo de reação.',
    },
    preparation: {
      courtPositioning: 'Posicionar-se no centro da linha de base, recuperando posição central após cada golpe.',
      requiredEquipment: ['Raquete de tênis', 'Painel de alvos piezoeletrônicos calibrado', 'Simulador ou Spinshot Plus-2'],
      safetyInstructions: [
        'Manter área de disparo desobstruída antes de iniciar a contagem regressiva.',
        'Interromper imediatamente com !EMG caso haja bola presa ou pessoa em quadra.',
      ],
      physicalRisks: ['Fadiga moderada de membros inferiores e tronco'],
    },
    marketplace: {
      commercialDescription: 'Protocolo técnico de consistência cruzada ideal para aulas em grupo e evolução tática.',
      categorySlug: 'precisao-tecnica',
      compatibleMachines: ['SPINSHOT_PLUS_2', 'SPINSHOT_PLAYER', 'STA_SIMULATOR_V1'],
      compatibleHardware: ['STA-UNO-R3', 'ESP32-BRIDGE', 'MOCK-DRIVER'],
      licenseType: 'PERSONAL_USE',
      monetizationModel: 'ONE_TIME_PURCHASE',
      suggestedPriceBrl: 19.9,
      revenueSharePercent: 75,
    },
    steps: [
      { stepNumber: 1, targetId: 1, durationMs: 3200, ballSpeedKmh: 80, spinType: 'TOPSPIN', spinIntensity: 4, horizontalAngleDeg: -12, elevationDeg: 18, oscillationMode: 'TWO_LINE', feedIntervalMs: 1100, instruction: 'Forehand cruzado controlado' },
      { stepNumber: 2, targetId: 2, durationMs: 3200, ballSpeedKmh: 80, spinType: 'TOPSPIN', spinIntensity: 4, horizontalAngleDeg: 12, elevationDeg: 18, oscillationMode: 'TWO_LINE', feedIntervalMs: 1100, instruction: 'Backhand cruzado fundo' },
      { stepNumber: 3, targetId: 3, durationMs: 3000, ballSpeedKmh: 85, spinType: 'BACKSPIN', spinIntensity: -3, horizontalAngleDeg: -10, elevationDeg: 14, oscillationMode: 'HORIZONTAL', feedIntervalMs: 1100, instruction: 'Approach curto na diagonal esquerda' },
      { stepNumber: 4, targetId: 4, durationMs: 3000, ballSpeedKmh: 85, spinType: 'BACKSPIN', spinIntensity: -3, horizontalAngleDeg: 10, elevationDeg: 14, oscillationMode: 'HORIZONTAL', feedIntervalMs: 1100, instruction: 'Approach curto na diagonal direita' },
      { stepNumber: 5, targetId: 5, durationMs: 3000, ballSpeedKmh: 85, spinType: 'FLAT', spinIntensity: 0, horizontalAngleDeg: 0, elevationDeg: 16, oscillationMode: 'NONE', feedIntervalMs: 1100, instruction: 'Bola neutra profunda no T central' },
      { stepNumber: 6, targetId: 1, durationMs: 2800, ballSpeedKmh: 90, spinType: 'TOPSPIN', spinIntensity: 5, horizontalAngleDeg: -15, elevationDeg: 17, oscillationMode: 'TWO_LINE', feedIntervalMs: 1050, instruction: 'Aceleração de forehand no canto 1' },
      { stepNumber: 7, targetId: 4, durationMs: 2800, ballSpeedKmh: 90, spinType: 'FLAT', spinIntensity: 1, horizontalAngleDeg: 13, elevationDeg: 13, oscillationMode: 'HORIZONTAL', feedIntervalMs: 1050, instruction: 'Mudança de direção na paralela 4' },
      { stepNumber: 8, targetId: 2, durationMs: 2800, ballSpeedKmh: 90, spinType: 'TOPSPIN', spinIntensity: 5, horizontalAngleDeg: 15, elevationDeg: 17, oscillationMode: 'TWO_LINE', feedIntervalMs: 1050, instruction: 'Finalização firme de backhand no canto 2' },
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
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
<<<<<<< HEAD
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
=======
    publishedAt: '2026-08-25T16:00:00.000Z',
    targetAudience: 'AVANCADOS',
    objective: 'Sustentar potência e precisão sob fadiga anaeróbica com janelas progressivas até 1600ms e bolas a 130 km/h.',
    estimatedDurationSec: 22,
    requiredSensors: ['PIEZO_TARGETS', 'LED_RING', 'BUZZER', 'EMERGENCY_STOP', 'BALL_MACHINE_SIM'],
    scoringRules: {
      basePoints: 100,
      timeBonusWeight: 1.0,
      wrongTargetPenalty: -30,
      kidsWrongTargetPenalty: 0,
      maxStreakMultiplier: 1.5,
      seriesCount: 1,
      targetScoreGoal: 1300,
      minAccuracyPercent: 75,
      completionCriteria: 'Completar o circuito de alta intensidade com pelo menos 6 acertos em 8 disparos.',
    },
    preparation: {
      courtPositioning: 'Linha de base central em postura atlética de alta intensidade.',
      requiredEquipment: ['Raquete performance', 'Hidratação próxima', 'Painel IoT calibrado com limiar >= 250 ADC'],
      safetyInstructions: [
        'Exclusivo para praticantes aptos fisicamente e sem restrição cardiovascular ativa.',
        'Conferir fixação mecânica dos 5 alvos para impactos de alta energia.',
        'Confirmar área de segurança totalmente isolada antes do disparo.',
      ],
      physicalRisks: ['Alta intensidade cardiorrespiratória', 'Velocidade elevada de bola (até 130 km/h)'],
    },
    marketplace: {
      commercialDescription: 'Série oficial de condicionamento específico para tenistas competitivos com telemetria de força.',
      categorySlug: 'resistencia-pro',
      compatibleMachines: ['SPINSHOT_PLAYER', 'STA_SIMULATOR_V1'],
      compatibleHardware: ['STA-UNO-R3', 'ESP32-BRIDGE'],
      licenseType: 'PREMIUM_EXCLUSIVE',
      monetizationModel: 'REVENUE_SHARE',
      suggestedPriceBrl: 49.9,
      revenueSharePercent: 80,
    },
    steps: [
      { stepNumber: 1, targetId: 5, durationMs: 2000, ballSpeedKmh: 110, spinType: 'FLAT', spinIntensity: 0, horizontalAngleDeg: 0, elevationDeg: 14, oscillationMode: 'RANDOM', feedIntervalMs: 850, instruction: 'Split-step e batida firme no centro' },
      { stepNumber: 2, targetId: 1, durationMs: 1900, ballSpeedKmh: 115, spinType: 'TOPSPIN', spinIntensity: 7, horizontalAngleDeg: -18, elevationDeg: 16, oscillationMode: 'RANDOM', feedIntervalMs: 850, instruction: 'Cobertura máxima no forehand fundo' },
      { stepNumber: 3, targetId: 4, durationMs: 1900, ballSpeedKmh: 115, spinType: 'FLAT', spinIntensity: 2, horizontalAngleDeg: 16, elevationDeg: 12, oscillationMode: 'HORIZONTAL', feedIntervalMs: 850, instruction: 'Contra-ataque na paralela direita' },
      { stepNumber: 4, targetId: 2, durationMs: 1800, ballSpeedKmh: 120, spinType: 'TOPSPIN', spinIntensity: 7, horizontalAngleDeg: 18, elevationDeg: 16, oscillationMode: 'RANDOM', feedIntervalMs: 800, instruction: 'Transição explosiva para backhand' },
      { stepNumber: 5, targetId: 3, durationMs: 1800, ballSpeedKmh: 120, spinType: 'BACKSPIN', spinIntensity: -6, horizontalAngleDeg: -15, elevationDeg: 10, oscillationMode: 'RANDOM', feedIntervalMs: 800, instruction: 'Arranque curto diagonal esquerda' },
      { stepNumber: 6, targetId: 5, durationMs: 1700, ballSpeedKmh: 125, spinType: 'FLAT', spinIntensity: 0, horizontalAngleDeg: 0, elevationDeg: 13, oscillationMode: 'NONE', feedIntervalMs: 800, instruction: 'Recuperação imediata e centro potente' },
      { stepNumber: 7, targetId: 2, durationMs: 1600, ballSpeedKmh: 125, spinType: 'TOPSPIN', spinIntensity: 8, horizontalAngleDeg: 20, elevationDeg: 15, oscillationMode: 'RANDOM', feedIntervalMs: 750, instruction: 'Defesa agressiva de backhand sub-1.6s' },
      { stepNumber: 8, targetId: 1, durationMs: 1600, ballSpeedKmh: 130, spinType: 'FLAT', spinIntensity: 2, horizontalAngleDeg: -20, elevationDeg: 12, oscillationMode: 'RANDOM', feedIntervalMs: 750, instruction: 'Winner final de máxima velocidade' },
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
    ],
  },
];
