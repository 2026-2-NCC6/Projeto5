/**
 * Smart Tennis Arena — Card do Catálogo de Treinos Dinâmico com Filtros
 * Alinhado com: RF03 (Consulta e Filtros por Público, Objetivo, Duração, Dificuldade e Sensores) e RF18
 */

import React, { useState, useEffect } from 'react';
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
  DEFAULT_DRILLS,
} from '../../../packages/shared/src/contracts/drills';
import { api } from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import { SlidersIcon, RefreshIcon, TargetIcon } from './Icons';

interface DrillCatalogCardProps {
  selectedDrill: DrillDefinition;
  isKidsMode: boolean;
  onSelectDrill: (drill: DrillDefinition) => void;
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
}) => {
  const { theme, fs } = useAccessibility();
  const { isMobile, isTablet, isDesktop, cardPadding } = useResponsive();

  const [drills, setDrills] = useState<DrillDefinition[]>(DEFAULT_DRILLS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);

  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const items = await api.listDrills({
        isKidsAdapted: isKidsMode ? true : undefined,
        category: selectedCategory !== 'TODAS' ? selectedCategory : undefined,
        difficulty: selectedDifficulty !== null ? selectedDifficulty : undefined,
        search: searchTerm.trim() ? searchTerm.trim() : undefined,
      });
      if (Array.isArray(items) && items.length > 0) {
        setDrills(items);
      } else {
        setDrills(DEFAULT_DRILLS);
      }
    } catch {
      // Fallback gracioso offline
      setDrills(DEFAULT_DRILLS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [isKidsMode, selectedCategory, selectedDifficulty]);

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
              { color: theme.text, fontSize: isMobile ? fs(16) : fs(17) },
            ]}
          >
            Protocolos de Treino (RF03 / RF18)
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
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
        Catálogo oficial homologado via API. Filtre por objetivo, cadência e nível técnico.
      </Text>

      {/* Barra de Filtros RF03 */}
      <View style={styles.filterBar}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.surfaceMuted,
              borderColor: theme.borderNeutral,
              color: theme.text,
              fontSize: fs(12),
            },
          ]}
          placeholder="Buscar por objetivo ou nome..."
          placeholderTextColor={theme.textMuted}
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={fetchCatalog}
        />

        <View style={styles.pillsRow}>
          {['TODAS', 'PRECISION', 'REACTION', 'ENDURANCE', 'KIDS_FUN'].map((cat) => (
            <TouchableOpacity
              key={cat}
              activeOpacity={0.75}
              style={[
                styles.filterPill,
                {
                  backgroundColor: selectedCategory === cat ? theme.primary : theme.surfaceMuted,
                  borderColor: selectedCategory === cat ? theme.primaryDark : theme.borderNeutral,
                },
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color: selectedCategory === cat ? '#FFF' : theme.textSecondary,
                    fontSize: fs(10.5),
                  },
                ]}
              >
                {cat === 'TODAS'
                  ? 'Todas'
                  : cat === 'PRECISION'
                  ? 'Precisão'
                  : cat === 'REACTION'
                  ? 'Reação'
                  : cat === 'ENDURANCE'
                  ? 'Resistência'
                  : 'Kids'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Lista de Treinos */}
      <View
        style={[
          styles.list,
          isTablet && !isDesktop && styles.listTabletGrid,
        ]}
      >
        {drills.map((drill) => {
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
                  padding: isMobile ? 13 : 15,
                },
              ]}
            >
              <View style={styles.drillTopRow}>
                <Text
                  style={[
                    styles.drillTitle,
                    { color: theme.text, fontSize: fs(14) },
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
                  { color: theme.textSecondary, fontSize: fs(12) },
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
                {drill.version && (
                  <Text style={[styles.versionTag, { color: theme.textMuted, fontSize: fs(10) }]}>
                    v{drill.version}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
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
    marginBottom: 4,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontWeight: '700',
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  subtitle: {
    lineHeight: 18,
    marginBottom: 10,
  },
  filterBar: {
    marginBottom: 12,
    gap: 6,
  },
  searchInput: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  filterPillText: {
    fontWeight: '600',
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
    marginBottom: 6,
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
    lineHeight: 17,
    marginBottom: 6,
  },
  drillObjective: {
    fontStyle: 'italic',
    lineHeight: 15,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drillMeta: {
    fontWeight: '500',
  },
  versionTag: {
    fontFamily: 'monospace',
  },
});
