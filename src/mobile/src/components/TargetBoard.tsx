/**
 * Smart Tennis Arena — Quadra Interativa • Matriz de Sensores (TargetBoard)
 * Alinhado com: RF06 (Pausar, Retomar, Abortar e Execução), RF08 (Atuadores) e RF22 (Parada Segura)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TargetId } from '../../../packages/shared/src/protocol/serial';
import { GameState } from '../../../packages/shared/src/fsm/types';
import {
  TARGET_LABELS,
  TARGET_TACTICAL_NAMES,
} from '../../../packages/shared/src/contracts/drills';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import { PlayIcon, TargetIcon, AwardIcon } from './Icons';
import { EmergencyStopButton } from './EmergencyStopButton';

interface TargetBoardProps {
  activeTarget: TargetId | null;
  ledCount: number; // 0..8 leds acesos no alvo ativo
  remainingMs: number;
  totalMs: number;
  lastHitTarget: TargetId | null;
  lastHitResult: 'HIT' | 'WRONG_HIT' | 'MISS' | null;
  isKidsMode: boolean;
  gameState: GameState;
  countdownValue: number;
  emergencyAlert: string | null;
  onToggleMode: (kids: boolean) => void;
  onTargetPress: (targetId: TargetId) => void;
  onStartSession: () => void;
  onPauseSession?: () => void;
  onResumeSession?: () => void;
  onAbortSession?: () => void;
  onTriggerStop: (reason?: string) => void;
  onResetStop: () => void;
  onViewSummary: () => void;
}

export const TargetBoard: React.FC<TargetBoardProps> = ({
  activeTarget,
  ledCount,
  lastHitTarget,
  lastHitResult,
  isKidsMode,
  gameState,
  countdownValue,
  emergencyAlert,
  onToggleMode,
  onTargetPress,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onAbortSession,
  onTriggerStop,
  onResetStop,
  onViewSummary,
}) => {
  const { theme, fs } = useAccessibility();
  const { isMobile, cardPadding } = useResponsive();

  const isPlaying =
    gameState === GameState.RUNNING_TARGET_ACTIVE ||
    gameState === GameState.TARGET_HIT ||
    gameState === GameState.TARGET_MISS_TIMEOUT;

  const isPaused = gameState === GameState.PAUSED;

  const renderSensorModule = (targetId: TargetId, isCenter: boolean = false) => {
    const isActive = activeTarget === targetId;
    const isLastHit = lastHitTarget === targetId;

    let borderColor = theme.borderNeutral;
    let bgColor = theme.surface;

    if (isActive) {
      borderColor = isKidsMode ? '#F59E0B' : theme.primary;
      bgColor = isKidsMode ? '#FEF3C7' : theme.surfaceMint;
    } else if (isLastHit) {
      if (lastHitResult === 'HIT') {
        borderColor = theme.primary;
        bgColor = theme.surfaceMint;
      } else if (lastHitResult === 'WRONG_HIT') {
        borderColor = theme.danger;
        bgColor = theme.dangerSoft;
      } else if (lastHitResult === 'MISS') {
        borderColor = theme.warning;
        bgColor = theme.warningSoft;
      }
    }

    return (
      <TouchableOpacity
        key={targetId}
        accessibilityRole="button"
        accessibilityLabel={`Alvo ${targetId}: ${TARGET_LABELS[targetId]}`}
        activeOpacity={0.8}
        style={[
          styles.targetCard,
          isCenter && styles.centerTargetCard,
          isMobile && { minHeight: isCenter ? 76 : 70, paddingVertical: 8, paddingHorizontal: 8 },
          {
            backgroundColor: bgColor,
            borderColor,
            borderWidth: isActive ? 2.5 : 1.5,
          },
        ]}
        onPress={() => onTargetPress(targetId)}
      >
        <View style={styles.targetHeader}>
          <Text
            style={[
              styles.targetNumber,
              {
                color: isActive ? theme.primaryDark : theme.textMuted,
                fontSize: fs(11.5),
              },
            ]}
          >
            #{targetId}
          </Text>
          {isActive && (
            <View
              style={[
                styles.livePulse,
                { backgroundColor: isKidsMode ? '#F59E0B' : theme.primary },
              ]}
            />
          )}
        </View>

        <Text
          numberOfLines={1}
          style={[
            styles.targetLabel,
            {
              color: isActive ? theme.text : theme.textSecondary,
              fontSize: isMobile ? fs(11) : fs(12),
            },
          ]}
        >
          {isKidsMode && targetId === 5 ? '⭐ Alvo Mágico' : TARGET_LABELS[targetId]}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.targetTactical,
            {
              color: theme.textMuted,
              fontSize: isMobile ? fs(9.5) : fs(10),
            },
          ]}
        >
          {TARGET_TACTICAL_NAMES[targetId]}
        </Text>

        {isActive && (
          <View style={styles.ledRingRow}>
            {Array.from({ length: 8 }).map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.ledDot,
                  {
                    backgroundColor:
                      idx < ledCount
                        ? isKidsMode
                          ? '#F59E0B'
                          : theme.primary
                        : theme.borderNeutral,
                  },
                ]}
              />
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          padding: isMobile ? 12 : cardPadding,
          marginBottom: isMobile ? 10 : 14,
        },
      ]}
    >
      {/* Topo do Board: Modo Kids Toggle */}
      <View style={styles.topBar}>
        <View style={styles.courtTitleRow}>
          <TargetIcon size={17} color={theme.primary} />
          <Text
            numberOfLines={1}
            style={[
              styles.courtTitle,
              { color: theme.text, fontSize: isMobile ? fs(13.5) : fs(15) },
            ]}
          >
            {isMobile
              ? 'Painel da Quadra • 5 Sensores'
              : 'Painel da Quadra • 5 Sensores Piezoelétricos (RF07/08)'}
          </Text>
        </View>

        <View style={styles.modeToggleRow}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={[
              styles.modePill,
              !isKidsMode && { backgroundColor: theme.primary, borderColor: theme.primaryDark },
            ]}
            onPress={() => onToggleMode(false)}
          >
            <Text
              style={[
                styles.modePillText,
                { color: !isKidsMode ? '#FFF' : theme.textSecondary, fontSize: fs(10.5) },
              ]}
            >
              Pro / Adulto
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={[
              styles.modePill,
              isKidsMode && { backgroundColor: '#F59E0B', borderColor: '#D97706' },
            ]}
            onPress={() => onToggleMode(true)}
          >
            <Text
              style={[
                styles.modePillText,
                { color: isKidsMode ? '#FFF' : theme.textSecondary, fontSize: fs(10.5) },
              ]}
            >
              ⭐ Kids Lúdico
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid da Quadra: 2 Alvos Superiores, 1 Central, 2 Inferiores */}
      <View style={styles.courtArea}>
        <View style={[styles.courtGridRow, { gap: isMobile ? 8 : 14 }]}>
          {renderSensorModule(1)}
          {renderSensorModule(2)}
        </View>

        <View style={[styles.courtCenterRow, { marginVertical: isMobile ? 6 : 12 }]}>
          <View style={{ width: isMobile ? '72%' : '50%' }}>
            {renderSensorModule(5, true)}
          </View>
        </View>

        <View style={[styles.courtGridRow, { gap: isMobile ? 8 : 14 }]}>
          {renderSensorModule(3)}
          {renderSensorModule(4)}
        </View>
      </View>

      {/* Barra de Controles de Ação e Segurança (RF06, RF22) */}
      <View
        style={[
          styles.footerControls,
          isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 8, marginTop: 10 },
        ]}
      >
        {!isPlaying && !isPaused ? (
          <View style={[styles.idleActionsWrap, isMobile && { width: '100%' }]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Iniciar Sessão de Treino"
              activeOpacity={0.85}
              style={[
                styles.startButton,
                isMobile && { width: '100%', minWidth: 0 },
                {
                  backgroundColor: theme.primary,
                  opacity: gameState === GameState.COUNTDOWN ? 0.65 : 1,
                },
              ]}
              disabled={gameState === GameState.COUNTDOWN}
              onPress={onStartSession}
            >
              <PlayIcon size={15} color="#FFFFFF" />
              <Text style={[styles.startButtonText, { fontSize: fs(14) }]}>
                {gameState === GameState.COUNTDOWN
                  ? `Iniciando em ${countdownValue}...`
                  : 'Iniciar Sessão de Treino'}
              </Text>
            </TouchableOpacity>

            {gameState === GameState.COMPLETED && (
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.85}
                style={[
                  styles.summaryBtn,
                  isMobile && { width: '100%' },
                  { backgroundColor: theme.surfaceMint, borderColor: theme.primaryBorder },
                ]}
                onPress={onViewSummary}
              >
                <AwardIcon size={15} color={theme.primaryDark} />
                <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(13) }}>
                  Ver Resumo da Sessão
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.runningControlsRow, isMobile && { width: '100%' }]}>
            {isPlaying && onPauseSession && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.pauseBtn,
                  isMobile && { flex: 1, alignItems: 'center' },
                  { backgroundColor: theme.warningSoft, borderColor: theme.warningBorder },
                ]}
                onPress={onPauseSession}
              >
                <Text style={[styles.pauseBtnText, { color: theme.warning, fontSize: fs(13) }]}>
                  ⏸️ Pausar
                </Text>
              </TouchableOpacity>
            )}

            {isPaused && onResumeSession && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.resumeBtn,
                  isMobile && { flex: 1, alignItems: 'center' },
                  { backgroundColor: theme.primary, borderColor: theme.primaryDark },
                ]}
                onPress={onResumeSession}
              >
                <Text style={[styles.resumeBtnText, { color: '#FFF', fontSize: fs(13) }]}>
                  ▶️ Retomar
                </Text>
              </TouchableOpacity>
            )}

            {onAbortSession && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.abortBtn,
                  isMobile && { flex: 1, alignItems: 'center' },
                  { borderColor: theme.borderNeutral },
                ]}
                onPress={() => onAbortSession()}
              >
                <Text style={[styles.abortBtnText, { color: theme.textSecondary, fontSize: fs(13) }]}>
                  ⏹️ Encerrar
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <EmergencyStopButton
          isEngaged={gameState === GameState.EMERGENCY_STOP}
          alertMessage={emergencyAlert}
          fullWidth={isMobile}
          onTriggerStop={onTriggerStop}
          onResetStop={onResetStop}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1.5,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  courtTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  courtTitle: {
    fontWeight: '700',
    flexShrink: 1,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modePillText: {
    fontWeight: '700',
  },
  courtArea: {
    paddingVertical: 2,
  },
  courtGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  courtCenterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  targetCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 88,
    justifyContent: 'center',
  },
  centerTargetCard: {
    minHeight: 96,
  },
  targetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  targetNumber: {
    fontWeight: '700',
  },
  livePulse: {
    width: 7,
    height: 7,
    borderRadius: 99,
  },
  targetLabel: {
    fontWeight: '700',
    textAlign: 'center',
  },
  targetTactical: {
    textAlign: 'center',
    marginTop: 2,
  },
  ledRingRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 5,
  },
  ledDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
  },
  footerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
  },
  idleActionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    minWidth: 220,
  },
  startButtonText: {
    color: '#FFF',
    fontWeight: '800',
  },
  summaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  runningControlsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pauseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  pauseBtnText: {
    fontWeight: '700',
  },
  resumeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  resumeBtnText: {
    fontWeight: '700',
  },
  abortBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  abortBtnText: {
    fontWeight: '600',
  },
});
