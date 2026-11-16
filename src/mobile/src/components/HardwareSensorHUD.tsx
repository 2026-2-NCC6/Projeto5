/**
 * Smart Tennis Arena — Componente de Status dos Sensores e Disparo da Máquina Spinshot
 * Alinhado com: RF05 (Status dos sensores), RF08 (Atuadores) e RF09 (Parâmetros da Máquina)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import { ShotEvent } from '../hardware/ballMachineSimulator';
import { SlidersIcon } from './Icons';

interface HardwareSensorHUDProps {
  lastShot: ShotEvent | null;
  isHardwareConnected: boolean;
  hardwareDeviceName: string | null;
  goalsMet: boolean;
  currentSeries: number;
  totalSeries: number;
  isKidsMode: boolean;
}

export const HardwareSensorHUD: React.FC<HardwareSensorHUDProps> = ({
  lastShot,
  isHardwareConnected,
  hardwareDeviceName,
  goalsMet,
  currentSeries,
  totalSeries,
  isKidsMode,
}) => {
  const { theme, fs } = useAccessibility();
  const { isMobile, cardPadding } = useResponsive();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          paddingVertical: isMobile ? 8 : cardPadding,
          paddingHorizontal: isMobile ? 11 : cardPadding,
          marginBottom: isMobile ? 8 : 12,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.dot,
              { backgroundColor: isHardwareConnected ? '#22C55E' : '#F59E0B' },
            ]}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.statusText,
              { color: theme.text, fontSize: isMobile ? fs(11) : fs(12) },
            ]}
          >
            {isHardwareConnected
              ? hardwareDeviceName || 'STA-UNO-R3 Conectado'
              : 'Simulador Local Ativo'}
          </Text>
        </View>

        <View
          style={[
            styles.goalsBadge,
            { backgroundColor: goalsMet ? theme.surfaceMint : theme.surfaceMuted },
          ]}
        >
          <Text
            style={[
              styles.goalsText,
              {
                color: goalsMet ? theme.primaryDark : theme.textSecondary,
                fontSize: isMobile ? fs(10.5) : fs(11.5),
              },
            ]}
          >
            {goalsMet ? '🎯 Meta Cumprida!' : `Série ${currentSeries}/${totalSeries}`}
          </Text>
        </View>
      </View>

      {/* Exibição em Tempo Real dos Parâmetros Spinshot (RF09) */}
      {lastShot && (
        <View
          style={[
            styles.machineShotCard,
            { backgroundColor: theme.surfaceMint, borderColor: theme.primaryBorder },
          ]}
        >
          <View style={styles.machineTitleRow}>
            <SlidersIcon size={13} color={theme.primaryDark} />
            <Text style={[styles.machineTitle, { color: theme.primaryDark, fontSize: fs(11) }]}>
              {isKidsMode ? 'Lançador Suave Kids' : 'Disparo Spinshot Plus-2 (RF09)'}
            </Text>
          </View>
          <Text
            numberOfLines={2}
            style={[styles.machineDesc, { color: theme.text, fontSize: fs(11) }]}
          >
            {lastShot.trajectoryDescription} • Alvo #{lastShot.targetId} • Voo: ~
            {lastShot.estimatedFlightMs}ms
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1.5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  statusText: {
    fontWeight: '600',
    flexShrink: 1,
  },
  goalsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  goalsText: {
    fontWeight: '700',
  },
  machineShotCard: {
    marginTop: 7,
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  machineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  machineTitle: {
    fontWeight: '700',
  },
  machineDesc: {
    fontWeight: '500',
  },
});
