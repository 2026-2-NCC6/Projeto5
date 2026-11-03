/**
 * Smart Tennis Arena — Resumo Analítico da Sessão (RF12)
 * Responsivo para Smartphone, Tablet & Desktop Web
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SessionMetrics } from '../../../packages/shared/src/fsm/types';
import {
  DrillDefinition,
  TARGET_LABELS,
  TARGET_TACTICAL_NAMES,
} from '../../../packages/shared/src/contracts/drills';
import { TargetId } from '../../../packages/shared/src/protocol/serial';
import { ZoneAnalytics } from '../fsm/useGameEngine';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import { CheckCircleIcon, PlayIcon } from './Icons';

interface SessionSummaryViewProps {
  metrics: SessionMetrics;
  zoneAnalytics: ZoneAnalytics;
  selectedDrill: DrillDefinition;
  athleteName: string;
  athleteRoleLabel: string;
  isKidsMode: boolean;
  hasCompletedSession: boolean;
  onStartNewSession: () => void;
}

export const SessionSummaryView: React.FC<SessionSummaryViewProps> = ({
  metrics,
  zoneAnalytics,
  selectedDrill,
  athleteName,
  athleteRoleLabel,
  isKidsMode,
  hasCompletedSession,
  onStartNewSession,
}) => {
  const { theme, fs } = useAccessibility();
  const { width, isMobile, isSmallPhone, cardPadding } = useResponsive();
  const isFourCols = width >= 960;
  const isTwoZoneCols = width >= 760;

  const totalAttempts = metrics.hits + metrics.misses + metrics.wrongHits;
  const accuracyPct =
    totalAttempts > 0 ? Math.round((metrics.hits / totalAttempts) * 100) : 0;

  const reactionFeedback =
    metrics.averageReactionTimeMs === 0
      ? 'Inicie uma sessão para coletar telemetria'
      : metrics.averageReactionTimeMs <= 700
      ? 'Excelente reflexo de quadra'
      : metrics.averageReactionTimeMs <= 1200
      ? 'Ótima cadência de resposta'
      : 'Ritmo consistente de aprendizado';

  const targetIds: TargetId[] = [1, 2, 3, 4, 5];
  const kpiValSize = isSmallPhone ? fs(21) : isMobile ? fs(24) : fs(30);

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
      {/* Topo do Relatório */}
      <View style={styles.topHeader}>
        <View style={{ flex: isMobile ? undefined : 1, width: isMobile ? '100%' : undefined }}>
          <View
            style={[
              styles.reportBadge,
              { backgroundColor: theme.primarySoft },
            ]}
          >
            <CheckCircleIcon size={13} color={theme.primaryDark} />
            <Text
              numberOfLines={1}
              style={[
                styles.reportBadgeText,
                { color: theme.primaryDark, fontSize: fs(10) },
              ]}
            >
              {hasCompletedSession
                ? 'Relatório Pós-Treino • Smart Tennis Arena'
                : 'Telemetria da Sessão • Smart Tennis Arena'}
            </Text>
          </View>

          <Text
            style={[
              styles.mainTitle,
              { color: theme.text, fontSize: isMobile ? fs(19) : fs(24) },
            ]}
          >
            {isKidsMode ? 'Resumo Estelar da Partida' : 'Resumo Analítico da Sessão'}
          </Text>
          <Text
            style={[
              styles.metaLine,
              { color: theme.textSecondary, fontSize: fs(12) },
            ]}
          >
            Atleta:{' '}
            <Text style={{ fontWeight: '700', color: theme.text }}>
              {athleteName} ({athleteRoleLabel})
            </Text>{' '}
            • Protocolo:{' '}
            <Text style={{ fontWeight: '700', color: theme.text }}>
              {selectedDrill.title}
            </Text>
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.85}
          style={[
            styles.newSessionBtn,
            isMobile && { width: '100%', justifyContent: 'center' },
            { backgroundColor: theme.primary },
          ]}
          onPress={onStartNewSession}
        >
          <PlayIcon size={14} color="#FFFFFF" />
          <Text style={[styles.newSessionBtnText, { fontSize: fs(13) }]}>
            Nova Sessão
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.divider,
          { backgroundColor: theme.border, marginVertical: isMobile ? 16 : 22 },
        ]}
      />

      {/* 4 KPI Cards Analíticos */}
      <View
        style={[
          styles.kpiGrid,
          !isFourCols && styles.kpiGridWrap,
          { gap: isMobile ? 10 : 14, marginBottom: isMobile ? 18 : 26 },
        ]}
      >
        <View
          style={[
            styles.kpiCard,
            isFourCols ? styles.kpiDesktop : styles.kpiHalf,
            {
              backgroundColor: theme.surfaceMint,
              borderColor: theme.primaryBorder,
              padding: isMobile ? 13 : 18,
            },
          ]}
        >
          <Text style={[styles.kpiLabel, { color: theme.primaryDark, fontSize: fs(10) }]}>
            SCORE FINAL
          </Text>
          <Text style={[styles.kpiValue, { color: theme.primaryDark, fontSize: kpiValSize }]}>
            {metrics.score} pts
          </Text>
          <Text style={[styles.kpiSub, { color: theme.primary, fontSize: fs(10) }]}>
            {isKidsMode
              ? 'Modo Kids sem penalidade'
              : totalAttempts > 0
              ? 'Algoritmo RN03 + bônus ADC'
              : 'Pronto para pontuar'}
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            isFourCols ? styles.kpiDesktop : styles.kpiHalf,
            {
              backgroundColor: theme.surfaceMuted,
              borderColor: theme.borderNeutral,
              padding: isMobile ? 13 : 18,
            },
          ]}
        >
          <Text style={[styles.kpiLabel, { color: theme.textMuted, fontSize: fs(10) }]}>
            TAXA DE PRECISÃO
          </Text>
          <Text style={[styles.kpiValue, { color: theme.text, fontSize: kpiValSize }]}>
            {accuracyPct}%
          </Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted, fontSize: fs(10) }]}>
            {metrics.hits} acertos ({metrics.misses} timeouts)
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            isFourCols ? styles.kpiDesktop : styles.kpiHalf,
            {
              backgroundColor: theme.surfaceMuted,
              borderColor: theme.borderNeutral,
              padding: isMobile ? 13 : 18,
            },
          ]}
        >
          <Text style={[styles.kpiLabel, { color: theme.textMuted, fontSize: fs(10) }]}>
            TEMPO DE REAÇÃO
          </Text>
          <Text style={[styles.kpiValue, { color: theme.text, fontSize: kpiValSize }]}>
            {metrics.averageReactionTimeMs || 0} ms
          </Text>
          <Text
            style={[
              styles.kpiSub,
              { color: theme.primary, fontWeight: '700', fontSize: fs(10) },
            ]}
          >
            {reactionFeedback}
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            isFourCols ? styles.kpiDesktop : styles.kpiHalf,
            {
              backgroundColor: theme.surfaceMuted,
              borderColor: theme.borderNeutral,
              padding: isMobile ? 13 : 18,
            },
          ]}
        >
          <Text style={[styles.kpiLabel, { color: theme.textMuted, fontSize: fs(10) }]}>
            MAIOR STREAK
          </Text>
          <Text style={[styles.kpiValue, { color: theme.text, fontSize: kpiValSize }]}>
            {metrics.maxStreak}x
          </Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted, fontSize: fs(10) }]}>
            {metrics.maxStreak >= 5
              ? 'Multiplicador máx. 1.5x!'
              : 'Combo progressivo'}
          </Text>
        </View>
      </View>

      {/* Distribuição de Precisão por Zona da Quadra */}
      <Text style={[styles.sectionTitle, { color: theme.text, fontSize: fs(15) }]}>
        Distribuição de Precisão por Zona da Quadra
      </Text>

      <View style={[styles.zonesGrid, { gap: isMobile ? 10 : 14 }]}>
        {targetIds.map((id) => {
          const zoneAttempts = zoneAnalytics.attempts[id] || 0;
          const zoneHits = zoneAnalytics.hits[id] || 0;
          const zoneAvgMs = zoneAnalytics.avgReactionMs[id] || 0;
          const zonePct =
            zoneAttempts > 0 ? Math.round((zoneHits / zoneAttempts) * 100) : 0;

          return (
            <View
              key={id}
              style={[
                styles.zoneCard,
                isTwoZoneCols ? styles.zoneCardWide : styles.zoneCardFull,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.borderNeutral,
                  padding: isMobile ? 13 : 16,
                },
              ]}
            >
              <View style={styles.zoneHeader}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.zoneTitle,
                      { color: theme.text, fontSize: fs(13) },
                    ]}
                  >
                    Alvo 0{id} • {TARGET_TACTICAL_NAMES[id]}
                  </Text>
                  <Text
                    style={[
                      styles.zoneMeta,
                      { color: theme.textMuted, fontSize: fs(11) },
                    ]}
                  >
                    {TARGET_LABELS[id]} •{' '}
                    {zoneAttempts > 0
                      ? `Média: ${zoneAvgMs || '--'} ms (${zoneHits}/${zoneAttempts})`
                      : 'Sem disparos nesta sessão'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.zonePctPill,
                    { backgroundColor: theme.primarySoft },
                  ]}
                >
                  <Text
                    style={[
                      styles.zonePctText,
                      { color: theme.primaryDark, fontSize: fs(11) },
                    ]}
                  >
                    {zonePct}%
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${zonePct}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    borderWidth: 1,
    width: '100%',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
  },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
    maxWidth: '100%',
  },
  reportBadgeText: {
    fontWeight: '700',
    flexShrink: 1,
  },
  mainTitle: {
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  metaLine: {
    lineHeight: 19,
  },
  newSessionBtn: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  newSessionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  kpiGrid: {
    flexDirection: 'row',
  },
  kpiGridWrap: {
    flexWrap: 'wrap',
  },
  kpiCard: {
    borderRadius: 16,
    borderWidth: 1,
  },
  kpiDesktop: {
    flex: 1,
    minWidth: 175,
  },
  kpiHalf: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  kpiLabel: {
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  kpiValue: {
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  kpiSub: {
    fontWeight: '500',
  },
  sectionTitle: {
    fontWeight: '800',
    marginBottom: 12,
  },
  zonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  zoneCard: {
    borderRadius: 14,
    borderWidth: 1,
  },
  zoneCardWide: {
    flexBasis: '48.5%',
    flexGrow: 1,
  },
  zoneCardFull: {
    width: '100%',
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  zoneTitle: {
    fontWeight: '800',
    marginBottom: 2,
  },
  zoneMeta: {
    fontWeight: '500',
  },
  zonePctPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  zonePctText: {
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
});
