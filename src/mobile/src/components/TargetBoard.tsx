/**
 * Smart Tennis Arena — Quadra Interativa • Matriz de Sensores (TargetBoard)
 * Alinhado com: RF06 (Iniciar, Pausar, Retomar, Encerrar), RF08 (Atuadores),
 * RF09 (Máquina/Simulador), RF11 (Kids/Pro) e RF22 (Parada Segura)
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

const DISPLAY_TARGET_NUMBER: Record<TargetId, number> = {
  1: 2,
  2: 5,
  3: 1,
  4: 4,
  5: 3,
};

interface TargetBoardProps {
  activeTarget: TargetId | null;
  ledCount: number; // 0..8 leds acesos no alvo ativo
  remainingMs: number;
  totalMs: number;
  currentBallSpeedKmh?: number;
  currentSpinType?: 'FLAT' | 'TOPSPIN' | 'BACKSPIN';
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
  remainingMs,
  totalMs,
  currentBallSpeedKmh = 85,
  currentSpinType = 'FLAT',
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

  const isPaused = gameState === GameState.PAUSED;
  const isPlaying =
    gameState === GameState.RUNNING_TARGET_ACTIVE ||
    gameState === GameState.TARGET_HIT ||
    gameState === GameState.TARGET_MISS_TIMEOUT ||
    isPaused;

  const progressRatio =
    totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;

  const renderSensorModule = (targetId: TargetId, isCenter: boolean = false) => {
    const isActive = activeTarget === targetId;
    const isLastHit = lastHitTarget === targetId;

    let borderColor = theme.borderNeutral;
    let bgColor = theme.surface;

    if (isActive) {
      borderColor = isPaused
        ? theme.warningBorder
        : isKidsMode
        ? '#F59E0B'
        : theme.primary;
      bgColor = isPaused
        ? theme.warningSoft
        : isKidsMode
        ? '#FEF3C7'
        : theme.surfaceMint;
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

    const displayTargetNumber = DISPLAY_TARGET_NUMBER[targetId];

    return (
      <TouchableOpacity
        key={targetId}
        accessibilityRole="button"
        accessibilityLabel={`Alvo ${displayTargetNumber}: ${TARGET_LABELS[targetId]}`}
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
            #{displayTargetNumber}
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

      {/* Barra de Janela Temporal Ativa + Telemetria da Máquina Lançadora (RF06 & RF09) */}
      {isPlaying && (
        <View style={styles.timerBarContainer}>
          <View style={styles.timerLabelRow}>
            <Text
              style={{
                color: isPaused ? theme.warning : theme.primaryDark,
                fontWeight: '700',
                fontSize: fs(11),
              }}
            >
              {isPaused
                ? `⏸ Treino Pausado (Alvo #0${activeTarget ? DISPLAY_TARGET_NUMBER[activeTarget] : '-'})`
                : `Alvo #0${activeTarget ? DISPLAY_TARGET_NUMBER[activeTarget] : '-'} ativo • 🎾 Lançadora: ${currentBallSpeedKmh} km/h (${currentSpinType})`}
            </Text>
            <Text style={{ color: theme.textSecondary, fontWeight: '700', fontSize: fs(11) }}>
              {remainingMs} ms ({ledCount}/8 LEDs)
            </Text>
          </View>
          <View style={[styles.timerTrack, { backgroundColor: theme.primarySoft }]}>
            <View
              style={[
                styles.timerFill,
                {
                  width: `${Math.round(progressRatio * 100)}%`,
                  backgroundColor: isPaused
                    ? theme.warning
                    : progressRatio < 0.28
                    ? theme.danger
                    : theme.primary,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Banner de Contagem Regressiva 3, 2, 1 */}
      {gameState === GameState.COUNTDOWN && (
        <View
          style={[
            styles.countdownBanner,
            { backgroundColor: theme.surfaceMint, borderColor: theme.primary },
          ]}
        >
          <Text
            style={[
              styles.countdownNum,
              { color: theme.primary, fontSize: isMobile ? fs(28) : fs(36) },
            ]}
          >
            {countdownValue}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: fs(13) }}>
              Prepare-se na linha de base!
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: fs(11) }}>
              Sincronizando disparo de LEDs e máquina lançadora...
            </Text>
          </View>
        </View>
      )}

      {/* Banner de Sessão Concluída */}
      {gameState === GameState.COMPLETED && (
        <View
          style={[
            styles.completedBanner,
            { backgroundColor: theme.surfaceMint, borderColor: theme.primaryBorder },
          ]}
        >
          <View style={{ flex: 1, minWidth: 180 }}>
            <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(13) }}>
              ✓ Sessão de treino finalizada e registrada!
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: fs(11), marginTop: 2 }}>
              Confira a precisão por zona, recomendações e histórico sincronizado.
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.summaryShortcutBtn,
              isMobile && { width: '100%', alignItems: 'center' },
              { backgroundColor: theme.primary },
            ]}
            onPress={onViewSummary}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: fs(12) }}>
              Ver Relatório & Histórico →
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
        {!isPlaying ? (
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
            {!isPaused && onPauseSession && (
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
  timerBarContainer: {
    marginBottom: 12,
  },
  timerLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  timerTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 999,
  },
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  countdownNum: {
    fontWeight: '900',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  summaryShortcutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
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
    flexWrap: 'wrap',
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
