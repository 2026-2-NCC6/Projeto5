/**
<<<<<<< HEAD
 * Smart Tennis Arena — Catálogo de Treinos com Filtros (RF03),
 * Detalhes e Preparação Pré-Sessão (RF04) e Metadados de Marketplace (RF20)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
=======
 * Smart Tennis Arena — Card do Catálogo de Treinos Dinâmico com Filtros
 * Alinhado com: RF03 (Consulta e Filtros por Público, Objetivo, Duração, Dificuldade e Sensores) e RF18
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
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
import {
  DrillDefinition,
  DrillDifficulty,
  DrillCategory,
  DRILL_CATEGORY_LABELS,
  DEFAULT_DRILLS,
  TARGET_TACTICAL_NAMES,
} from '../../../packages/shared/src/contracts/drills';
import { api } from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
<<<<<<< HEAD
import { SlidersIcon, ShieldAlertIcon, CheckCircleIcon } from './Icons';
=======
import { SlidersIcon, RefreshIcon, PlayIcon, CloseIcon } from './Icons';
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

interface DrillCatalogCardProps {
  selectedDrill: DrillDefinition;
  isKidsMode: boolean;
  onSelectDrill: (drill: DrillDefinition) => void;
<<<<<<< HEAD
  drillsList?: DrillDefinition[];
  catalogSource?: 'API' | 'CACHE_OFFLINE';
  onOpenEditor?: (drillToEdit?: DrillDefinition) => void;
=======
  onStartDrill?: (drill: DrillDefinition) => void;
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
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
<<<<<<< HEAD
  drillsList = DEFAULT_DRILLS,
  catalogSource = 'API',
  onOpenEditor,
=======
  onStartDrill,
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
}) => {
  const { theme, fs } = useAccessibility();
  const { isMobile, isTablet, isDesktop, cardPadding } = useResponsive();

<<<<<<< HEAD
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
=======
  const [rawDrills, setRawDrills] = useState<DrillDefinition[]>(DEFAULT_DRILLS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);

  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const items = await api.listDrills({});
      if (Array.isArray(items) && items.length > 0) {
        setRawDrills(items);
      } else {
        setRawDrills(DEFAULT_DRILLS);
      }
    } catch {
      // Fallback gracioso offline mantendo filtros funcionais localmente
      setRawDrills(DEFAULT_DRILLS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // Filtragem local instantânea e determinística (funciona online e offline)
  const filteredDrills = useMemo(() => {
    return rawDrills.filter((drill) => {
      if (selectedCategory !== 'TODAS' && drill.category !== selectedCategory) {
        return false;
      }
      if (selectedDifficulty !== null && drill.difficulty !== selectedDifficulty) {
        return false;
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
  }, [rawDrills, selectedCategory, selectedDifficulty, searchTerm]);

  const hasActiveFilters =
    selectedCategory !== 'TODAS' || selectedDifficulty !== null || searchTerm.trim().length > 0;

  const clearFilters = () => {
    setSelectedCategory('TODAS');
    setSelectedDifficulty(null);
    setSearchTerm('');
  };
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

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
<<<<<<< HEAD
      {/* Topo do Catálogo + Origem API/Offline (RF18, RF21) */}
      <View style={styles.topBar}>
        <View style={styles.headerRow}>
=======
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
          <SlidersIcon size={18} color={theme.primary} />
          <Text
            style={[
              styles.title,
<<<<<<< HEAD
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
=======
              { color: theme.text, fontSize: isMobile ? fs(15) : fs(17) },
            ]}
          >
            Protocolos de Treino (RF03 / RF18)
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
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
      </View>

      <Text
        style={[
          styles.subtitle,
          { color: theme.textSecondary, fontSize: fs(12) },
        ]}
      >
<<<<<<< HEAD
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
=======
        Toque em um treino para selecioná-lo ou filtrá-lo por objetivo e nível técnico.
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
            placeholder="Buscar por objetivo ou nome..."
            placeholderTextColor={theme.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => setSearchTerm('')}
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
            >
              <CloseIcon size={14} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtro por Categoria */}
        <View style={styles.pillsRow}>
          {[
            { key: 'TODAS', label: 'Todas' },
            { key: 'PRECISION', label: 'Precisão' },
            { key: 'REACTION', label: 'Reação' },
            { key: 'ENDURANCE', label: 'Resistência' },
            { key: 'KIDS_FUN', label: '⭐ Kids' },
          ].map((cat) => {
            const active = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                activeOpacity={0.75}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? theme.primary : theme.surfaceMuted,
                    borderColor: active ? theme.primaryDark : theme.borderNeutral,
                  },
                ]}
                onPress={() => {
                  const nextCat = active && cat.key !== 'TODAS' ? 'TODAS' : cat.key;
                  setSelectedCategory(nextCat);
                  // Seleciona automaticamente o primeiro treino correspondente ao filtro
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
<<<<<<< HEAD
                    styles.drillTitle,
                    { color: theme.text, fontSize: fs(13) },
                  ]}
                >
                  {drill.title}
                </Text>
                <View
                  style={[
                    styles.diffBadge,
=======
                    styles.filterPillText,
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
                    {
                      color: active ? '#FFF' : theme.textSecondary,
                      fontSize: fs(11),
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

<<<<<<< HEAD
              <Text
                style={[
                  styles.drillDesc,
                  { color: theme.textSecondary, fontSize: fs(11) },
                ]}
              >
                {drill.description}
=======
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
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
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
            const basePts = drill.scoringRules?.basePoints ?? 100;

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
<<<<<<< HEAD
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
=======
                    backgroundColor: isSelected ? theme.surfaceMint : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.borderNeutral,
                    borderWidth: isSelected ? 2 : 1,
                    padding: isMobile ? 12 : 15,
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
                        fontSize: fs(11),
                      },
                    ]}
                  >
                    {drill.steps.length} disparos • Janela: {effectiveWindow}ms • Base: {basePts} pts
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
                  ) : drill.version ? (
                    <Text style={[styles.versionTag, { color: theme.textMuted, fontSize: fs(10) }]}>
                      v{drill.version}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
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
    justifyContent: 'space-between',
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
<<<<<<< HEAD
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 17,
  },
  filterGroup: {
    gap: 6,
    marginBottom: 12,
  },
  filterRow: {
=======
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
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterPill: {
<<<<<<< HEAD
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
=======
    paddingHorizontal: 11,
    paddingVertical: 6,
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
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
  },
  list: {
    gap: 9,
  },
  listTabletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
<<<<<<< HEAD
    gap: 10,
=======
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
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
<<<<<<< HEAD
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
=======
    marginBottom: 5,
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
  },
  drillTitle: {
    fontWeight: '700',
    flex: 1,
<<<<<<< HEAD
    minWidth: 140,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
=======
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
    borderWidth: 1,
    marginLeft: 8,
  },
  diffBadgeText: {
    fontWeight: '600',
  },
  drillDesc: {
    lineHeight: 16,
<<<<<<< HEAD
    marginBottom: 6,
=======
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
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
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
  versionTag: {
    fontWeight: '600',
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
