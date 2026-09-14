/**
 * Smart Tennis Arena — Head-Up Display de Pontuação e Tempo (ScoreHUD)
 * Alinhado com: docs/spec/01 (RN03)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStreakMultiplier } from '../../../packages/shared/src/rules/scoring';

interface ScoreHUDProps {
  score: number;
  streak: number;
  remainingMs: number;
  totalMs: number;
  currentStep: number;
  totalSteps: number;
  lastPointsAdded: number;
  lastHitResult: 'HIT' | 'WRONG_HIT' | 'MISS' | null;
  isKidsMode: boolean;
}

export const ScoreHUD: React.FC<ScoreHUDProps> = ({
  score,
  streak,
  remainingMs,
  totalMs,
  currentStep,
  totalSteps,
  lastPointsAdded,
  lastHitResult,
  isKidsMode,
}) => {
  const multiplier = getStreakMultiplier(streak);
  const remainingSec = (remainingMs / 1000).toFixed(1);

  return (
    <View style={styles.container}>
      {/* Pontuação Principal e Multiplicador */}
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>{isKidsMode ? '⭐ ESTRELAS' : 'PONTOS'}</Text>
        <Text style={[styles.scoreValue, isKidsMode && styles.scoreKids]}>
          {score}
        </Text>
        {lastPointsAdded !== 0 && (
          <Text
            style={[
              styles.deltaPoints,
              lastPointsAdded > 0 ? styles.deltaPositive : styles.deltaNegative,
            ]}
          >
            {lastPointsAdded > 0 ? `+${lastPointsAdded}` : lastPointsAdded}
          </Text>
        )}
      </View>

      {/* Combo / Streak */}
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>COMBO / STREAK</Text>
        <View style={styles.streakRow}>
          <Text style={styles.streakValue}>🔥 {streak}</Text>
          <View style={styles.multiplierBadge}>
            <Text style={styles.multiplierText}>{multiplier}x</Text>
          </View>
        </View>
      </View>

      {/* Tempo Restante do Alvo */}
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>TEMPO DO ALVO</Text>
        <Text
          style={[
            styles.timerValue,
            remainingMs < 1000 && remainingMs > 0 && styles.timerUrgent,
          ]}
        >
          {remainingSec}s
        </Text>
        <Text style={styles.stepInfo}>
          Etapa {currentStep + 1}/{totalSteps}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
    marginVertical: 6,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#38BDF8',
  },
  scoreKids: {
    color: '#FBBF24',
  },
  deltaPoints: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  deltaPositive: {
    color: '#10B981',
  },
  deltaNegative: {
    color: '#EF4444',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  streakValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F97316',
  },
  multiplierBadge: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  multiplierText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timerValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  timerUrgent: {
    color: '#EF4444',
  },
  stepInfo: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
});
