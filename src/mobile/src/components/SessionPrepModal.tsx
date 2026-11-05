/**
 * Smart Tennis Arena — Modal de Preparação Pré-Sessão & Checklist de Segurança
 * Alinhado com: RF04 (Detalhes e Preparação Antes da Sessão) e Seção 5 (Segurança Física)
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { DrillDefinition } from '../../../packages/shared/src/contracts/drills';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import { PlayIcon, ShieldAlertIcon, CheckCircleIcon } from './Icons';

interface SessionPrepModalProps {
  visible: boolean;
  drill: DrillDefinition;
  isKidsMode: boolean;
  onConfirmStart: () => void;
  onCancel: () => void;
}

export const SessionPrepModal: React.FC<SessionPrepModalProps> = ({
  visible,
  drill,
  isKidsMode,
  onConfirmStart,
  onCancel,
}) => {
  const { theme, fs } = useAccessibility();
  const { isMobile, cardPadding } = useResponsive();

  const [confirmedSafeArea, setConfirmedSafeArea] = useState<boolean>(false);
  const [confirmedEquipment, setConfirmedEquipment] = useState<boolean>(false);

  const prep = drill.preparation;
  const rules = drill.scoringRules;

  const handleStart = () => {
    if (!confirmedSafeArea || !confirmedEquipment) return;
    onConfirmStart();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              padding: cardPadding,
              maxWidth: isMobile ? '94%' : 580,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <ShieldAlertIcon size={22} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text, fontSize: fs(18) }]}>
              Preparação Pré-Sessão (RF04)
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: fs(13) }]}>
            Confira as orientações de quadra e segurança antes do início do disparo.
          </Text>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Bloco 1: Treino e Posicionamento */}
            <View style={[styles.cardSection, { backgroundColor: theme.surfaceMint, borderColor: theme.border }]}>
              <Text style={[styles.sectionHeading, { color: theme.primaryDark, fontSize: fs(14) }]}>
                {drill.title} ({isKidsMode ? 'Modo Kids' : 'Modo Adulto'})
              </Text>
              <Text style={[styles.bodyText, { color: theme.text, fontSize: fs(12.5) }]}>
                {prep?.courtPositioning || 'Posicione-se no centro da linha de base em postura dinâmica.'}
              </Text>
            </View>

            {/* Bloco 2: Regras e Metas */}
            <View style={[styles.cardSection, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral }]}>
              <Text style={[styles.sectionHeading, { color: theme.text, fontSize: fs(13.5) }]}>
                Metas do Exercício & Pontuação
              </Text>
              <Text style={[styles.bulletItem, { color: theme.textSecondary, fontSize: fs(12) }]}>
                • Pontuação Base: {rules?.basePoints ?? 100} pts por acerto com bônus de reação
              </Text>
              <Text style={[styles.bulletItem, { color: theme.textSecondary, fontSize: fs(12) }]}>
                • Meta da Sessão: {rules?.targetScoreGoal ?? 1000} pts • Precisão mínima: {rules?.minAccuracyPercent ?? 60}%
              </Text>
              <Text style={[styles.bulletItem, { color: theme.textSecondary, fontSize: fs(12) }]}>
                • Critério: {rules?.completionCriteria || 'Concluir todos os disparos com foco na precisão.'}
              </Text>
            </View>

            {/* Bloco 3: Riscos Físicos e Requisitos */}
            <View style={[styles.cardSection, { backgroundColor: theme.warningSoft, borderColor: theme.warningBorder }]}>
              <Text style={[styles.sectionHeading, { color: theme.warning, fontSize: fs(13.5) }]}>
                Avisos de Segurança e Riscos Físicos
              </Text>
              {(prep?.safetyInstructions || [
                'Área de disparo desobstruída sem pessoas ou obstáculos na linha da bola.',
                'Botão de emergência (!EMG) testado e acessível na lateral da quadra.',
              ]).map((s, idx) => (
                <Text key={idx} style={[styles.bulletItem, { color: theme.text, fontSize: fs(12) }]}>
                  • {s}
                </Text>
              ))}
            </View>

            {/* Checklists obrigatórios */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.checkboxRow}
              onPress={() => setConfirmedEquipment((prev) => !prev)}
            >
              <View style={[styles.checkbox, confirmedEquipment && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                {confirmedEquipment && <CheckCircleIcon size={14} color="#FFF" />}
              </View>
              <Text style={[styles.checkboxLabel, { color: theme.text, fontSize: fs(12.5) }]}>
                Equipamentos verificados (raquete, calçado adequado e painel calibrado)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.checkboxRow}
              onPress={() => setConfirmedSafeArea((prev) => !prev)}
            >
              <View style={[styles.checkbox, confirmedSafeArea && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                {confirmedSafeArea && <CheckCircleIcon size={14} color="#FFF" />}
              </View>
              <Text style={[styles.checkboxLabel, { color: theme.text, fontSize: fs(12.5) }]}>
                Área de segurança desobstruída e ciente da Parada Segura (!EMG)
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Botões de Ação */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.cancelBtn, { borderColor: theme.borderNeutral }]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary, fontSize: fs(13) }]}>
                Voltar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.confirmBtn,
                {
                  backgroundColor: confirmedSafeArea && confirmedEquipment ? theme.primary : theme.textMuted,
                  opacity: confirmedSafeArea && confirmedEquipment ? 1 : 0.6,
                },
              ]}
              disabled={!confirmedSafeArea || !confirmedEquipment}
              onPress={handleStart}
            >
              <PlayIcon size={14} color="#FFF" />
              <Text style={[styles.confirmBtnText, { fontSize: fs(13.5) }]}>
                Autorizar & Iniciar Treino
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    marginBottom: 14,
  },
  scrollArea: {
    maxHeight: 380,
    marginBottom: 16,
  },
  cardSection: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  sectionHeading: {
    fontWeight: '700',
    marginBottom: 4,
  },
  bodyText: {
    lineHeight: 18,
  },
  bulletItem: {
    lineHeight: 18,
    marginBottom: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.8,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    flex: 1,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 8,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontWeight: '600',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
});

