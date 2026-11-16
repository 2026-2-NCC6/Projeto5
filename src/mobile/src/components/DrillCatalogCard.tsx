/**
 * Smart Tennis Arena — Catálogo de Treinos com Filtros (RF03),
 * Detalhes e Preparação Pré-Sessão (RF04) e Metadados de Marketplace (RF20)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  DrillDefinition,
  DrillDifficulty,
  DrillCategory,
  DRILL_CATEGORY_LABELS,
  DEFAULT_DRILLS,
  TARGET_TACTICAL_NAMES,
} from '../../../packages/shared/src/contracts/drills';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import { SlidersIcon, ShieldAlertIcon, CheckCircleIcon } from './Icons';

interface DrillCatalogCardProps {
  selectedDrill: DrillDefinition;
  isKidsMode: boolean;
  onSelectDrill: (drill: DrillDefinition) => void;
  drillsList?: DrillDefinition[];
  catalogSource?: 'API' | 'CACHE_OFFLINE';
  onOpenEditor?: (drillToEdit?: DrillDefinition) => void;
}

function getDifficultyLabel(diff: DrillDifficulty, isKids: boolean): string {
  if (isKids) return 'Kids / Lúdico';
  switch (diff) {
    case DrillDifficulty.BEGINNER:
      return 'Iniciante';
    case DrillDifficulty.EASY:
      return 'Básico';
    case DrillDifficulty.INTERMEDIATE:
      return 'Intermediário';
    case DrillDifficulty.ADVANCED:
      return 'Avançado';
    case DrillDifficulty.PRO:
      return 'Profissional';
    default:
      return 'Padrão';
  }
}

export const DrillCatalogCard: React.FC<DrillCatalogCardProps> = ({
  selectedDrill,
  isKidsMode,
  onSelectDrill,
  drillsList = DEFAULT_DRILLS,
  catalogSource = 'API',
  onOpenEditor,
}) => {
  const { theme, fs } = useAccessibility();
  const { isMobile, isTablet, isDesktop, cardPadding } = useResponsive();

  const [audienceFilter, setAudienceFilter] = useState<'ALL' | 'KIDS' | 'PRO'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | DrillCategory>('ALL');
  const [showPreparation, setShowPreparation] = useState<boolean>(true);

  const publishedDrills = drillsList.filter(
    (d) => !d.status || d.status === 'PUBLISHED' || d.id === selectedDrill.id
  );

  const filteredDrills = publishedDrills.filter((d) => {
    if (audienceFilter === 'KIDS' && !d.isKidsAdapted) return false;
    if (audienceFilter === 'PRO' && d.isKidsAdapted) return false;
    if (categoryFilter !== 'ALL' && d.category !== categoryFilter) return false;
    return true;
  });

  const displayList = filteredDrills.length > 0 ? filteredDrills : publishedDrills;

  const prep = selectedDrill.preparation;
  const mkt = selectedDrill.marketplace;
  const estSec =
    prep?.estimatedDurationSec ||
    Math.round(selectedDrill.steps.reduce((acc, s) => acc + s.durationMs, 0) / 1000) + 3;
  const reqSensors =
    prep?.requiredSensors ||
    Array.from(new Set(selectedDrill.steps.map((s) => s.targetId))).sort();

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
      {/* Topo do Catálogo + Origem API/Offline (RF18, RF21) */}
      <View style={styles.topBar}>
        <View style={styles.headerRow}>
          <SlidersIcon size={18} color={theme.primary} />
          <Text
            style={[
              styles.title,
              { color: theme.text, fontSize: isMobile ? fs(16) : fs(17) },
            ]}
          >
            Catálogo de Treinos (RF03)
          </Text>
        </View>

        <View
          style={[
            styles.sourceBadge,
            {
              backgroundColor:
                catalogSource === 'API' ? theme.surfaceMint : theme.warningSoft,
              borderColor:
                catalogSource === 'API' ? theme.primaryBorder : theme.warningBorder,
            },
          ]}
        >
          <Text
            style={{
              color: catalogSource === 'API' ? theme.primaryDark : theme.warning,
              fontWeight: '800',
              fontSize: fs(9),
            }}
          >
            {catalogSource === 'API' ? '● API REST SYNC' : '● CACHE OFFLINE (RF21)'}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.subtitle,
          { color: theme.textSecondary, fontSize: fs(12) },
        ]}
      >
        Filtre por público, objetivo, dificuldade e consulte instruções antes da partida.
      </Text>

      {/* Filtros do Catálogo (RF03) */}
      <View style={styles.filterGroup}>
        <View style={styles.filterRow}>
          {(
            [
              { key: 'ALL', label: 'Todos Públicos' },
              { key: 'PRO', label: '🎾 Adulto / Pro' },
              { key: 'KIDS', label: '🧒 Kids (5-12a)' },
            ] as const
          ).map((f) => {
            const active = audienceFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? theme.primary : theme.surfaceMuted,
                    borderColor: active ? theme.primary : theme.borderNeutral,
                  },
                ]}
                onPress={() => setAudienceFilter(f.key)}
              >
                <Text
                  style={{
                    color: active ? '#FFFFFF' : theme.textSecondary,
                    fontWeight: '700',
                    fontSize: fs(10),
                  }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.filterRow}>
          {(
            [
              { key: 'ALL', label: 'Todos Objetivos' },
              { key: DrillCategory.REACTION, label: 'Reação' },
              { key: DrillCategory.PRECISION, label: 'Precisão' },
              { key: DrillCategory.ENDURANCE, label: 'Resistência' },
              { key: DrillCategory.KIDS_FUN, label: 'Lúdico' },
            ] as const
          ).map((c) => {
            const active = categoryFilter === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surface,
                    borderColor: active ? theme.primary : theme.borderNeutral,
                  },
                ]}
                onPress={() => setCategoryFilter(c.key)}
              >
                <Text
                  style={{
                    color: active ? theme.primaryDark : theme.textMuted,
                    fontWeight: '700',
                    fontSize: fs(10),
                  }}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Lista de Treinos */}
      <View
        style={[
          styles.list,
          isTablet && !isDesktop && styles.listTabletGrid,
        ]}
      >
        {displayList.map((drill) => {
          const isSelected = selectedDrill.id === drill.id;
          const maxWindow = Math.max(...drill.steps.map((s) => s.durationMs));
          const effectiveWindow = isKidsMode
            ? Math.round(maxWindow * 1.5)
            : maxWindow;
          const drillSensors =
            drill.preparation?.requiredSensors ||
            Array.from(new Set(drill.steps.map((s) => s.targetId))).sort();

          return (
            <TouchableOpacity
              key={drill.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              activeOpacity={0.82}
              onPress={() => onSelectDrill(drill)}
              style={[
                styles.drillCard,
                isTablet && !isDesktop && styles.drillCardTablet,
                {
                  backgroundColor: isSelected ? theme.surfaceMint : theme.surface,
                  borderColor: isSelected ? theme.primary : theme.borderNeutral,
                  borderWidth: isSelected ? 2 : 1,
                  padding: isMobile ? 12 : 14,
                },
              ]}
            >
              <View style={styles.drillTopRow}>
                <Text
                  style={[
                    styles.drillTitle,
                    { color: theme.text, fontSize: fs(13) },
                  ]}
                >
                  {drill.title}
                </Text>
                <View
                  style={[
                    styles.diffBadge,
                    {
                      backgroundColor: theme.surface,
                      borderColor: isSelected ? theme.primaryBorder : theme.borderNeutral,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.diffBadgeText,
                      {
                        color: isSelected ? theme.primaryDark : theme.textSecondary,
                        fontSize: fs(10),
                      },
                    ]}
                  >
                    {getDifficultyLabel(drill.difficulty, drill.isKidsAdapted)}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.drillDesc,
                  { color: theme.textSecondary, fontSize: fs(11) },
                ]}
              >
                {drill.description}
              </Text>

              <Text
                style={[
                  styles.drillMeta,
                  {
                    color: isSelected ? theme.primaryDark : theme.textMuted,
                    fontSize: fs(10),
                  },
                ]}
              >
                v{drill.version} • {drill.steps.length} bolas (~{estSec}s) • Janela:{' '}
                {effectiveWindow}ms • Sensores: {drillSensors.length}/5
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Painel de Detalhes, Preparação, Segurança e Marketplace antes da Sessão (RF04 + RF20) */}
      <View
        style={[
          styles.prepBox,
          {
            backgroundColor: theme.bg,
            borderColor: theme.primaryBorder,
          },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.prepHeaderBtn}
          onPress={() => setShowPreparation((v) => !v)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <CheckCircleIcon size={15} color={theme.primaryDark} />
            <Text
              style={{
                color: theme.primaryDark,
                fontWeight: '800',
                fontSize: fs(12),
                flexShrink: 1,
              }}
            >
              Preparação, Regras & Riscos (RF04)
            </Text>
          </View>
          <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(11) }}>
            {showPreparation ? 'Ocultar ▴' : 'Expandir ▾'}
          </Text>
        </TouchableOpacity>

        {showPreparation && (
          <View style={styles.prepBody}>
            {/* Metadados de Autoria e Marketplace (RF20) */}
            <View
              style={[
                styles.mktBadgeBox,
                { backgroundColor: theme.surface, borderColor: theme.borderNeutral },
              ]}
            >
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: fs(11) }}>
                Autor: {selectedDrill.authorName} • Versão {selectedDrill.version} (
                {DRILL_CATEGORY_LABELS[selectedDrill.category] || selectedDrill.category})
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: fs(10), marginTop: 2 }}>
                Marketplace (RF20): Licença{' '}
                {mkt?.licenseType || 'FREE_OPEN'} • Remuneração:{' '}
                {mkt?.remunerationModel || 'FREE'} • Compatível:{' '}
                {mkt?.compatibility || 'Arduino Uno R3 + Simulador'}
              </Text>
            </View>

            {/* Instruções de Preparação */}
            <Text style={[styles.prepSecLabel, { color: theme.text, fontSize: fs(11) }]}>
              📋 Instruções & Equipamentos Necessários:
            </Text>
            {(
              prep?.instructions || [
                'Posicione-se no centro da linha de base aguardando o sinal luminoso.',
                'Rebata no alvo aceso dentro da janela temporal indicada no HUD.',
              ]
            ).map((inst, idx) => (
              <Text
                key={idx}
                style={{ color: theme.textSecondary, fontSize: fs(11), lineHeight: 16 }}
              >
                • {inst}
              </Text>
            ))}

            <Text
              style={{
                color: theme.primaryDark,
                fontWeight: '700',
                fontSize: fs(10),
                marginTop: 4,
              }}
            >
              Sensores Exigidos: Piezos #{reqSensors.join(', #')} • Equipamentos:{' '}
              {(prep?.equipmentRequired || ['Raquete', '5 Alvos Piezo + LEDs']).join(' + ')}
            </Text>

            {/* Critérios de Pontuação e Parâmetros da Máquina (RF04, RF09, RF10) */}
            <Text style={[styles.prepSecLabel, { color: theme.text, fontSize: fs(11) }]}>
              🏆 Regras de Pontuação & Parâmetros do Exercício:
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: fs(11), lineHeight: 16 }}>
              {prep?.scoringRulesSummary ||
                'Pontuação determinística por tempo restante, streak (até 1.5x) e força ADC.'}
            </Text>

            {/* Preview compacto dos passos da máquina */}
            <View style={styles.stepsPreviewWrap}>
              {selectedDrill.steps.slice(0, 6).map((st) => (
                <View
                  key={st.stepNumber}
                  style={[
                    styles.stepChip,
                    { backgroundColor: theme.surface, borderColor: theme.borderNeutral },
                  ]}
                >
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: fs(9) }}>
                    #{st.stepNumber} Alvo 0{st.targetId} ({TARGET_TACTICAL_NAMES[st.targetId].split(' ')[0]}) •{' '}
                    {st.ballSpeedKmh || 85}km/h {st.spinType || 'FLAT'}
                  </Text>
                </View>
              ))}
              {selectedDrill.steps.length > 6 && (
                <Text style={{ color: theme.textMuted, fontSize: fs(10), alignSelf: 'center' }}>
                  +{selectedDrill.steps.length - 6} bolas
                </Text>
              )}
            </View>

            {/* Avisos de Riscos e Segurança Física (RF04, RF22) */}
            <View
              style={[
                styles.riskWarningBox,
                { backgroundColor: theme.warningSoft, borderColor: theme.warningBorder },
              ]}
            >
              <ShieldAlertIcon size={14} color={theme.warning} />
              <Text
                style={{
                  color: theme.warning,
                  fontSize: fs(10),
                  fontWeight: '600',
                  flex: 1,
                  lineHeight: 14,
                }}
              >
                Riscos & Segurança: {(
                  prep?.safetyWarnings || [
                    'Verifique área livre ao redor dos alvos e mantenha o comando !EMG acessível.',
                  ]
                ).join(' ')}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Atalho para o Editor/Criador de Treinos no Site (RF14-RF16) */}
      {onOpenEditor && (
        <View style={styles.editorActionsRow}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            style={[
              styles.editorBtn,
              { backgroundColor: theme.surfaceMint, borderColor: theme.primaryBorder },
            ]}
            onPress={() => onOpenEditor(selectedDrill)}
          >
            <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(11) }}>
              ✎ Editar / Simular este Treino (RF14)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            style={[styles.editorBtnPrimary, { backgroundColor: theme.primary }]}
            onPress={() => onOpenEditor(undefined)}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fs(11) }}>
              + Criar Novo Treino
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 17,
  },
  filterGroup: {
    gap: 6,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  list: {
    gap: 9,
  },
  listTabletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  drillCard: {
    borderRadius: 14,
  },
  drillCardTablet: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  drillTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  drillTitle: {
    fontWeight: '800',
    flex: 1,
    minWidth: 140,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  diffBadgeText: {
    fontWeight: '700',
  },
  drillDesc: {
    lineHeight: 16,
    marginBottom: 6,
  },
  drillMeta: {
    fontWeight: '700',
  },
  prepBox: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  prepHeaderBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  prepBody: {
    marginTop: 10,
    gap: 5,
  },
  mktBadgeBox: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  prepSecLabel: {
    fontWeight: '800',
    marginTop: 4,
  },
  stepsPreviewWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 4,
  },
  stepChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  riskWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 9,
    borderWidth: 1,
    marginTop: 6,
  },
  editorActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  editorBtn: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorBtnPrimary: {
    flex: 1,
    minWidth: 130,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
