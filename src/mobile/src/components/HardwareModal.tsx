import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { hardwareManager, DriverMode } from '../hardware/hardwareManager';
import { WebSerialDriver } from '../hardware/webSerialDriver';
import { TargetId } from '../../../packages/shared/src/protocol/serial';

interface HardwareModalProps {
  visible: boolean;
  onClose: () => void;
}

interface LogEntry {
  id: string;
  timestamp: string;
  direction: 'TX' | 'RX' | 'INFO' | 'ERR';
  message: string;
}

export function HardwareModal({ visible, onClose }: HardwareModalProps) {
  const [activeTab, setActiveTab] = useState<DriverMode>(hardwareManager.mode);
  const [isConnected, setIsConnected] = useState<boolean>(hardwareManager.isConnected);
  const [deviceName, setDeviceName] = useState<string | null>(hardwareManager.deviceName);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [customCommand, setCustomCommand] = useState<string>('');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const pingStartRef = useRef<number>(0);
  const isWebSerialSupported = WebSerialDriver.isSupported();

  useEffect(() => {
    // Sincroniza estado inicial
    setActiveTab(hardwareManager.mode);
    setIsConnected(hardwareManager.isConnected);
    setDeviceName(hardwareManager.deviceName);

    // Ouve mudanças de conexão
    const unsubStatus = hardwareManager.addStatusListener((conn, name) => {
      setIsConnected(conn);
      setDeviceName(name ?? null);
      setIsConnecting(false);
    });

    // Ouve logs seriais em tempo real
    const unsubLogs = hardwareManager.addLogListener((dir, msg) => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
      
      setLogs((prev) => [
        ...prev.slice(-99), // Mantém até 100 mensagens
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: timeStr,
          direction: dir,
          message: msg,
        },
      ]);

      // Se recebeu PONG, calcula latência de ida e volta
      if (dir === 'RX' && msg.includes('"PONG"')) {
        if (pingStartRef.current > 0) {
          const latency = Date.now() - pingStartRef.current;
          setPingLatency(latency);
          pingStartRef.current = 0;
        }
      }
    });

    return () => {
      unsubStatus();
      unsubLogs();
    };
  }, []);

  const handleSelectMode = async (mode: DriverMode) => {
    setActiveTab(mode);
    await hardwareManager.setMode(mode);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await hardwareManager.connect();
    } catch (err) {
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    try {
      await hardwareManager.disconnect();
    } catch (err) {
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSendPing = async () => {
    pingStartRef.current = Date.now();
    setPingLatency(null);
    await hardwareManager.send({ cmd: 'PING' });
  };

  const handleSendBuzzerTest = async () => {
    await hardwareManager.send({ cmd: 'BUZZ', freq: 1600, dur: 180 });
  };

  const handleSendLedsTest = async () => {
    await hardwareManager.send({ cmd: 'SET_LEDS', tgt: 0, mask: 255 });
    setTimeout(async () => {
      await hardwareManager.send({ cmd: 'RESET' });
    }, 1200);
  };

  const handleTestTarget = async (tgt: TargetId) => {
    await hardwareManager.send({ cmd: 'START', tgt, time: 3500 });
  };

  const handleSendEmergencyStop = async () => {
    await hardwareManager.send('!EMG');
  };

  const handleSendReset = async () => {
    await hardwareManager.send({ cmd: 'RESET' });
  };

  const handleSendCustom = async () => {
    const trimmed = customCommand.trim();
    if (!trimmed) return;
    try {
      if (trimmed === '!EMG') {
        await hardwareManager.send('!EMG');
      } else {
        const parsed = JSON.parse(trimmed);
        await hardwareManager.send(parsed);
      }
      setCustomCommand('');
    } catch (e: any) {
      alert(`JSON inválido: ${e?.message}`);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>GERENCIADOR DE HARDWARE IOT</Text>
              <Text style={styles.subtitle}>Comunicação Serial UART / USB (115200 bps) & Simulação</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Abas de Modo: Arduino Real USB vs Simulador Virtual */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'WEB_SERIAL' && styles.tabButtonActive]}
              onPress={() => handleSelectMode('WEB_SERIAL')}
            >
              <Text style={[styles.tabText, activeTab === 'WEB_SERIAL' && styles.tabTextActive]}>
                🔌 Arduino USB (Web Serial Real)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'MOCK' && styles.tabButtonActive]}
              onPress={() => handleSelectMode('MOCK')}
            >
              <Text style={[styles.tabText, activeTab === 'MOCK' && styles.tabTextActive]}>
                🧪 Simulador Virtual (Mock)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conteúdo Principal Rolável */}
          <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Bloco de Conexão */}
            <View style={styles.cardSection}>
              <View style={styles.statusRow}>
                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      isConnected ? styles.dotConnected : styles.dotDisconnected,
                    ]}
                  />
                  <Text style={styles.statusBadgeText}>
                    {isConnected
                      ? `Conectado: ${deviceName || 'Dispositivo Serial'}`
                      : 'Desconectado'}
                  </Text>
                </View>

                {activeTab === 'WEB_SERIAL' && !isWebSerialSupported && (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      ⚠️ Web Serial API não suportada neste navegador. Abra o aplicativo no Google Chrome, Microsoft Edge ou Opera.
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.connectActions}>
                {isConnected ? (
                  <TouchableOpacity
                    style={styles.disconnectBtn}
                    onPress={handleDisconnect}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Text style={styles.disconnectBtnText}>Desconectar Porta USB</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.connectBtn,
                      activeTab === 'WEB_SERIAL' && !isWebSerialSupported && styles.btnDisabled,
                    ]}
                    onPress={handleConnect}
                    disabled={isConnecting || (activeTab === 'WEB_SERIAL' && !isWebSerialSupported)}
                  >
                    {isConnecting ? (
                      <ActivityIndicator size="small" color="#0B0F19" />
                    ) : (
                      <Text style={styles.connectBtnText}>
                        {activeTab === 'WEB_SERIAL'
                          ? '🔌 Selecionar e Conectar Porta COM'
                          : '⚡ Inicializar Simulador Virtual'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Painel de Diagnóstico e Testes Práticos de Bancada */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🧪 PAINEL DE TESTES DE HARDWARE EM TEMPO REAL</Text>
                {pingLatency !== null && (
                  <Text style={styles.latencyText}>Latência RTT: {pingLatency} ms</Text>
                )}
              </View>
              <Text style={styles.sectionDesc}>
                Execute testes individuais dos atuadores e sensores conectados ao Arduino Uno:
              </Text>

              <View style={styles.testButtonsGrid}>
                <TouchableOpacity
                  style={[styles.testBtn, !isConnected && styles.btnDisabled]}
                  onPress={handleSendPing}
                  disabled={!isConnected}
                >
                  <Text style={styles.testBtnText}>📶 Testar PING / PONG</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.testBtn, !isConnected && styles.btnDisabled]}
                  onPress={handleSendBuzzerTest}
                  disabled={!isConnected}
                >
                  <Text style={styles.testBtnText}>🔊 Testar Buzzer (Beep)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.testBtn, !isConnected && styles.btnDisabled]}
                  onPress={handleSendLedsTest}
                  disabled={!isConnected}
                >
                  <Text style={styles.testBtnText}>💡 Testar LEDs (Geral)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.testBtn, styles.testBtnReset, !isConnected && styles.btnDisabled]}
                  onPress={handleSendReset}
                  disabled={!isConnected}
                >
                  <Text style={styles.testBtnResetText}>🔄 Resetar Firmware</Text>
                </TouchableOpacity>
              </View>

              {/* Teste de Ativação dos 5 Alvos */}
              <Text style={styles.subSectionTitle}>Testar Alvo Específico (Acende LED e aguarda impacto no Piezo):</Text>
              <View style={styles.targetTestRow}>
                {([1, 2, 3, 4, 5] as TargetId[]).map((tgt) => (
                  <TouchableOpacity
                    key={tgt}
                    style={[styles.targetTestBtn, !isConnected && styles.btnDisabled]}
                    onPress={() => handleTestTarget(tgt)}
                    disabled={!isConnected}
                  >
                    <Text style={styles.targetTestBtnText}>Alvo {tgt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Botão de Teste de Parada de Emergência */}
              <TouchableOpacity
                style={[styles.estopTestBtn, !isConnected && styles.btnDisabled]}
                onPress={handleSendEmergencyStop}
                disabled={!isConnected}
              >
                <Text style={styles.estopTestBtnText}>🚨 Testar Parada de Segurança (!EMG)</Text>
              </TouchableOpacity>
            </View>

            {/* Monitor Serial Interativo (Console TX / RX) */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📟 MONITOR SERIAL UART (115200 BPS)</Text>
                <TouchableOpacity onPress={() => setLogs([])}>
                  <Text style={styles.clearLogsText}>Limpar Console</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.terminalBox}>
                <ScrollView style={styles.terminalScroll} nestedScrollEnabled>
                  {logs.length === 0 ? (
                    <Text style={styles.logPlaceholder}>Nenhum tráfego serial registrado ainda. Conecte o hardware para iniciar.</Text>
                  ) : (
                    logs.map((item) => (
                      <View key={item.id} style={styles.logRow}>
                        <Text style={styles.logTime}>{item.timestamp}</Text>
                        <Text
                          style={[
                            styles.logDir,
                            item.direction === 'TX'
                              ? styles.dirTx
                              : item.direction === 'RX'
                              ? styles.dirRx
                              : item.direction === 'ERR'
                              ? styles.dirErr
                              : styles.dirInfo,
                          ]}
                        >
                          [{item.direction}]
                        </Text>
                        <Text style={styles.logMsg}>{item.message}</Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>

              {/* Input para envio de comando serial customizado */}
              <View style={styles.customCmdRow}>
                <TextInput
                  style={styles.customCmdInput}
                  value={customCommand}
                  onChangeText={setCustomCommand}
                  placeholder='Ex: {"cmd":"PING"} ou {"cmd":"START","tgt":1,"time":4000}'
                  placeholderTextColor="#64748B"
                  editable={isConnected}
                />
                <TouchableOpacity
                  style={[styles.sendCustomBtn, !isConnected && styles.btnDisabled]}
                  onPress={handleSendCustom}
                  disabled={!isConnected}
                >
                  <Text style={styles.sendCustomBtnText}>Enviar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    width: '100%',
    maxWidth: 750,
    maxHeight: '92%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  closeBtnText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#38BDF8',
  },
  scrollContent: {
    flex: 1,
  },
  cardSection: {
    backgroundColor: '#131D31',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  statusRow: {
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotConnected: {
    backgroundColor: '#10B981',
  },
  dotDisconnected: {
    backgroundColor: '#EF4444',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  warningBox: {
    marginTop: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  warningText: {
    fontSize: 11,
    color: '#F59E0B',
    lineHeight: 16,
  },
  connectActions: {
    marginTop: 6,
  },
  connectBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectBtnText: {
    color: '#0B0F19',
    fontSize: 13,
    fontWeight: '800',
  },
  disconnectBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  disconnectBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.5,
  },
  sectionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
  },
  latencyText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  testButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  testBtn: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  testBtnText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  testBtnReset: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  testBtnResetText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  subSectionTitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 6,
    fontWeight: '600',
  },
  targetTestRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  targetTestBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  targetTestBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  estopTestBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  estopTestBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
  },
  clearLogsText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  terminalBox: {
    backgroundColor: '#050810',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    height: 150,
    padding: 8,
    marginBottom: 10,
  },
  terminalScroll: {
    flex: 1,
  },
  logPlaceholder: {
    color: '#475569',
    fontSize: 11,
    fontStyle: 'italic',
    padding: 4,
  },
  logRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  logTime: {
    color: '#475569',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  logDir: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  dirTx: {
    color: '#10B981',
  },
  dirRx: {
    color: '#38BDF8',
  },
  dirErr: {
    color: '#EF4444',
  },
  dirInfo: {
    color: '#F59E0B',
  },
  logMsg: {
    color: '#E2E8F0',
    fontSize: 10,
    fontFamily: 'monospace',
    flex: 1,
  },
  customCmdRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customCmdInput: {
    flex: 1,
    backgroundColor: '#050810',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#F8FAFC',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  sendCustomBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 6,
  },
  sendCustomBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
});
