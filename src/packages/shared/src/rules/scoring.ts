/**
 * Smart Tennis Arena — Regras de Pontuação Gamificada
 * Alinhado com: docs/spec/01-system-requirements.md (RN03 e RN09)
 */

import type { DrillScoringRules } from '../contracts/drills';

export interface ScoreCalculationParams {
  remainingMs: number;
  totalMs: number;
  streak: number;
  adcFifoValue: number; // 0..1023
  isCorrectTarget: boolean;
  isKidsMode?: boolean;
  rules?: Partial<DrillScoringRules>;
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
 * Calcula o multiplicador de streak (1.0 até maxMultiplier, padrão 1.5x)
 */
export function getStreakMultiplier(streak: number, maxMultiplier: number = 1.5): number {
  const boundedMax = Math.max(1.0, maxMultiplier);
  const raw = 1.0 + 0.1 * Math.max(0, streak);
  return Number(Math.min(raw, boundedMax).toFixed(2));
}

/**
 * Calcula o bônus de força a partir do ADC (0 a 20 pontos)
 */
export function getForceBonus(adcVal: number): number {
  const boundedVal = Math.min(Math.max(0, adcVal), 1023);
  return Math.floor((boundedVal / 1024) * 20);
}

/**
 * Implementação da regra RN03 e RN09 para pontuação determinística parametrizável.
 */
export function calculateHitScore(params: ScoreCalculationParams): ScoreCalculationResult {
  const {
    remainingMs,
    totalMs,
    streak,
    adcFifoValue,
    isCorrectTarget,
    isKidsMode = false,
    rules,
  } = params;

  const basePoints = rules?.basePoints ?? P_BASE;
  const timeBonusWeight = rules?.timeBonusWeight ?? 1.0;
  const maxStreakMultiplier = rules?.maxStreakMultiplier ?? 1.5;
  const wrongTargetPenalty = rules?.wrongTargetPenalty ?? WRONG_TARGET_PENALTY;
  const kidsWrongTargetPenalty = rules?.kidsWrongTargetPenalty ?? 0;

  if (!isCorrectTarget) {
    return {
      pointsAdded: isKidsMode ? kidsWrongTargetPenalty : wrongTargetPenalty,
      newStreak: 0,
      forceBonus: 0,
      streakMultiplier: 1.0,
      timeBonusFactor: 0,
    };
  }

  // Tempo restante limitado entre 0 e totalMs
  const boundedRemaining = Math.max(0, Math.min(remainingMs, totalMs));
  const timeBonusFactor = (totalMs > 0 ? boundedRemaining / totalMs : 0) * timeBonusWeight;
  const streakMultiplier = getStreakMultiplier(streak, maxStreakMultiplier);
  const forceBonus = getForceBonus(adcFifoValue);

  // P = (P_base * (1 + (T_rest/T_total) * peso) * M_streak) + B_force
  const rawPoints = (basePoints * (1 + timeBonusFactor) * streakMultiplier) + forceBonus;
  const pointsAdded = Math.round(rawPoints);

  return {
    pointsAdded,
    newStreak: streak + 1,
    forceBonus,
    streakMultiplier,
    timeBonusFactor,
  };
}
