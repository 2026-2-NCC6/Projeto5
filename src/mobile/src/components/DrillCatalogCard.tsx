/**
 * Smart Tennis Arena — Catálogo de Treinos Dinâmico com Filtros (RF03),
 * Detalhes e Preparação Pré-Sessão (RF04), Integração API/Offline (RF18, RF21) e Marketplace (RF20)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  DrillDefinition,
  DrillDifficulty,
  DrillCategory,
  DrillRequiredSensor,
  DRILL_CATEGORY_LABELS,
  DEFAULT_DRILLS,
  TARGET_TACTICAL_NAMES,
} from '../../../packages/shared/src/contracts/drills';
import { api } from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import {
  SlidersIcon,
  ShieldAlertIcon,
  CheckCircleIcon,
  RefreshIcon,
  PlayIcon,
  CloseIcon,
} from './Icons';

interface DrillCatalogCardProps {
  selectedDrill: DrillDefinition;
  isKidsMode: boolean;
  onSelectDrill: (drill: DrillDefinition) => void;
  drillsList?: DrillDefinition[];
  catalogSource?: 'API' | 'CACHE_OFFLINE';
  onOpenEditor?: (drillToEdit?: DrillDefinition) => void;
  onStartDrill?: (drill: DrillDefinition) => void;
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
  onStartDrill,
}) => {
  const { theme, fs } = useAccessibility();
  const { isMobile, isTablet, isDesktop, cardPadding } = useResponsive();

  const [rawDrills, setRawDrills] = useState<DrillDefinition[]>(drillsList);
  const [sourceState, setSourceState] = useState<'API' | 'CACHE_OFFLINE'>(catalogSource);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [audienceFilter, setAudienceFilter] = useState<'ALL' | 'KIDS' | 'PRO'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | 'ALL'>('ALL');
  const [maxDurationFilter, setMaxDurationFilter] = useState<number | 'ALL'>('ALL');
  const [selectedSensorFilter, setSelectedSensorFilter] = useState<DrillRequiredSensor | 'ALL'>('ALL');
  const [showPreparation, setShowPreparation] = useState<boolean>(true);

  useEffect(() => {
    if (Array.isArray(drillsList)) {
      setRawDrills(drillsList);
    }
  }, [drillsList]);

  useEffect(() => {
    setSourceState(catalogSource);
  }, [catalogSource]);

  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const { drills, source } = await api.listDrills();
      if (Array.isArray(drills) && drills.length > 0) {
        setRawDrills(drills.filter((d) => !d.status || d.status === 'PUBLISHED'));
        setSourceState(source);
      }
    } catch {
      setRawDrills(DEFAULT_DRILLS);
      setSourceState('CACHE_OFFLINE');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDrills = useMemo(() => {
    return rawDrills.filter((drill) => {
      if (drill.status && drill.status !== 'PUBLISHED') return false;
      if (audienceFilter === 'KIDS' && !drill.isKidsAdapted) return false;
      if (audienceFilter === 'PRO' && drill.isKidsAdapted) return false;
      if (selectedCategory !== 'TODAS' && drill.category !== selectedCategory) {
        return false;
      }
      if (selectedDifficulty !== 'ALL' && drill.difficulty !== selectedDifficulty) {
        return false;
      }
      if (maxDurationFilter !== 'ALL') {
        const drillEstSec =
          drill.preparation?.estimatedDurationSec ||
          drill.estimatedDurationSec ||
          Math.round(drill.steps.reduce((acc, s) => acc + s.durationMs, 0) / 1000) + 3;
        if (drillEstSec > maxDurationFilter) {
          return false;
        }
      }
      if (selectedSensorFilter !== 'ALL') {
        const sensors = drill.requiredSensors || [
          'PIEZO_TARGETS',
          'LED_RING',
          'BUZZER',
          'BALL_MACHINE_SIM',
        ];
        if (!sensors.includes(selectedSensorFilter)) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const haystack = `${drill.title} ${drill.description} ${drill.objective || ''} ${drill.authorName || ''}`.toLowerCase();
        if (!haystack.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [
    rawDrills,
    audienceFilter,
    selectedCategory,
    selectedDifficulty,
    maxDurationFilter,
    selectedSensorFilter,
    searchTerm,
  ]);

  const hasActiveFilters =
    audienceFilter !== 'ALL' ||
    selectedCategory !== 'TODAS' ||
    selectedDifficulty !== 'ALL' ||
    maxDurationFilter !== 'ALL' ||
    selectedSensorFilter !== 'ALL' ||
    searchTerm.trim().length > 0;

  const clearFilters = () => {
    setAudienceFilter('ALL');
    setSelectedCategory('TODAS');
    setSelectedDifficulty('ALL');
    setMaxDurationFilter('ALL');
    setSelectedSensorFilter('ALL');
    setSearchTerm('');
  };

  const prep = selectedDrill.preparation;
  const mkt = selectedDrill.marketplace;
  const estSec =
    prep?.estimatedDurationSec ||
    selectedDrill.estimatedDurationSec ||
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
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <SlidersIcon size={18} color={theme.primary} />
          <Text
            style={[
              styles.title,
              { color: theme.text, fontSize: isMobile ? fs(15) : fs(17) },
            ]}
          >
            Catálogo de Treinos (RF03 / RF18)
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={[
              styles.sourceBadge,
              {
                backgroundColor:
                  sourceState === 'API' ? theme.surfaceMint : theme.warningSoft,
                borderColor:
                  sourceState === 'API' ? theme.primaryBorder : theme.warningBorder,
              },
            ]}
          >
            <Text
              style={{
                color: sourceState === 'API' ? theme.primaryDark : theme.warning,
                fontWeight: '800',
                fontSize: fs(9),
              }}
            >
              {sourceState === 'API' ? '● API REST SYNC' : '● CACHE OFFLINE (RF21)'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityLabel="Atualizar catálogo de treinos"
            style={[styles.refreshBtn, { borderColor: theme.borderNeutral }]}
            onPress={fetchCatalog}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <RefreshIcon size={14} color={theme.primaryDark} />
            )}
          </TouchableOpacity>
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

      {/* Barra de Filtros RF03 */}
      <View style={styles.filterBar}>
        <View
          style={[
            styles.searchInputWrap,
            {
              backgroundColor: theme.surfaceMuted,
              borderColor: theme.borderNeutral,
            },
          ]}
        >
          <TextInput
            style={[
              styles.searchInput,
              {
                color: theme.text,
                fontSize: fs(12),
              },
            ]}
            placeholder="Buscar por objetivo, autor ou nome..."
            placeholderTextColor={theme.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => setSearchTerm('')}
            >
              <CloseIcon size={14} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtro por Público */}
        <View style={styles.pillsRow}>
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
                    fontSize: fs(10.5),
                  }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Filtro por Categoria */}
        <View style={styles.pillsRow}>
          {[
            { key: 'TODAS', label: 'Todas' },
            { key: DrillCategory.PRECISION, label: 'Precisão' },
            { key: DrillCategory.REACTION, label: 'Reação' },
            { key: DrillCategory.ENDURANCE, label: 'Resistência' },
            { key: DrillCategory.KIDS_FUN, label: '⭐ Kids' },
          ].map((cat) => {
            const active = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                activeOpacity={0.75}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surface,
                    borderColor: active ? theme.primary : theme.borderNeutral,
                  },
                ]}
                onPress={() => {
                  const nextCat = active && cat.key !== 'TODAS' ? 'TODAS' : cat.key;
                  setSelectedCategory(nextCat);
                  const matching = rawDrills.filter(
                    (d) => nextCat === 'TODAS' || d.category === nextCat
                  );
                  if (matching.length > 0 && !matching.some((d) => d.id === selectedDrill.id)) {
                    onSelectDrill(matching[0]);
                  }
                }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: active ? theme.primaryDark : theme.textMuted,
                      fontSize: fs(10.5),
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Filtro por Dificuldade (1..5) */}
        <View style={styles.pillsRow}>
          {(
            [
              { key: 'ALL', label: 'Dificuldade: Todas' },
              { key: DrillDifficulty.BEGINNER, label: 'Nível 1' },
              { key: DrillDifficulty.EASY, label: 'Nível 2' },
              { key: DrillDifficulty.INTERMEDIATE, label: 'Nível 3' },
              { key: DrillDifficulty.ADVANCED, label: 'Nível 4' },
              { key: DrillDifficulty.PRO, label: 'Nível 5' },
            ] as const
          ).map((diffOpt) => {
            const active = selectedDifficulty === diffOpt.key;
            return (
              <TouchableOpacity
                key={String(diffOpt.key)}
                activeOpacity={0.75}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surface,
                    borderColor: active ? theme.primary : theme.borderNeutral,
                  },
                ]}
                onPress={() =>
                  setSelectedDifficulty(
                    active && diffOpt.key !== 'ALL' ? 'ALL' : diffOpt.key
                  )
                }
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: active ? theme.primaryDark : theme.textMuted,
                      fontSize: fs(10),
                    },
                  ]}
                >
                  {diffOpt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Filtro por Duração Máxima */}
        <View style={styles.pillsRow}>
          {(
            [
              { key: 'ALL', label: 'Todas Durações' },
              { key: 25, label: '<= 25s' },
              { key: 35, label: '<= 35s' },
              { key: 60, label: '<= 60s' },
            ] as const
          ).map((durOpt) => {
            const active = maxDurationFilter === durOpt.key;
            return (
              <TouchableOpacity
                key={String(durOpt.key)}
                activeOpacity={0.75}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surface,
                    borderColor: active ? theme.primary : theme.borderNeutral,
                  },
                ]}
                onPress={() =>
                  setMaxDurationFilter(
                    active && durOpt.key !== 'ALL' ? 'ALL' : durOpt.key
                  )
                }
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: active ? theme.primaryDark : theme.textMuted,
                      fontSize: fs(10),
                    },
                  ]}
                >
                  {durOpt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Filtro por Sensores Requeridos */}
        <View style={styles.pillsRow}>
          {(
            [
              { key: 'ALL', label: 'Todos Sensores' },
              { key: 'PIEZO_TARGETS', label: 'Piezo (A0-A4)' },
              { key: 'LED_RING', label: 'Anel LED' },
              { key: 'BUZZER', label: 'Buzzer' },
              { key: 'BALL_MACHINE_SIM', label: 'Spinshot Sim' },
            ] as const
          ).map((sensorOpt) => {
            const active = selectedSensorFilter === sensorOpt.key;
            return (
              <TouchableOpacity
                key={sensorOpt.key}
                activeOpacity={0.75}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surface,
                    borderColor: active ? theme.primary : theme.borderNeutral,
                  },
                ]}
                onPress={() =>
                  setSelectedSensorFilter(
                    active && sensorOpt.key !== 'ALL' ? 'ALL' : sensorOpt.key
                  )
                }
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: active ? theme.primaryDark : theme.textMuted,
                      fontSize: fs(10),
                    },
                  ]}
                >
                  {sensorOpt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Lista de Treinos */}
      {filteredDrills.length === 0 ? (
        <View
          style={[
            styles.emptyBox,
            { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral },
          ]}
        >
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: fs(12.5) }]}>
            Nenhum treino encontrado para o filtro selecionado.
          </Text>
          {hasActiveFilters && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.clearFilterBtn, { backgroundColor: theme.primary }]}
              onPress={clearFilters}
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: fs(12) }}>
                Mostrar Todos os Treinos
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View
          style={[
            styles.list,
            isTablet && !isDesktop && styles.listTabletGrid,
          ]}
        >
          {filteredDrills.map((drill) => {
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
                      { color: theme.text, fontSize: fs(13.5) },
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
                    { color: theme.textSecondary, fontSize: fs(11.5) },
                  ]}
                >
                  {drill.description}
                </Text>

                {drill.objective && (
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.drillObjective,
                      { color: theme.primaryDark, fontSize: fs(11) },
                    ]}
                  >
                    🎯 Objetivo: {drill.objective}
                  </Text>
                )}

                <View style={styles.metaRow}>
                  <Text
                    style={[
                      styles.drillMeta,
                      {
                        color: isSelected ? theme.primaryDark : theme.textMuted,
                        fontSize: fs(10.5),
                      },
                    ]}
                  >
                    v{drill.version} • {drill.steps.length} bolas (~{estSec}s) • Janela:{' '}
                    {effectiveWindow}ms • Sensores: {drillSensors.length}/5
                  </Text>

                  {isSelected && onStartDrill ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[styles.quickStartPill, { backgroundColor: theme.primary }]}
                      onPress={() => {
                        onSelectDrill(drill);
                        onStartDrill(drill);
                      }}
                    >
                      <PlayIcon size={11} color="#FFF" />
                      <Text style={{ color: '#FFF', fontWeight: '800', fontSize: fs(11) }}>
                        Iniciar
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

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
                {mkt?.remunerationModel || mkt?.monetizationModel || 'FREE'} • Compatível:{' '}
                {mkt?.compatibility || 'Arduino Uno R3 + Simulador'}
              </Text>
            </View>

            {/* Instruções de Preparação */}
            <Text style={[styles.prepSecLabel, { color: theme.text, fontSize: fs(11) }]}>
              📋 Instruções & Equipamentos Necessários:
            </Text>
            {(
              prep?.instructions ||
              (prep?.courtPositioning ? [prep.courtPositioning] : null) || [
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
              {(prep?.equipmentRequired || prep?.requiredEquipment || ['Raquete', '5 Alvos Piezo + LEDs']).join(' + ')}
            </Text>

            {/* Critérios de Pontuação e Parâmetros da Máquina (RF04, RF09, RF10) */}
            <Text style={[styles.prepSecLabel, { color: theme.text, fontSize: fs(11) }]}>
              🏆 Regras de Pontuação & Parâmetros do Exercício:
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: fs(11), lineHeight: 16 }}>
              {prep?.scoringRulesSummary ||
                selectedDrill.scoringRules?.completionCriteria ||
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
                Riscos & Segurança:{' '}
                {(
                  prep?.safetyWarnings ||
                  prep?.safetyInstructions || [
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
    borderRadius: 14,
    borderWidth: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  title: {
    fontWeight: '700',
    flexShrink: 1,
  },
  refreshBtn: {
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  subtitle: {
    lineHeight: 17,
    marginBottom: 10,
  },
  filterBar: {
    marginBottom: 12,
    gap: 8,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 7,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
  },
  filterPillText: {
    fontWeight: '700',
  },
  emptyBox: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    textAlign: 'center',
    fontWeight: '500',
  },
  clearFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
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
    borderRadius: 10,
  },
  drillCardTablet: {
    width: '48.5%',
  },
  drillTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  drillTitle: {
    fontWeight: '700',
    flex: 1,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    marginLeft: 8,
  },
  diffBadgeText: {
    fontWeight: '600',
  },
  drillDesc: {
    lineHeight: 16,
    marginBottom: 5,
  },
  drillObjective: {
    fontStyle: 'italic',
    lineHeight: 15,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  drillMeta: {
    fontWeight: '600',
    flexShrink: 1,
  },
  quickStartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 99,
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
    gap: 7,
    padding: 8,
    borderRadius: 8,
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
    minWidth: 150,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorBtnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
