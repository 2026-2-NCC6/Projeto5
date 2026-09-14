/**
 * Smart Tennis Arena — Painel Interativo dos 5 Alvos Físicos (TargetBoard)
 * Alinhado com: docs/spec/02-architecture-and-diagrams.md
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TargetId } from '../../../packages/shared/src/protocol/serial';

interface TargetBoardProps {
  activeTarget: TargetId | null;
  ledCount: number; // 0..8 leds acesos no alvo ativo
  lastHitTarget: TargetId | null;
  lastHitResult: 'HIT' | 'WRONG_HIT' | 'MISS' | null;
  isKidsMode: boolean;
  onTargetPress: (targetId: TargetId) => void;
}

export const TargetBoard: React.FC<TargetBoardProps> = ({
  activeTarget,
  ledCount,
  lastHitTarget,
  lastHitResult,
  isKidsMode,
  onTargetPress,
}) => {
  const renderTarget = (id: TargetId, label: string) => {
    const isActive = activeTarget === id;
    const isRecentHit = lastHitTarget === id;

    // Determina cor e estado de iluminação
    let targetBg = '#1E293B';
    let borderColor = '#334155';
    let glowShadow = {};

    if (isActive) {
      targetBg = isKidsMode ? '#F59E0B' : '#0284C7';
      borderColor = '#38BDF8';
      glowShadow = {
        shadowColor: isKidsMode ? '#F59E0B' : '#38BDF8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 18,
        elevation: 10,
      };
    } else if (isRecentHit) {
      if (lastHitResult === 'HIT') {
        targetBg = '#10B981';
        borderColor = '#34D399';
      } else if (lastHitResult === 'WRONG_HIT') {
        targetBg = '#EF4444';
        borderColor = '#F87171';
      } else if (lastHitResult === 'MISS') {
        targetBg = '#475569';
        borderColor = '#64748B';
      }
    }

    // Calcula anel virtual de 8 LEDs
    const leds = [0, 1, 2, 3, 4, 5, 6, 7];

    return (
      <TouchableOpacity
        key={id}
        activeOpacity={0.7}
        style={[styles.targetWrapper, glowShadow]}
        onPress={() => onTargetPress(id)}
      >
        <View style={[styles.targetBox, { backgroundColor: targetBg, borderColor }]}>
          {/* Anel de 8 LEDs virtuais */}
          {leds.map((idx) => {
            const angle = (idx / 8) * 2 * Math.PI - Math.PI / 2;
            const radius = 34;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const isLedLit = isActive && idx < ledCount;

            return (
              <View
                key={idx}
                style={[
                  styles.virtualLed,
                  {
                    transform: [{ translateX: x }, { translateY: y }],
                    backgroundColor: isLedLit
                      ? isKidsMode ? '#FDE047' : '#38BDF8'
                      : 'rgba(255, 255, 255, 0.15)',
                  },
                ]}
              />
            );
          })}

          <Text style={[styles.targetNumber, isActive && styles.targetNumberActive]}>
            {id}
          </Text>
          <Text style={styles.targetLabel}>{label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.boardContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.boardTitle}>PAINEL DE IMPACTO 1x1m (IoT)</Text>
        <Text style={styles.boardSubtitle}>
          {activeTarget
            ? `⚡ Toque no Alvo ${activeTarget} para simular golpe da bola`
            : 'Aguardando início do treino...'}
        </Text>
      </View>

      {/* Grade de Alvos: Superior, Centro, Inferior */}
      <View style={styles.grid}>
        {/* Linha 1: Sup. Esquerdo (1) e Sup. Direito (2) */}
        <View style={styles.row}>
          {renderTarget(1, 'Sup. Esq.')}
          {renderTarget(2, 'Sup. Dir.')}
        </View>

        {/* Linha 2: Centro (5) */}
        <View style={[styles.row, styles.centerRow]}>
          {renderTarget(5, 'Centro')}
        </View>

        {/* Linha 3: Inf. Esquerdo (3) e Inf. Direito (4) */}
        <View style={styles.row}>
          {renderTarget(3, 'Inf. Esq.')}
          {renderTarget(4, 'Inf. Dir.')}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  boardContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#334155',
    marginVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  boardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.5,
  },
  boardSubtitle: {
    fontSize: 12,
    color: '#38BDF8',
    marginTop: 4,
    fontWeight: '600',
  },
  grid: {
    width: '100%',
    maxWidth: 340,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  centerRow: {
    justifyContent: 'center',
  },
  targetWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    position: 'relative',
  },
  virtualLed: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    position: 'absolute',
  },
  targetNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  targetNumberActive: {
    color: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  targetLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
