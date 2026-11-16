/**
 * Smart Tennis Arena — Modal de Preparação Pré-Sessão & Checklist de Segurança
 * Alinhado com: RF04 (Detalhes e Preparação Antes da Sessão) e Seção 5 (Segurança Física)
 */

import React, { useState, useEffect } from 'react';
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
import { PlayIcon, ShieldAlertIcon, CheckCircleIcon, CloseIcon } from './Icons';

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

  const [confirmedSafeArea, setConfirmedSafeArea] = useState<boolean>(true);
  const [confirmedEquipment, setConfirmedEquipment] = useState<boolean>(true);

  useEffect(() => {
    if (visible) {
      setConfirmedSafeArea(true);
      setConfirmedEquipment(true);
    }
  }, [visible, drill.id]);

  const prep = drill.preparation;
  const rules = drill.scoringRules;

  const handleStart = () => {
    if (!confirmedSafeArea || !confirmedEquipment) return;
    onConfirmStart();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        {/* Clique fora do modal fecha o popup */}
        <TouchableOpacity
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel="Fechar janela de preparação"
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
        />

        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              padding: isMobile ? 16 : cardPadding,
              maxWidth: isMobile ? '96%' : 580,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <ShieldAlertIcon size={20} color={theme.primary} />
              <Text
                style={[
                  styles.title,
                  { color: theme.text, fontSize: isMobile ? fs(16) : fs(18) },
                ]}
              >
                Preparação Pré-Sessão (RF04)
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Fechar modal"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[
                styles.closeIconBtn,
                { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral },
              ]}
              onPress={onCancel}
            >
              <CloseIcon size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: fs(12) }]}>
            Confira as orientações de quadra e segurança antes do início do disparo.
          </Text>

          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {/* Bloco 1: Treino e Posicionamento */}
            <View
              style={[
                styles.cardSection,
                { backgroundColor: theme.surfaceMint, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.sectionHeading, { color: theme.primaryDark, fontSize: fs(13.5) }]}>
                {drill.title} ({isKidsMode ? 'Modo Kids' : 'Modo Adulto'})
              </Text>
              <Text style={[styles.bodyText, { color: theme.text, fontSize: fs(12) }]}>
                {prep?.courtPositioning ||
                  'Posicione-se no centro da linha de base em postura dinâmica.'}
              </Text>
            </View>

            {/* Bloco 2: Regras e Metas */}
            <View
              style={[
                styles.cardSection,
                { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral },
              ]}
            >
              <Text style={[styles.sectionHeading, { color: theme.text, fontSize: fs(13) }]}>
                Metas do Exercício & Pontuação
              </Text>
              <Text style={[styles.bulletItem, { color: theme.textSecondary, fontSize: fs(11.5) }]}>
                • Pontuação Base: {rules?.basePoints ?? 100} pts por acerto com bônus de reação
              </Text>
              <Text style={[styles.bulletItem, { color: theme.textSecondary, fontSize: fs(11.5) }]}>
                • Meta da Sessão: {rules?.targetScoreGoal ?? 1000} pts • Precisão mín.:{' '}
                {rules?.minAccuracyPercent ?? 60}%
              </Text>
              <Text style={[styles.bulletItem, { color: theme.textSecondary, fontSize: fs(11.5) }]}>
                • Critério:{' '}
                {rules?.completionCriteria ||
                  'Concluir todos os disparos com foco na precisão.'}
              </Text>
            </View>

            {/* Bloco 3: Riscos Físicos e Requisitos */}
            <View
              style={[
                styles.cardSection,
                { backgroundColor: theme.warningSoft, borderColor: theme.warningBorder },
              ]}
            >
              <Text style={[styles.sectionHeading, { color: theme.warning, fontSize: fs(13) }]}>
                Avisos de Segurança e Riscos Físicos
              </Text>
              {(
                prep?.safetyInstructions || [
                  'Área de disparo desobstruída sem pessoas ou obstáculos na linha da bola.',
                  'Botão de emergência (!EMG) testado e acessível na lateral da quadra.',
                ]
              ).map((s, idx) => (
                <Text key={idx} style={[styles.bulletItem, { color: theme.text, fontSize: fs(11.5) }]}>
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
              <View
                style={[
                  styles.checkbox,
                  confirmedEquipment && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
              >
                {confirmedEquipment && <CheckCircleIcon size={14} color="#FFF" />}
              </View>
              <Text style={[styles.checkboxLabel, { color: theme.text, fontSize: fs(12) }]}>
                Equipamentos verificados (raquete, calçado adequado e painel calibrado)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.checkboxRow}
              onPress={() => setConfirmedSafeArea((prev) => !prev)}
            >
              <View
                style={[
                  styles.checkbox,
                  confirmedSafeArea && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
              >
                {confirmedSafeArea && <CheckCircleIcon size={14} color="#FFF" />}
              </View>
              <Text style={[styles.checkboxLabel, { color: theme.text, fontSize: fs(12) }]}>
                Área de segurança desobstruída e ciente da Parada Segura (!EMG)
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Botões de Ação */}
          <View style={[styles.footerRow, isMobile && styles.footerRowMobile]}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.cancelBtn,
                isMobile && { flex: 1, alignItems: 'center' },
                { borderColor: theme.borderNeutral },
              ]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary, fontSize: fs(13) }]}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.confirmBtn,
                isMobile && { flex: 2, justifyContent: 'center' },
                {
                  backgroundColor:
                    confirmedSafeArea && confirmedEquipment ? theme.primary : theme.textMuted,
                  opacity: confirmedSafeArea && confirmedEquipment ? 1 : 0.6,
                },
              ]}
              disabled={!confirmedSafeArea || !confirmedEquipment}
              onPress={handleStart}
            >
              <PlayIcon size={14} color="#FFF" />
              <Text style={[styles.confirmBtnText, { fontSize: fs(13) }]}>
                Iniciar Treino Agora
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
    padding: 12,
  },
  container: {
    width: '100%',
    maxHeight: '88%',
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
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontWeight: '700',
    flexShrink: 1,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    marginBottom: 12,
    lineHeight: 17,
  },
  scrollArea: {
    maxHeight: 340,
    marginBottom: 12,
  },
  cardSection: {
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  sectionHeading: {
    fontWeight: '700',
    marginBottom: 4,
  },
  bodyText: {
    lineHeight: 17,
  },
  bulletItem: {
    lineHeight: 17,
    marginBottom: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    flex: 1,
    fontWeight: '600',
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 8,
  },
  footerRowMobile: {
    justifyContent: 'space-between',
  },
  cancelBtn: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontWeight: '700',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: '800',
  },
});
