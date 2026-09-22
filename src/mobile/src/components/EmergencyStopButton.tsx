/**
 * Smart Tennis Arena — Botão e Modal de Parada Segura (Emergency Stop)
 * Alinhado com: docs/spec/01-system-requirements.md (RF22) e docs/spec/07-security-and-compliance.md
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';

interface EmergencyStopButtonProps {
  isEngaged: boolean;
  alertMessage: string | null;
  onTriggerStop: () => void;
  onResetStop: () => void;
}

export const EmergencyStopButton: React.FC<EmergencyStopButtonProps> = ({
  isEngaged,
  alertMessage,
  onTriggerStop,
  onResetStop,
}) => {
  const [confirmStep, setConfirmStep] = useState<number>(1);

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
        activeOpacity={0.8}
        style={styles.eStopButton}
        onPress={onTriggerStop}
      >
        <Text style={styles.eStopIcon}>🛑</Text>
        <Text style={styles.eStopText}>PARADA DE EMERGÊNCIA (RF22)</Text>
      </TouchableOpacity>

      {/* Modal de Bloqueio Persistente Fail-Safe */}
      <Modal visible={isEngaged} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>SISTEMA BLOQUEADO EM ESTADO SEGURO</Text>
            <Text style={styles.modalDesc}>
              {alertMessage || 'Todos os 40 LEDs, buzinas e sinal da máquina foram imediatamente cortados.'}
            </Text>

            <View style={styles.rulesBox}>
              <Text style={styles.rulesText}>✓ Circuitos de potência desligados</Text>
              <Text style={styles.rulesText}>✓ Registradores 74HC595 forçados a 0x00</Text>
              <Text style={styles.rulesText}>✓ Log de auditoria persistido (RF23)</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.resetButton,
                confirmStep === 2 && styles.resetButtonStep2,
              ]}
              onPress={handleReset}
            >
              <Text style={styles.resetButtonText}>
                {confirmStep === 1
                  ? 'DESTRAMAR SISTEMA (ETAPA 1/2)'
                  : 'CONFIRMAR REINICIALIZAÇÃO LIMPA (ETAPA 2/2)'}
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
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
    marginVertical: 10,
    width: '100%',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  eStopIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  eStopText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  rulesBox: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
    gap: 6,
  },
  rulesText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  resetButtonStep2: {
    backgroundColor: '#16A34A',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
