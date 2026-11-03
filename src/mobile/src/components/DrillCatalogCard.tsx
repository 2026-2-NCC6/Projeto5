import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  DrillDefinition,
  DrillDifficulty,
  DEFAULT_DRILLS,
} from '../../../packages/shared/src/contracts/drills';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import { SlidersIcon } from './Icons';

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
        <SlidersIcon size={18} color={theme.primary} />
        <Text
          style={[
            styles.title,
            { color: theme.text, fontSize: isMobile ? fs(16) : fs(17) },
          ]}
        >
          Protocolos de Treino (Drills)
        </Text>
      </View>
      <Text
        style={[
          styles.subtitle,
          { color: theme.textSecondary, fontSize: fs(12) },
        ]}
      >
        Selecione a cadência e a janela de tempo dos sensores.
      </Text>

      <View
        style={[
          styles.list,
          isTablet && !isDesktop && styles.listTabletGrid,
        ]}
      >
        {DEFAULT_DRILLS.map((drill) => {
          const isSelected = selectedDrill.id === drill.id;
          const maxWindow = Math.max(...drill.steps.map((s) => s.durationMs));
          const effectiveWindow = isKidsMode
            ? Math.round(maxWindow * 1.5)
            : maxWindow;

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

              <Text
                style={[
                  styles.drillMeta,
                  {
                    color: isSelected ? theme.primaryDark : theme.textMuted,
                    fontSize: fs(11),
                  },
                ]}
              >
                {drill.steps.length} rodadas • Janela: {effectiveWindow}ms • 150 pts
              </Text>
            </TouchableOpacity>
          );
        })}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  list: {
    gap: 10,
  },
  listTabletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
    marginBottom: 6,
  },
  drillTitle: {
    fontWeight: '800',
    flex: 1,
    minWidth: 150,
  },
  diffBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  diffBadgeText: {
    fontWeight: '700',
  },
  drillDesc: {
    lineHeight: 17,
    marginBottom: 8,
  },
  drillMeta: {
    fontWeight: '700',
  },
});
