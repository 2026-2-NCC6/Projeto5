/**
 * Smart Tennis Arena — Botão e Modal de Parada Segura (Emergency Stop - RF22)
 * Design Minimalista & Acessível (Branco, Verde & Vermelho Normativo de Segurança)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { ShieldAlertIcon, CheckCircleIcon } from './Icons';

interface EmergencyStopButtonProps {
  isEngaged: boolean;
  alertMessage: string | null;
  fullWidth?: boolean;
  onTriggerStop: () => void;
  onResetStop: () => void;
}

export const EmergencyStopButton: React.FC<EmergencyStopButtonProps> = ({
  isEngaged,
  alertMessage,
  fullWidth,
  onTriggerStop,
  onResetStop,
}) => {
  const { theme, fs, playSound } = useAccessibility();
  const [confirmStep, setConfirmStep] = useState<number>(1);

  const handleTrigger = () => {
    playSound('estop');
    onTriggerStop();
  };

  const handleReset = () => {
    if (confirmStep === 1) {
      setConfirmStep(2);
    } else {
      setConfirmStep(1);
      onResetStop();
    }
  };

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Acionar Parada de Emergência RF22"
        activeOpacity={0.85}
        style={[
          styles.eStopButton,
          fullWidth && { width: '100%' },
          {
            backgroundColor: theme.dangerSoft,
            borderColor: theme.dangerBorder,
          },
        ]}
        onPress={handleTrigger}
      >
        <ShieldAlertIcon size={17} color={theme.danger} />
        <Text style={[styles.eStopText, { color: theme.danger, fontSize: fs(13) }]}>
          Parada Segura (!EMG)
        </Text>
      </TouchableOpacity>

      {/* Modal de Bloqueio Persistente Fail-Safe */}
      <Modal visible={isEngaged} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.surface,
                borderColor: theme.danger,
              },
            ]}
          >
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: theme.dangerSoft, borderColor: theme.dangerBorder },
              ]}
            >
              <ShieldAlertIcon size={30} color={theme.danger} />
            </View>

            <Text style={[styles.modalTitle, { color: theme.danger, fontSize: fs(18) }]}>
              Parada de Emergência Ativada
            </Text>
            <Text
              style={[
                styles.modalDesc,
                { color: theme.textSecondary, fontSize: fs(13) },
              ]}
            >
              {alertMessage ||
                'Todos os anéis de LED, atuadores sonoros e sinais da sessão foram imediatamente cortados em estado seguro.'}
            </Text>

            <View
              style={[
                styles.rulesBox,
                {
                  backgroundColor: theme.surfaceMint,
                  borderColor: theme.primaryBorder,
                },
              ]}
            >
              <View style={styles.ruleItem}>
                <CheckCircleIcon size={15} color={theme.primary} />
                <Text style={[styles.rulesText, { color: theme.primaryDark, fontSize: fs(12) }]}>
                  Circuitos de potência e temporizadores desligados
                </Text>
              </View>
              <View style={styles.ruleItem}>
                <CheckCircleIcon size={15} color={theme.primary} />
                <Text style={[styles.rulesText, { color: theme.primaryDark, fontSize: fs(12) }]}>
                  Registradores 74HC595 forçados a 0x00 (Fail-Safe)
                </Text>
              </View>
              <View style={styles.ruleItem}>
                <CheckCircleIcon size={15} color={theme.primary} />
                <Text style={[styles.rulesText, { color: theme.primaryDark, fontSize: fs(12) }]}>
                  Evento prioritário !EMG registrado no protocolo serial
                </Text>
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              style={[
                styles.resetButton,
                {
                  backgroundColor:
                    confirmStep === 1 ? theme.text : theme.primary,
                },
              ]}
              onPress={handleReset}
            >
              <Text style={[styles.resetButtonText, { fontSize: fs(13) }]}>
                {confirmStep === 1
                  ? 'Destravar Sistema (Etapa 1 de 2)'
                  : 'Confirmar Reinicialização Segura (Etapa 2 de 2)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  eStopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  eStopText: {
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 22,
    padding: 28,
    width: '100%',
    maxWidth: 440,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDesc: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  rulesBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
    marginBottom: 20,
    gap: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rulesText: {
    fontWeight: '600',
    flex: 1,
  },
  resetButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
