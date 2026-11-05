/**
 * Smart Tennis Arena — Botão e Modal de Parada Segura & Seleção de Motivo (RF22)
 * Permite selecionar o motivo do acionamento e reportar diretamente à API
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { ShieldAlertIcon, CheckCircleIcon } from './Icons';
import { api } from '../services/api';

interface EmergencyStopButtonProps {
  isEngaged: boolean;
  alertMessage: string | null;
  fullWidth?: boolean;
  onTriggerStop: (reason?: string) => void;
  onResetStop: () => void;
}

const COMMON_REASONS = [
  'Pessoa ou obstáculo na área da quadra',
  'Bolinha presa ou falha de alimentação',
  'Fadiga ou desconforto físico do atleta',
  'Calibração de sensor inconsistente',
];

export const EmergencyStopButton: React.FC<EmergencyStopButtonProps> = ({
  isEngaged,
  alertMessage,
  fullWidth,
  onTriggerStop,
  onResetStop,
}) => {
  const { theme, fs, playSound } = useAccessibility();
  const [confirmStep, setConfirmStep] = useState<number>(1);
  const [showReasonModal, setShowReasonModal] = useState<boolean>(false);
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');

  const handleTrigger = () => {
    playSound('estop');
    setShowReasonModal(true);
    onTriggerStop('Acionamento do botão de emergência');
  };

  const handleSaveReason = async () => {
    const finalReason = customReason.trim() ? customReason.trim() : selectedReason;
    try {
      await api.reportSafetyIncident({
        incidentType: 'EMERGENCY_STOP',
        source: 'UI_ESTOP_BUTTON',
        reason: finalReason,
      });
    } catch {}
    setShowReasonModal(false);
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
        onPress={isEngaged ? handleReset : handleTrigger}
      >
        <ShieldAlertIcon size={18} color={theme.danger} />
        <Text
          style={[
            styles.eStopButtonText,
            { color: theme.danger, fontSize: fs(13.5) },
          ]}
        >
          {isEngaged
            ? confirmStep === 1
              ? 'Reiniciar Sistema (2 Toques)'
              : 'Confirmar Destravamento'
            : '!EMG Parada Segura (RF22)'}
        </Text>
      </TouchableOpacity>

      {/* Modal de Registro do Motivo da Parada Segura (RF22) */}
      <Modal visible={showReasonModal} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View
            style={[
              styles.reasonModalContainer,
              { backgroundColor: theme.surface, borderColor: theme.danger },
            ]}
          >
            <View style={styles.modalHeader}>
              <ShieldAlertIcon size={22} color={theme.danger} />
              <Text style={[styles.modalTitle, { color: theme.text, fontSize: fs(16) }]}>
                Registrar Motivo da Parada (!EMG)
              </Text>
            </View>
            <Text style={[styles.modalDesc, { color: theme.textSecondary, fontSize: fs(12.5) }]}>
              Selecione o motivo da interrupção para fins de auditoria de segurança da Arena:
            </Text>

            {COMMON_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                activeOpacity={0.8}
                style={[
                  styles.reasonOption,
                  {
                    backgroundColor: selectedReason === reason ? theme.dangerSoft : theme.surfaceMuted,
                    borderColor: selectedReason === reason ? theme.dangerBorder : theme.borderNeutral,
                  },
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <Text
                  style={[
                    styles.reasonOptionText,
                    { color: selectedReason === reason ? theme.danger : theme.text, fontSize: fs(12) },
                  ]}
                >
                  • {reason}
                </Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={[
                styles.customReasonInput,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.borderNeutral,
                  color: theme.text,
                  fontSize: fs(12),
                },
              ]}
              placeholder="Outro motivo específico (opcional)..."
              placeholderTextColor={theme.textMuted}
              value={customReason}
              onChangeText={setCustomReason}
            />

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.saveReasonBtn, { backgroundColor: theme.danger }]}
              onPress={handleSaveReason}
            >
              <Text style={[styles.saveReasonBtnText, { fontSize: fs(13) }]}>
                Salvar Motivo no Registro
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
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  eStopButtonText: {
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  reasonModalContainer: {
    width: '100%',
    maxWidth: 480,
    padding: 18,
    borderRadius: 14,
    borderWidth: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  modalTitle: {
    fontWeight: '700',
  },
  modalDesc: {
    marginBottom: 12,
    lineHeight: 17,
  },
  reasonOption: {
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  reasonOptionText: {
    fontWeight: '500',
  },
  customReasonInput: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 12,
  },
  saveReasonBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveReasonBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
