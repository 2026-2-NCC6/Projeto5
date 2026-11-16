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
import { ShieldAlertIcon, CloseIcon } from './Icons';
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
            { color: theme.danger, fontSize: fs(13) },
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
      <Modal
        visible={showReasonModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReasonModal(false)}
      >
        <View style={styles.backdrop}>
          {/* Clique fora do modal fecha o popup */}
          <TouchableOpacity
            activeOpacity={1}
            accessibilityRole="button"
            accessibilityLabel="Fechar modal clicando fora"
            style={StyleSheet.absoluteFill}
            onPress={() => setShowReasonModal(false)}
          />

          <View
            style={[
              styles.reasonModalContainer,
              { backgroundColor: theme.surface, borderColor: theme.danger },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <ShieldAlertIcon size={20} color={theme.danger} />
                <Text style={[styles.modalTitle, { color: theme.text, fontSize: fs(15) }]}>
                  Registrar Motivo da Parada (!EMG)
                </Text>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Fechar janela de motivo"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[
                  styles.closeIconBtn,
                  { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral },
                ]}
                onPress={() => setShowReasonModal(false)}
              >
                <CloseIcon size={15} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: theme.textSecondary, fontSize: fs(12) }]}>
              Selecione o motivo da interrupção para fins de auditoria de segurança da Arena:
            </Text>

            {COMMON_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                activeOpacity={0.8}
                style={[
                  styles.reasonOption,
                  {
                    backgroundColor:
                      selectedReason === reason ? theme.dangerSoft : theme.surfaceMuted,
                    borderColor:
                      selectedReason === reason ? theme.dangerBorder : theme.borderNeutral,
                  },
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <Text
                  style={[
                    styles.reasonOptionText,
                    {
                      color: selectedReason === reason ? theme.danger : theme.text,
                      fontSize: fs(12),
                    },
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

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.cancelBtn, { borderColor: theme.borderNeutral }]}
                onPress={() => setShowReasonModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary, fontSize: fs(12.5) }]}>
                  Fechar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.saveReasonBtn, { backgroundColor: theme.danger }]}
                onPress={handleSaveReason}
              >
                <Text style={[styles.saveReasonBtnText, { fontSize: fs(12.5) }]}>
                  Salvar Motivo no Registro
                </Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  eStopButtonText: {
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  reasonModalContainer: {
    width: '100%',
    maxWidth: 480,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  modalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalTitle: {
    fontWeight: '700',
    flexShrink: 1,
  },
  closeIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDesc: {
    marginBottom: 10,
    lineHeight: 17,
  },
  reasonOption: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  reasonOptionText: {
    fontWeight: '600',
  },
  customReasonInput: {
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 12,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontWeight: '700',
  },
  saveReasonBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveReasonBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
