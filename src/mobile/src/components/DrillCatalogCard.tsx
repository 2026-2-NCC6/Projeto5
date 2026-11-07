/**
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
import {
  DrillDefinition,
  DrillDifficulty,
  DEFAULT_DRILLS,
} from '../../../packages/shared/src/contracts/drills';
import { api } from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import { SlidersIcon, RefreshIcon, PlayIcon, CloseIcon } from './Icons';

interface DrillCatalogCardProps {
  selectedDrill: DrillDefinition;
  isKidsMode: boolean;
  onSelectDrill: (drill: DrillDefinition) => void;
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
  onStartDrill,
}) => {
  const { theme, fs } = useAccessibility();
  const { isMobile, isTablet, isDesktop, cardPadding } = useResponsive();

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
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <SlidersIcon size={18} color={theme.primary} />
          <Text
            style={[
              styles.title,
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
      </View>

      <Text
        style={[
          styles.subtitle,
          { color: theme.textSecondary, fontSize: fs(12) },
        ]}
      >
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
                    styles.filterPillText,
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
    gap: 8,
    marginBottom: 4,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
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
  },
  list: {
    gap: 10,
  },
  listTabletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  versionTag: {
    fontWeight: '600',
  },
});
