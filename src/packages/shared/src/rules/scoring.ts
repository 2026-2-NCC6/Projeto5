/**
 * Smart Tennis Arena — Regras de Pontuação Gamificada
 * Alinhado com: docs/spec/01-system-requirements.md (RN03 e RN09)
 */

export interface ScoreCalculationParams {
  remainingMs: number;
  totalMs: number;
  streak: number;
  adcFifoValue: number; // 0..1023
  isCorrectTarget: boolean;
  isKidsMode?: boolean;
}

export interface ScoreCalculationResult {
  pointsAdded: number;
  newStreak: number;
  forceBonus: number;
  streakMultiplier: number;
  timeBonusFactor: number;
}

const P_BASE = 100;
const WRONG_TARGET_PENALTY = -30;

/**
 * Calcula o multiplicador de streak (1.0 até 1.5x)
 */
export function getStreakMultiplier(streak: number): number {
  const effectiveStreak = Math.min(Math.max(0, streak), 5);
  return Number((1.0 + 0.1 * effectiveStreak).toFixed(1));
}

/**
 * Calcula o bônus de força a partir do ADC (0 a 20 pontos)
 */
export function getForceBonus(adcVal: number): number {
  const boundedVal = Math.min(Math.max(0, adcVal), 1023);
  return Math.floor((boundedVal / 1024) * 20);
}

/**
 * Implementação da regra RN03 e RN09 para pontuação determinística.
 */
export function calculateHitScore(params: ScoreCalculationParams): ScoreCalculationResult {
  const {
    remainingMs,
    totalMs,
    streak,
    adcFifoValue,
    isCorrectTarget,
    isKidsMode = false,
  } = params;

  if (!isCorrectTarget) {
    return {
      pointsAdded: isKidsMode ? 0 : WRONG_TARGET_PENALTY,
      newStreak: 0,
      forceBonus: 0,
      streakMultiplier: 1.0,
      timeBonusFactor: 0,
    };
  }

  // Tempo restante limitado entre 0 e totalMs
  const boundedRemaining = Math.max(0, Math.min(remainingMs, totalMs));
  const timeBonusFactor = totalMs > 0 ? boundedRemaining / totalMs : 0;
  const streakMultiplier = getStreakMultiplier(streak);
  const forceBonus = getForceBonus(adcFifoValue);

  // P = (P_base * (1 + T_rest/T_total) * M_streak) + B_force
  const rawPoints = (P_BASE * (1 + timeBonusFactor) * streakMultiplier) + forceBonus;
  const pointsAdded = Math.round(rawPoints);

  return {
    pointsAdded,
    newStreak: streak + 1,
    forceBonus,
    streakMultiplier,
    timeBonusFactor,
  };
}
