/**
 * Smart Tennis Arena — Quadra Interativa • Matriz de Sensores (TargetBoard)
 * Design Minimalista Branco & Verde Esmeralda • Geometria 2-1-2 Responsiva (Mobile & Web)
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
import { PlayIcon, TargetIcon } from './Icons';
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
  onTriggerStop: () => void;
  onResetStop: () => void;
  onViewSummary: () => void;
}

export const TargetBoard: React.FC<TargetBoardProps> = ({
  activeTarget,
  ledCount,
  remainingMs,
  totalMs,
  lastHitTarget,
  lastHitResult,
  isKidsMode,
  gameState,
  countdownValue,
  emergencyAlert,
  onToggleMode,
  onTargetPress,
  onStartSession,
  onTriggerStop,
  onResetStop,
  onViewSummary,
}) => {
  const { theme, fs } = useAccessibility();
  const { isMobile, isSmallPhone, cardPadding } = useResponsive();

  const isPlaying =
    gameState === GameState.RUNNING_TARGET_ACTIVE ||
    gameState === GameState.TARGET_HIT ||
    gameState === GameState.TARGET_MISS_TIMEOUT;

  const progressRatio =
    isPlaying && totalMs > 0
      ? Math.max(0, Math.min(1, remainingMs / totalMs))
      : 0;

  const renderSensorModule = (id: TargetId, compactCenter?: boolean) => {
    const isActive = activeTarget === id;
    const isRecentHit = lastHitTarget === id;

    let cardBg = theme.surface;
    let cardBorder = theme.primaryBorder;
    let titleColor = theme.text;
    let subColor = theme.textMuted;
    let ringBg = theme.surfaceMint;
    let statusBadgeText = isMobile ? `#0${id}` : `PIEZO #0${id}`;
    let statusBadgeBg = theme.surfaceMint;
    let statusBadgeColor = theme.primaryDark;

    if (isActive) {
      cardBg = theme.primary;
      cardBorder = theme.primaryDark;
      titleColor = '#FFFFFF';
      subColor = '#D1FAE5';
      ringBg = 'rgba(255,255,255,0.18)';
      statusBadgeText = isKidsMode
        ? '⭐ BATA!'
        : `${(remainingMs / 1000).toFixed(1)}s`;
      statusBadgeBg = '#FFFFFF';
      statusBadgeColor = theme.primaryDark;
    } else if (isRecentHit) {
      if (lastHitResult === 'HIT') {
        cardBg = theme.surfaceMint;
        cardBorder = theme.primary;
        statusBadgeText = '✓ ACERTO';
        statusBadgeBg = theme.primary;
        statusBadgeColor = '#FFFFFF';
      } else if (lastHitResult === 'WRONG_HIT') {
        cardBg = theme.dangerSoft;
        cardBorder = theme.danger;
        statusBadgeText = isKidsMode ? 'OPS!' : '✕ ERRO';
        statusBadgeBg = theme.danger;
        statusBadgeColor = '#FFFFFF';
      } else if (lastHitResult === 'MISS') {
        cardBg = theme.warningSoft;
        cardBorder = theme.warningBorder;
        statusBadgeText = '⏱ EXP.';
        statusBadgeBg = theme.warningSoft;
        statusBadgeColor = theme.warning;
      }
    }

    const leds = [0, 1, 2, 3, 4, 5, 6, 7];
    const ringSize = isSmallPhone ? 46 : isMobile ? 52 : 60;
    const ledRadius = isSmallPhone ? 17 : isMobile ? 20 : 23;

    // Layout Mobile Compacto: mantém SEMPRE 2 colunas (Sup Esq/Dir e Inf Esq/Dir) + Centro na rede
    if (isMobile) {
      return (
        <TouchableOpacity
          key={id}
          accessibilityRole="button"
          accessibilityLabel={`Alvo ${id}: ${TARGET_TACTICAL_NAMES[id]} (${TARGET_LABELS[id]})`}
          activeOpacity={0.78}
          onPress={() => onTargetPress(id)}
          style={[
            styles.sensorCardMobile,
            compactCenter && {
              width: isSmallPhone ? '72%' : '62%',
              flex: 0,
            },
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              padding: isSmallPhone ? 9 : 11,
            },
            isActive && styles.sensorCardActiveShadow,
          ]}
        >
          <View style={styles.sensorMobileTop}>
            <View style={[styles.sensorBadge, { backgroundColor: statusBadgeBg }]}>
              <Text
                numberOfLines={1}
                style={[
                  styles.sensorBadgeText,
                  { color: statusBadgeColor, fontSize: fs(9) },
                ]}
              >
                {statusBadgeText}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.ledRingContainer,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                backgroundColor: ringBg,
              },
            ]}
          >
            {leds.map((idx) => {
              const angle = (idx / 8) * 2 * Math.PI - Math.PI / 2;
              const x = Math.cos(angle) * ledRadius;
              const y = Math.sin(angle) * ledRadius;
              const isLit = isActive && idx < ledCount;

              return (
                <View
                  key={idx}
                  style={[
                    styles.ledDot,
                    {
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      transform: [{ translateX: x }, { translateY: y }],
                      backgroundColor: isLit
                        ? '#FFFFFF'
                        : isActive
                        ? 'rgba(255,255,255,0.28)'
                        : theme.primaryBorder,
                    },
                  ]}
                />
              );
            })}
            <Text
              style={[
                styles.sensorNumber,
                {
                  color: isActive ? '#FFFFFF' : theme.primaryDark,
                  fontSize: fs(16),
                },
              ]}
            >
              0{id}
            </Text>
          </View>

          <Text
            numberOfLines={1}
            style={[
              styles.sensorTitleMobile,
              { color: titleColor, fontSize: fs(12) },
            ]}
          >
            {isKidsMode ? `Alvo ${id}` : TARGET_TACTICAL_NAMES[id]}
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: subColor, fontSize: fs(10), fontWeight: '500' }}
          >
            {TARGET_LABELS[id]}
          </Text>
        </TouchableOpacity>
      );
    }

    // Layout Tablet & Web Desktop: Card horizontal detalhado
    return (
      <TouchableOpacity
        key={id}
        accessibilityRole="button"
        accessibilityLabel={`Alvo ${id}: ${TARGET_TACTICAL_NAMES[id]} (${TARGET_LABELS[id]})`}
        activeOpacity={0.8}
        onPress={() => onTargetPress(id)}
        style={[
          styles.sensorCard,
          compactCenter && styles.sensorCardCenter,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
          },
          isActive && styles.sensorCardActiveShadow,
        ]}
      >
        <View style={styles.sensorTopRow}>
          <View style={[styles.sensorBadge, { backgroundColor: statusBadgeBg }]}>
            <Text
              style={[
                styles.sensorBadgeText,
                { color: statusBadgeColor, fontSize: fs(10) },
              ]}
            >
              {statusBadgeText}
            </Text>
          </View>
          <Text style={[styles.zoneCoord, { color: subColor, fontSize: fs(10) }]}>
            {TARGET_LABELS[id]}
          </Text>
        </View>

        <View style={styles.sensorBody}>
          <View style={[styles.ledRingContainer, { backgroundColor: ringBg }]}>
            {leds.map((idx) => {
              const angle = (idx / 8) * 2 * Math.PI - Math.PI / 2;
              const radius = 23;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const isLit = isActive && idx < ledCount;

              return (
                <View
                  key={idx}
                  style={[
                    styles.ledDot,
                    {
                      transform: [{ translateX: x }, { translateY: y }],
                      backgroundColor: isLit
                        ? '#FFFFFF'
                        : isActive
                        ? 'rgba(255,255,255,0.28)'
                        : theme.primaryBorder,
                    },
                  ]}
                />
              );
            })}
            <Text
              style={[
                styles.sensorNumber,
                {
                  color: isActive ? '#FFFFFF' : theme.primaryDark,
                  fontSize: fs(19),
                },
              ]}
            >
              0{id}
            </Text>
          </View>

          <View style={styles.sensorInfo}>
            <Text
              style={[
                styles.sensorTitle,
                { color: titleColor, fontSize: fs(14) },
              ]}
            >
              {isKidsMode ? `Alvo Mágico ${id}` : TARGET_TACTICAL_NAMES[id]}
            </Text>
            <Text
              style={[
                styles.sensorHint,
                { color: subColor, fontSize: fs(11) },
              ]}
            >
              {isActive
                ? 'Toque para simular impacto piezo'
                : '8 LEDs • Sensor Piezo ADC'}
            </Text>
          </View>
        </View>
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
          padding: cardPadding,
        },
      ]}
    >
      {/* Header do Card */}
      <View style={[styles.header, isMobile && { flexDirection: 'column', gap: 10 }]}>
        <View style={{ width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : 1 }}>
          <Text
            style={[
              styles.title,
              { color: theme.text, fontSize: isMobile ? fs(16) : fs(18) },
            ]}
          >
            Quadra Interativa • Matriz de Sensores
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: theme.textSecondary, fontSize: fs(12) },
            ]}
          >
            {isMobile
              ? 'Toque no alvo aceso para simular o golpe na quadra.'
              : 'Representação visual dos módulos físicos com sensores piezoelétricos e anéis de LED.'}
          </Text>
        </View>

        {/* Toggle Minimalista Kids vs Pro (RF11) */}
        <View
          style={[
            styles.modeToggleWrap,
            isMobile && { alignSelf: 'stretch' },
            { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral },
          ]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.modePill,
              isMobile && { flex: 1, alignItems: 'center' },
              !isKidsMode && { backgroundColor: theme.primary },
            ]}
            onPress={() => onToggleMode(false)}
          >
            <Text
              style={[
                styles.modePillText,
                {
                  color: !isKidsMode ? '#FFFFFF' : theme.textSecondary,
                  fontSize: fs(11),
                },
              ]}
            >
              🎾 Modo Pro
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.modePill,
              isMobile && { flex: 1, alignItems: 'center' },
              isKidsMode && { backgroundColor: theme.primary },
            ]}
            onPress={() => onToggleMode(true)}
          >
            <Text
              style={[
                styles.modePillText,
                {
                  color: isKidsMode ? '#FFFFFF' : theme.textSecondary,
                  fontSize: fs(11),
                },
              ]}
            >
              🧒 Modo Kids
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de Janela Temporal Ativa */}
      {isPlaying && (
        <View style={styles.timerBarContainer}>
          <View style={styles.timerLabelRow}>
            <Text style={{ color: theme.primaryDark, fontWeight: '700', fontSize: fs(11) }}>
              Alvo #0{activeTarget || '-'} ativo
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
                  backgroundColor:
                    progressRatio < 0.28 ? theme.danger : theme.primary,
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
              Sincronizando disparo de LEDs nos sensores...
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
              ✓ Sessão de treino finalizada!
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: fs(11), marginTop: 2 }}>
              Confira a precisão por zona no relatório analítico.
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
              Ver Relatório →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Superfície da Quadra (Geometria 2 - 1 - 2 preservada em todas as telas) */}
      <View
        style={[
          styles.courtSurface,
          {
            backgroundColor: theme.bg,
            borderColor: theme.primaryBorder,
            padding: isMobile ? 10 : 16,
            gap: isMobile ? 10 : 14,
          },
        ]}
      >
        {/* Linha de Fundo Superior */}
        <View style={[styles.courtGridRow, { gap: isMobile ? 8 : 14 }]}>
          {renderSensorModule(1)}
          {renderSensorModule(2)}
        </View>

        {/* Linha de Rede / T Central */}
        <View style={styles.netSection}>
          <View style={[styles.netLine, { borderColor: theme.primaryBorder }]} />
          <View
            style={[
              styles.centerModuleWrap,
              isMobile && { alignItems: 'center' },
            ]}
          >
            {renderSensorModule(5, true)}
          </View>
        </View>

        {/* Linha Inferior (Saque / Curta) */}
        <View style={[styles.courtGridRow, { gap: isMobile ? 8 : 14 }]}>
          {renderSensorModule(3)}
          {renderSensorModule(4)}
        </View>
      </View>

      {/* Barra de Controles de Ação e Segurança */}
      <View
        style={[
          styles.footerControls,
          isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Iniciar Sessão de Treino"
          activeOpacity={0.85}
          style={[
            styles.startButton,
            isMobile && { width: '100%', minWidth: 0 },
            {
              backgroundColor: isPlaying ? theme.primaryDark : theme.primary,
              opacity: gameState === GameState.COUNTDOWN ? 0.65 : 1,
            },
          ]}
          disabled={gameState === GameState.COUNTDOWN}
          onPress={onStartSession}
        >
          {isPlaying ? (
            <TargetIcon size={17} color="#FFFFFF" />
          ) : (
            <PlayIcon size={15} color="#FFFFFF" />
          )}
          <Text style={[styles.startButtonText, { fontSize: fs(14) }]}>
            {isPlaying
              ? 'Reiniciar Protocolo Atual'
              : gameState === GameState.COUNTDOWN
              ? 'Iniciando Contagem...'
              : 'Iniciar Sessão de Treino'}
          </Text>
        </TouchableOpacity>

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
    borderRadius: 20,
    borderWidth: 1,
    width: '100%',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 4,
    lineHeight: 18,
  },
  modeToggleWrap: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  modePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
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
  courtSurface: {
    borderRadius: 16,
    borderWidth: 1.5,
  },
  courtGridRow: {
    flexDirection: 'row',
  },
  netSection: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  netLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
  },
  centerModuleWrap: {
    width: '100%',
    maxWidth: 320,
  },
  sensorCard: {
    flex: 1,
    minWidth: 195,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  sensorCardMobile: {
    flex: 1,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 6,
  },
  sensorMobileTop: {
    width: '100%',
    alignItems: 'center',
  },
  sensorTitleMobile: {
    fontWeight: '800',
    textAlign: 'center',
  },
  sensorCardCenter: {
    alignSelf: 'center',
    width: '100%',
  },
  sensorCardActiveShadow: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  sensorTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sensorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sensorBadgeText: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  zoneCoord: {
    fontWeight: '600',
  },
  sensorBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ledRingContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ledDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
  },
  sensorNumber: {
    fontWeight: '900',
  },
  sensorInfo: {
    flex: 1,
  },
  sensorTitle: {
    fontWeight: '800',
    marginBottom: 3,
  },
  sensorHint: {
    fontWeight: '500',
  },
  footerControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  startButton: {
    flex: 1,
    minWidth: 200,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
