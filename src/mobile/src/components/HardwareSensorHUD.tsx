/**
 * Smart Tennis Arena — Componente de Status dos Sensores e Disparo da Máquina Spinshot
 * Alinhado com: RF05 (Status dos sensores), RF08 (Atuadores) e RF09 (Parâmetros da Máquina)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import { ShotEvent } from '../hardware/ballMachineSimulator';
import { CpuIcon, SlidersIcon } from './Icons';

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
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border, padding: cardPadding }]}>
      <View style={styles.topRow}>
        <View style={styles.statusBadge}>
          <View style={[styles.dot, { backgroundColor: isHardwareConnected ? '#22C55E' : '#EF4444' }]} />
          <Text style={[styles.statusText, { color: theme.text, fontSize: fs(12) }]}>
            {isHardwareConnected ? (hardwareDeviceName || 'STA-UNO-R3 Conectado') : 'Hardware Offline (Simulador Ativo)'}
          </Text>
        </View>

        <View style={styles.goalsBadge}>
          <Text style={[styles.goalsText, { color: goalsMet ? theme.primaryDark : theme.textSecondary, fontSize: fs(11.5) }]}>
            {goalsMet ? '🎯 Metas do Treino Cumpridas!' : `Série ${currentSeries} de ${totalSeries}`}
          </Text>
        </View>
      </View>

      {/* Exibição em Tempo Real dos Parâmetros Spinshot (RF09) */}
      {lastShot && (
        <View style={[styles.machineShotCard, { backgroundColor: theme.surfaceMint, borderColor: theme.primaryBorder }]}>
          <View style={styles.machineTitleRow}>
            <SlidersIcon size={14} color={theme.primaryDark} />
            <Text style={[styles.machineTitle, { color: theme.primaryDark, fontSize: fs(12) }]}>
              {isKidsMode ? 'Lançador Suave Kids' : 'Disparo Máquina Spinshot Plus-2 (RF09)'}
            </Text>
          </View>
          <Text style={[styles.machineDesc, { color: theme.text, fontSize: fs(11.5) }]}>
            {lastShot.trajectoryDescription} • Alvo: {lastShot.targetId} • Voo: ~{lastShot.estimatedFlightMs}ms
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
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  statusText: {
    fontWeight: '600',
  },
  goalsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  goalsText: {
    fontWeight: '700',
  },
  machineShotCard: {
    marginTop: 8,
    padding: 8,
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

