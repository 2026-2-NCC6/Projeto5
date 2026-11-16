/**
 * Smart Tennis Arena — Resumo Analítico da Sessão (RF12),
 * Envio/Sincronização Online & Offline (RF19, RF21) e Histórico & Indicadores (RF13)
 * Responsivo para Smartphone, Tablet & Desktop Web
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SessionMetrics } from '../../../packages/shared/src/fsm/types';
import {
  DrillDefinition,
  TARGET_LABELS,
  TARGET_TACTICAL_NAMES,
} from '../../../packages/shared/src/contracts/drills';
import {
  SessionEventLogItem,
  TrainingSessionRecord,
  SessionStatsSummary,
} from '../../../packages/shared/src/contracts/user';
import { TargetId } from '../../../packages/shared/src/protocol/serial';
import { ZoneAnalytics, SessionSyncStatus } from '../fsm/useGameEngine';
import { api } from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import {
  CheckCircleIcon,
  PlayIcon,
  RefreshIcon,
  AwardIcon,
  ActivityIcon,
} from './Icons';

interface SessionSummaryViewProps {
  metrics: SessionMetrics;
  zoneAnalytics: ZoneAnalytics;
  selectedDrill: DrillDefinition;
  athleteName: string;
  athleteRoleLabel: string;
  isKidsMode: boolean;
  hasCompletedSession: boolean;
  sessionEvents?: SessionEventLogItem[];
  syncStatus?: SessionSyncStatus;
  offlinePendingCount?: number;
  onRetryOfflineSync?: () => void;
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
  sessionEvents = [],
  syncStatus = 'IDLE',
  offlinePendingCount = 0,
  onRetryOfflineSync,
  onStartNewSession,
}) => {
  const { theme, fs } = useAccessibility();
  const { width, isMobile, isSmallPhone, cardPadding } = useResponsive();
  const isFourCols = width >= 960;
  const isTwoZoneCols = width >= 760;

  // Estados para Histórico e Indicadores (RF13)
  const [periodFilter, setPeriodFilter] = useState<number>(0); // 0 = Todos, 7 = 7 dias, 1 = 24h
  const [drillFilter, setDrillFilter] = useState<string>('ALL');
  const [historyList, setHistoryList] = useState<TrainingSessionRecord[]>([]);
  const [historyStats, setHistoryStats] = useState<SessionStatsSummary | null>(null);
  const [historySource, setHistorySource] = useState<'API' | 'CACHE_OFFLINE'>('API');
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const loadHistoryData = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.listSessions({
        drillId: drillFilter,
        periodDays: periodFilter > 0 ? periodFilter : undefined,
      });
      setHistoryList(res.sessions);
      setHistoryStats(res.stats);
      setHistorySource(res.source);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [drillFilter, periodFilter]);

  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData, hasCompletedSession, syncStatus]);

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

  // Recomendações automáticas e conquistas da sessão (RF12)
  const recommendations: string[] = [];
  const achievements: string[] = [];

  if (totalAttempts > 0) {
    if (accuracyPct >= 85) {
      achievements.push('🏅 Precisão de Elite (>= 85%)');
    }
    if (metrics.maxStreak >= 5) {
      achievements.push('🔥 Multiplicador Máximo 1.5x (Streak 5+)');
    }
    if (metrics.averageReactionTimeMs > 0 && metrics.averageReactionTimeMs <= 800) {
      achievements.push('⚡ Reflexo Relâmpago (< 800ms)');
    }
    if (isKidsMode && metrics.hits >= 3) {
      achievements.push('⭐ Explorador Estelar Kids');
    }

    // Identificar zona com menor precisão para recomendação tática
    let weakestTarget: TargetId | null = null;
    let lowestPct = 101;
    for (const id of targetIds) {
      const att = zoneAnalytics.attempts[id] || 0;
      if (att > 0) {
        const pct = Math.round(((zoneAnalytics.hits[id] || 0) / att) * 100);
        if (pct < lowestPct) {
          lowestPct = pct;
          weakestTarget = id;
        }
      }
    }

    if (weakestTarget && lowestPct < 80) {
      recommendations.push(
        `Foco Tático: Reforçar batidas no Alvo 0${weakestTarget} (${TARGET_TACTICAL_NAMES[weakestTarget]} - ${lowestPct}% de acerto).`
      );
    } else {
      recommendations.push(
        'Consistência excelente em todas as zonas! Recomendado avançar para um protocolo de janela temporal menor.'
      );
    }

    if (metrics.averageReactionTimeMs > 1100 && !isKidsMode) {
      recommendations.push(
        'Ajuste Postural: Antecipe o split-step no centro da linha de base para reduzir o tempo de reação abaixo de 900ms.'
      );
    }
  } else {
    recommendations.push(
      'Execute uma sessão na aba Arena para gerar recomendações personalizadas de desempenho por zona.'
    );
  }

  return (
    <View style={{ gap: isMobile ? 14 : 20 }}>
      {/* CARD 1: RESUMO DA SESSÃO ATUAL + RECOMENDAÇÕES + TELEMETRIA (RF12, RF19, RF21) */}
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <View
                style={[
                  styles.reportBadge,
                  { backgroundColor: theme.primarySoft, marginBottom: 0 },
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

              {/* Status de Sincronização API / Offline (RF19 & RF21) */}
              <View
                style={[
                  styles.reportBadge,
                  {
                    marginBottom: 0,
                    backgroundColor:
                      syncStatus === 'OFFLINE_QUEUED' || offlinePendingCount > 0
                        ? theme.warningSoft
                        : theme.surfaceMint,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      syncStatus === 'OFFLINE_QUEUED' || offlinePendingCount > 0
                        ? theme.warning
                        : theme.primaryDark,
                    fontWeight: '800',
                    fontSize: fs(10),
                  }}
                >
                  {syncStatus === 'SYNCING'
                    ? '⟳ Sincronizando API...'
                    : syncStatus === 'OFFLINE_QUEUED' || offlinePendingCount > 0
                    ? `⚡ Modo Offline RF21 (${offlinePendingCount} na fila)`
                    : syncStatus === 'SYNCED'
                    ? '✓ Sincronizado c/ Plataforma Mãe (RF19)'
                    : '● Pronto p/ Sincronizar'}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.mainTitle,
                { color: theme.text, fontSize: isMobile ? fs(19) : fs(24) },
              ]}
            >
              {isKidsMode ? 'Resumo Estelar da Partida' : 'Resumo Analítico da Sessão (RF12)'}
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
                {selectedDrill.title} (v{selectedDrill.version})
              </Text>
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {offlinePendingCount > 0 && onRetryOfflineSync && (
              <TouchableOpacity
                accessibilityRole="button"
                style={[
                  styles.syncRetryBtn,
                  { backgroundColor: theme.warningSoft, borderColor: theme.warningBorder },
                ]}
                onPress={async () => {
                  await onRetryOfflineSync();
                  loadHistoryData();
                }}
              >
                <RefreshIcon size={13} color={theme.warning} />
                <Text style={{ color: theme.warning, fontWeight: '800', fontSize: fs(12) }}>
                  Reenviar Offline ({offlinePendingCount})
                </Text>
              </TouchableOpacity>
            )}

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
            { gap: isMobile ? 10 : 14, marginBottom: isMobile ? 18 : 24 },
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

        {/* Conquistas, Metas Atingidas e Recomendações Táticas (RF12) */}
        <View
          style={[
            styles.recBox,
            { backgroundColor: theme.bg, borderColor: theme.primaryBorder, marginBottom: 20 },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <AwardIcon size={16} color={theme.primary} />
            <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(13) }}>
              Metas Atingidas, Conquistas & Recomendações (RF12)
            </Text>
          </View>

          {achievements.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {achievements.map((ach, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.achPill,
                    { backgroundColor: theme.surfaceMint, borderColor: theme.primary },
                  ]}
                >
                  <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(10) }}>
                    {ach}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {recommendations.map((rec, idx) => (
            <Text
              key={idx}
              style={{ color: theme.textSecondary, fontSize: fs(12), lineHeight: 18 }}
            >
              • {rec}
            </Text>
          ))}

          {isKidsMode && (
            <Text
              style={{
                color: theme.primaryDark,
                fontWeight: '700',
                fontSize: fs(10),
                marginTop: 6,
              }}
            >
              🛡️ Proteção LGPD Infantil Ativa (Seção 3): Coleta mínima aplicada no envio para a API.
            </Text>
          )}
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

        {/* Eventos Relevantes da Sessão Atual (RF12 & RF19) */}
        {sessionEvents.length > 0 && (
          <View style={{ marginTop: 18 }}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontSize: fs(14) }]}>
              Eventos Relevantes & Telemetria da Sessão ({sessionEvents.length} eventos)
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {sessionEvents.map((ev, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.eventChip,
                    {
                      backgroundColor:
                        ev.result === 'HIT'
                          ? theme.surfaceMint
                          : ev.result === 'ESTOP'
                          ? theme.dangerSoft
                          : theme.surfaceMuted,
                      borderColor:
                        ev.result === 'HIT'
                          ? theme.primaryBorder
                          : ev.result === 'ESTOP'
                          ? theme.dangerBorder
                          : theme.borderNeutral,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        ev.result === 'HIT'
                          ? theme.primaryDark
                          : ev.result === 'ESTOP'
                          ? theme.danger
                          : theme.textSecondary,
                      fontWeight: '700',
                      fontSize: fs(10),
                    }}
                  >
                    #{ev.stepNumber} Alvo 0{ev.targetId}: {ev.result}{' '}
                    {ev.reactionTimeMs ? `(${ev.reactionTimeMs}ms)` : ''}{' '}
                    {ev.pointsDelta !== 0
                      ? `[${ev.pointsDelta > 0 ? '+' : ''}${ev.pointsDelta}pts]`
                      : ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* CARD 2: HISTÓRICO DE SESSÕES E INDICADORES DE EVOLUÇÃO (RF13) */}
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
        <View style={styles.topHeader}>
          <View style={{ flex: 1, minWidth: 200 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIcon size={18} color={theme.primary} />
              <Text
                style={[
                  styles.mainTitle,
                  { color: theme.text, fontSize: isMobile ? fs(17) : fs(20), marginBottom: 0 },
                ]}
              >
                Histórico de Sessões & Indicadores de Evolução (RF13)
              </Text>
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: fs(12), marginTop: 3 }}>
              Consulte métricas acumuladas de precisão, consistência, tempo, volume e progressão ({historySource === 'API' ? 'Sincronizado via MySQL' : 'Cache Local Offline'}).
            </Text>
          </View>

          {/* Filtros de Período e Treino (RF13) */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[
              { days: 0, label: 'Todo Período' },
              { days: 7, label: 'Últimos 7 Dias' },
              { days: 1, label: 'Hoje (24h)' },
            ].map((p) => {
              const active = periodFilter === p.days;
              return (
                <TouchableOpacity
                  key={p.days}
                  style={[
                    styles.filterBtn,
                    {
                      backgroundColor: active ? theme.primary : theme.surfaceMuted,
                      borderColor: active ? theme.primary : theme.borderNeutral,
                    },
                  ]}
                  onPress={() => setPeriodFilter(p.days)}
                >
                  <Text
                    style={{
                      color: active ? '#FFFFFF' : theme.textSecondary,
                      fontWeight: '700',
                      fontSize: fs(11),
                    }}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[
                styles.filterBtn,
                {
                  backgroundColor:
                    drillFilter !== 'ALL' ? theme.surfaceMint : theme.surface,
                  borderColor:
                    drillFilter !== 'ALL' ? theme.primary : theme.borderNeutral,
                },
              ]}
              onPress={() =>
                setDrillFilter((prev) =>
                  prev === 'ALL' ? selectedDrill.id : 'ALL'
                )
              }
            >
              <Text
                style={{
                  color:
                    drillFilter !== 'ALL' ? theme.primaryDark : theme.textSecondary,
                  fontWeight: '700',
                  fontSize: fs(11),
                }}
              >
                {drillFilter === 'ALL'
                  ? 'Treino: Todos'
                  : `Filtro: ${selectedDrill.title.slice(0, 16)}...`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {isLoadingHistory ? (
          <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            {/* Indicadores Agregados de Precisão, Consistência, Volume e Progressão (RF13) */}
            {historyStats && (
              <View
                style={[
                  styles.kpiGrid,
                  !isFourCols && styles.kpiGridWrap,
                  { gap: 10, marginTop: 14, marginBottom: 16 },
                ]}
              >
                <View
                  style={[
                    styles.statMiniCard,
                    { backgroundColor: theme.bg, borderColor: theme.primaryBorder },
                  ]}
                >
                  <Text style={{ color: theme.textMuted, fontWeight: '700', fontSize: fs(10) }}>
                    VOLUME & SESSÕES
                  </Text>
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: fs(18), marginTop: 2 }}>
                    {historyStats.totalSessions} sessões ({historyStats.totalShotsVolume} bolas)
                  </Text>
                </View>

                <View
                  style={[
                    styles.statMiniCard,
                    { backgroundColor: theme.bg, borderColor: theme.primaryBorder },
                  ]}
                >
                  <Text style={{ color: theme.textMuted, fontWeight: '700', fontSize: fs(10) }}>
                    PRECISÃO & CONSISTÊNCIA
                  </Text>
                  <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(18), marginTop: 2 }}>
                    {historyStats.averageAccuracyPct}% • Consist.: {historyStats.consistencyIndexPct}%
                  </Text>
                </View>

                <View
                  style={[
                    styles.statMiniCard,
                    { backgroundColor: theme.bg, borderColor: theme.primaryBorder },
                  ]}
                >
                  <Text style={{ color: theme.textMuted, fontWeight: '700', fontSize: fs(10) }}>
                    PROGRESSÃO & REAÇÃO MÉDIA
                  </Text>
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: fs(18), marginTop: 2 }}>
                    {historyStats.progressionDeltaPct >= 0
                      ? `+${historyStats.progressionDeltaPct}% evolução`
                      : `${historyStats.progressionDeltaPct}% var.`}{' '}
                    ({historyStats.averageReactionTimeMs}ms)
                  </Text>
                </View>
              </View>
            )}

            {/* Lista de Sessões Registradas */}
            <View style={{ gap: 8 }}>
              {historyList.slice(0, 8).map((item) => (
                <View
                  key={item.sessionUuid}
                  style={[
                    styles.historyRow,
                    { backgroundColor: theme.surface, borderColor: theme.borderNeutral },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 180 }}>
                    <Text style={{ color: theme.text, fontWeight: '800', fontSize: fs(13) }}>
                      {item.drillTitle}{' '}
                      <Text style={{ color: theme.textMuted, fontWeight: '600', fontSize: fs(11) }}>
                        (v{item.drillVersion})
                      </Text>
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: fs(11), marginTop: 2 }}>
                      Atleta: {item.athleteName} • {new Date(item.completedAt).toLocaleString('pt-BR')} •{' '}
                      {item.hardwareMode === 'WEB_SERIAL' ? 'USB Real' : 'Simulador'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={[
                        styles.zonePctPill,
                        { backgroundColor: theme.surfaceMint },
                      ]}
                    >
                      <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(11) }}>
                        {item.score} pts • {item.accuracyPct}% ({item.averageReactionTimeMs}ms)
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
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
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  newSessionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  syncRetryBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
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
  recBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  achPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
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
    paddingVertical: 4,
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
  eventChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  statMiniCard: {
    flex: 1,
    minWidth: 180,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
