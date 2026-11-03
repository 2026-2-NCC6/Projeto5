/**
 * Smart Tennis Arena — Head-Up Display Minimalista de 5 KPIs (ScoreHUD)
 * Paleta Branca & Verde Esmeralda • 100% Responsivo (Mobile, Tablet & Web Desktop)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GameState, SessionMetrics } from '../../../packages/shared/src/fsm/types';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import {
  AwardIcon,
  ZapIcon,
  ActivityIcon,
  ClockIcon,
  SparklesIcon,
} from './Icons';

interface ScoreHUDProps {
  score: number;
  streak: number;
  maxStreak: number;
  currentStep: number;
  totalSteps: number;
  maxWindowMs: number;
  lastPointsAdded: number;
  gameState: GameState;
  activeTarget: number | null;
  countdownValue: number;
  metrics: SessionMetrics;
  isKidsMode: boolean;
}

function getFsmDisplay(
  gameState: GameState,
  activeTarget: number | null,
  countdownValue: number
): { badge: string; description: string; isUrgent?: boolean } {
  switch (gameState) {
    case GameState.IDLE:
    case GameState.READY:
      return { badge: 'IDLE', description: 'Pronto para iniciar treino' };
    case GameState.CONNECTING:
      return { badge: 'SYNC', description: 'Sincronizando porta serial...' };
    case GameState.COUNTDOWN:
      return { badge: `PREP ${countdownValue}s`, description: 'Prepare-se para o saque!' };
    case GameState.RUNNING_TARGET_ACTIVE:
      return {
        badge: 'ACTIVE',
        description: activeTarget
          ? `Alvo #0${activeTarget} aguardando impacto`
          : 'Aguardando leitura piezo',
      };
    case GameState.TARGET_HIT:
      return { badge: 'HIT_OK', description: 'Impacto confirmado no sensor!' };
    case GameState.TARGET_MISS_TIMEOUT:
      return { badge: 'TIMEOUT', description: 'Janela expirada • Próximo alvo' };
    case GameState.COMPLETED:
      return { badge: 'DONE', description: 'Sessão concluída • Veja o resumo' };
    case GameState.EMERGENCY_STOP:
      return {
        badge: 'E-STOP',
        description: 'Bloqueio seguro RF22 ativo',
        isUrgent: true,
      };
    default:
      return { badge: 'IDLE', description: 'Pronto para iniciar treino' };
  }
}

export const ScoreHUD: React.FC<ScoreHUDProps> = ({
  score,
  streak,
  maxStreak,
  currentStep,
  totalSteps,
  maxWindowMs,
  lastPointsAdded,
  gameState,
  activeTarget,
  countdownValue,
  metrics,
  isKidsMode,
}) => {
  const { theme, fs } = useAccessibility();
  const { width, isMobile, isSmallPhone } = useResponsive();
  const isFiveCols = width >= 1080;

  const totalAttempts = metrics.hits + metrics.misses + metrics.wrongHits;
  const accuracyPct =
    totalAttempts > 0 ? Math.round((metrics.hits / totalAttempts) * 100) : 0;

  const isSessionActive =
    gameState === GameState.RUNNING_TARGET_ACTIVE ||
    gameState === GameState.TARGET_HIT ||
    gameState === GameState.TARGET_MISS_TIMEOUT;

  const stepDisplay = isSessionActive
    ? Math.min(currentStep + 1, totalSteps)
    : gameState === GameState.COMPLETED
    ? totalSteps
    : 0;

  const fsmInfo = getFsmDisplay(gameState, activeTarget, countdownValue);

  const numFontSize = isSmallPhone ? fs(20) : isMobile ? fs(23) : fs(30);
  const labelFontSize = isMobile ? fs(10) : fs(11);
  const footerFontSize = isMobile ? fs(10) : fs(11);
  const cardPadV = isMobile ? 12 : 16;
  const cardPadH = isMobile ? 12 : 18;

  const metricBasisStyle = isFiveCols
    ? styles.cardDesktop
    : isMobile
    ? styles.cardMobileHalf
    : styles.cardTabletThird;

  return (
    <View
      style={[
        styles.row,
        !isFiveCols && styles.rowWrap,
        { gap: isMobile ? 10 : 14, marginBottom: isMobile ? 12 : 18 },
      ]}
    >
      {/* KPI 1: PONTUAÇÃO */}
      <View
        style={[
          styles.card,
          metricBasisStyle,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            paddingVertical: cardPadV,
            paddingHorizontal: cardPadH,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text
            numberOfLines={1}
            style={[styles.label, { color: theme.textMuted, fontSize: labelFontSize }]}
          >
            {isKidsMode ? 'ESTRELAS' : 'PONTUAÇÃO'}
          </Text>
          <AwardIcon size={isMobile ? 15 : 17} color={theme.primary} />
        </View>
        <View style={styles.valueRow}>
          <Text style={[styles.bigValue, { color: theme.text, fontSize: numFontSize }]}>
            {score}
          </Text>
          <Text style={[styles.unitGreen, { color: theme.primary, fontSize: fs(12) }]}>
            pts
          </Text>
          {lastPointsAdded !== 0 && (
            <View
              style={[
                styles.deltaPill,
                {
                  backgroundColor:
                    lastPointsAdded > 0 ? theme.primarySoft : theme.dangerSoft,
                },
              ]}
            >
              <Text
                style={{
                  color: lastPointsAdded > 0 ? theme.primaryDark : theme.danger,
                  fontSize: fs(10),
                  fontWeight: '700',
                }}
              >
                {lastPointsAdded > 0 ? `+${lastPointsAdded}` : lastPointsAdded}
              </Text>
            </View>
          )}
        </View>
        <Text
          numberOfLines={1}
          style={[styles.footer, { color: theme.textMuted, fontSize: footerFontSize }]}
        >
          {isKidsMode ? 'Sem penalidade (RN09)' : 'Base: 150 pts/alvo'}
        </Text>
      </View>

      {/* KPI 2: SEQUÊNCIA (STREAK) */}
      <View
        style={[
          styles.card,
          metricBasisStyle,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            paddingVertical: cardPadV,
            paddingHorizontal: cardPadH,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text
            numberOfLines={1}
            style={[styles.label, { color: theme.textMuted, fontSize: labelFontSize }]}
          >
            {isSmallPhone ? 'STREAK' : 'SEQUÊNCIA (STREAK)'}
          </Text>
          <ZapIcon size={isMobile ? 15 : 17} color={theme.primary} />
        </View>
        <View style={styles.valueRow}>
          <Text
            style={[
              styles.bigValue,
              { color: theme.primaryDark, fontSize: numFontSize },
            ]}
          >
            {streak}x
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={[styles.footer, { color: theme.textMuted, fontSize: footerFontSize }]}
        >
          Recorde na sessão: {maxStreak}x
        </Text>
      </View>

      {/* KPI 3: RODADA & PRECISÃO */}
      <View
        style={[
          styles.card,
          metricBasisStyle,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            paddingVertical: cardPadV,
            paddingHorizontal: cardPadH,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text
            numberOfLines={1}
            style={[styles.label, { color: theme.textMuted, fontSize: labelFontSize }]}
          >
            {isSmallPhone ? 'RODADA' : 'RODADA & PRECISÃO'}
          </Text>
          <ActivityIcon size={isMobile ? 15 : 17} color={theme.primary} />
        </View>
        <View style={[styles.valueRow, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[styles.bigValue, { color: theme.text, fontSize: numFontSize }]}>
              {stepDisplay}
            </Text>
            <Text
              style={[
                styles.slashTotal,
                { color: theme.textMuted, fontSize: isMobile ? fs(13) : fs(16) },
              ]}
            >
              /{totalSteps}
            </Text>
          </View>
          <View
            style={[
              styles.accuracyBadge,
              {
                backgroundColor: theme.surfaceMint,
                borderColor: theme.primaryBorder,
                paddingHorizontal: isMobile ? 7 : 10,
              },
            ]}
          >
            <Text
              style={[
                styles.accuracyText,
                { color: theme.primaryDark, fontSize: fs(10) },
              ]}
            >
              {accuracyPct}%{isSmallPhone ? '' : ' acerto'}
            </Text>
          </View>
        </View>
        <Text
          numberOfLines={1}
          style={[styles.footer, { color: theme.textMuted, fontSize: footerFontSize }]}
        >
          {metrics.hits} acertos em {totalAttempts} disparos
        </Text>
      </View>

      {/* KPI 4: TEMPO MÉDIO */}
      <View
        style={[
          styles.card,
          metricBasisStyle,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            paddingVertical: cardPadV,
            paddingHorizontal: cardPadH,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text
            numberOfLines={1}
            style={[styles.label, { color: theme.textMuted, fontSize: labelFontSize }]}
          >
            TEMPO MÉDIO
          </Text>
          <ClockIcon size={isMobile ? 15 : 17} color={theme.primary} />
        </View>
        <View style={styles.valueRow}>
          <Text style={[styles.bigValue, { color: theme.text, fontSize: numFontSize }]}>
            {metrics.averageReactionTimeMs || 0}
          </Text>
          <Text style={[styles.unitMuted, { color: theme.textMuted, fontSize: fs(12) }]}>
            ms
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={[styles.footer, { color: theme.textMuted, fontSize: footerFontSize }]}
        >
          Janela máx: {maxWindowMs} ms
        </Text>
      </View>

      {/* KPI 5: ESTADO FSM (Horizontal compacto em Mobile, Card vertical em Tablet/Desktop) */}
      {isMobile ? (
        <View
          style={[
            styles.card,
            styles.cardMobileFullBanner,
            {
              backgroundColor: fsmInfo.isUrgent ? theme.dangerSoft : theme.surfaceMint,
              borderColor: fsmInfo.isUrgent ? theme.dangerBorder : theme.primaryBorder,
            },
          ]}
        >
          <View style={styles.mobileFsmLeft}>
            <SparklesIcon
              size={16}
              color={fsmInfo.isUrgent ? theme.danger : theme.primary}
            />
            <View
              style={[
                styles.fsmBadge,
                {
                  backgroundColor: fsmInfo.isUrgent ? theme.danger : theme.primary,
                },
              ]}
            >
              <Text style={[styles.fsmBadgeText, { fontSize: fs(11) }]}>
                {fsmInfo.badge}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={{
                color: fsmInfo.isUrgent ? theme.danger : theme.primaryDark,
                fontWeight: '700',
                fontSize: fs(12),
                flex: 1,
              }}
            >
              {fsmInfo.description}
            </Text>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.card,
            metricBasisStyle,
            {
              backgroundColor: fsmInfo.isUrgent ? theme.dangerSoft : theme.surfaceMint,
              borderColor: fsmInfo.isUrgent ? theme.dangerBorder : theme.primaryBorder,
              paddingVertical: cardPadV,
              paddingHorizontal: cardPadH,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.label,
                {
                  color: fsmInfo.isUrgent ? theme.danger : theme.primaryDark,
                  fontSize: labelFontSize,
                },
              ]}
            >
              ESTADO FSM
            </Text>
            <SparklesIcon
              size={17}
              color={fsmInfo.isUrgent ? theme.danger : theme.primary}
            />
          </View>
          <View style={[styles.valueRow, { marginVertical: 4 }]}>
            <View
              style={[
                styles.fsmBadge,
                {
                  backgroundColor: fsmInfo.isUrgent ? theme.danger : theme.primary,
                },
              ]}
            >
              <Text style={[styles.fsmBadgeText, { fontSize: fs(12) }]}>
                {fsmInfo.badge}
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.footer,
              {
                color: fsmInfo.isUrgent ? theme.danger : theme.primaryDark,
                fontWeight: '600',
                fontSize: footerFontSize,
              },
            ]}
          >
            {fsmInfo.description}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  rowWrap: {
    flexWrap: 'wrap',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'space-between',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardDesktop: {
    flex: 1,
    minWidth: 170,
  },
  cardTabletThird: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 185,
  },
  cardMobileHalf: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  cardMobileFullBanner: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  mobileFsmLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 6,
  },
  bigValue: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  slashTotal: {
    fontWeight: '600',
    marginLeft: 1,
  },
  unitGreen: {
    fontWeight: '700',
  },
  unitMuted: {
    fontWeight: '600',
  },
  deltaPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    marginLeft: 2,
  },
  accuracyBadge: {
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  accuracyText: {
    fontWeight: '700',
  },
  fsmBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fsmBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    fontWeight: '500',
  },
});
