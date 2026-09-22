/**
 * Smart Tennis Arena — Relatório Analítico de Resumo de Sessão (RF12)
 * Alinhado com: docs/spec/01-system-requirements.md (RF12)
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { SessionMetrics } from '../../../packages/shared/src/fsm/types';
import { TARGET_LABELS } from '../../../packages/shared/src/contracts/drills';
import { TargetId } from '../../../packages/shared/src/protocol/serial';

interface SessionSummaryModalProps {
  visible: boolean;
  metrics: SessionMetrics;
  isKidsMode: boolean;
  onClose: () => void;
  onRestart: () => void;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  visible,
  metrics,
  isKidsMode,
  onClose,
  onRestart,
}) => {
  const totalAttempts = metrics.hits + metrics.misses + metrics.wrongHits;
  const accuracyPct =
    totalAttempts > 0 ? Math.round((metrics.hits / totalAttempts) * 100) : 0;

  const targetIds: TargetId[] = [1, 2, 3, 4, 5];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.trophy}>🏆</Text>
          <Text style={styles.title}>
            {isKidsMode ? 'PARABÉNS, CAMPEÃO!' : 'TREINO FINALIZADO!'}
          </Text>
          <Text style={styles.subtitle}>Relatório Analítico de Desempenho (RF12)</Text>

          {/* Cards de Métricas Principais */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{metrics.score}</Text>
              <Text style={styles.metricLbl}>PONTOS TOTAIS</Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: '#10B981' }]}>{accuracyPct}%</Text>
              <Text style={styles.metricLbl}>PRECISÃO GLOBAL</Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: '#F97316' }]}>🔥 {metrics.maxStreak}</Text>
              <Text style={styles.metricLbl}>MAIOR COMBO</Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: '#38BDF8' }]}>
                {metrics.averageReactionTimeMs} ms
              </Text>
              <Text style={styles.metricLbl}>TEMPO DE REAÇÃO</Text>
            </View>
          </View>

          {/* Mapa de Calor / Distribuição dos 5 Alvos */}
          <Text style={styles.sectionTitle}>🎯 Distribuição de Acertos nos Alvos:</Text>
          <View style={styles.heatMapList}>
            {targetIds.map((id) => (
              <View key={id} style={styles.heatMapItem}>
                <Text style={styles.targetName}>Alvo {id} ({TARGET_LABELS[id]}):</Text>
                <Text style={styles.targetHits}>{metrics.hitsByTarget[id] || 0} acertos</Text>
              </View>
            ))}
          </View>

          {/* Botões de Ação */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionBtnSecondary} onPress={onClose}>
              <Text style={styles.btnTextSecondary}>Voltar ao Menu</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnPrimary} onPress={onRestart}>
              <Text style={styles.btnTextPrimary}>Repetir Treino</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    borderWidth: 2,
    borderColor: '#38BDF8',
    alignItems: 'center',
  },
  trophy: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  metricBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FBBF24',
  },
  metricLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heatMapList: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 20,
    gap: 6,
  },
  heatMapItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  targetName: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  targetHits: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnTextSecondary: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  btnTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
