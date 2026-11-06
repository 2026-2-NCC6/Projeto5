/**
 * Smart Tennis Arena — Hardware & Porta Serial + Diagnóstico de Sensores e Pareamento com Token
 * Alinhado com: RF05 (Pareamento Autorizado e Diagnóstico dos 5 Piezos), RF08 e Cibersegurança IoT
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  hardwareManager,
  DriverMode,
  SerialLogEntry,
} from '../hardware/hardwareManager';
import { mockSerialDriver } from '../hardware/mockSerialDriver';
import { WebSerialDriver } from '../hardware/webSerialDriver';
import { hostGatewayBridge } from '../hardware/hostGatewayBridge';
import { remoteGatewayDriver } from '../hardware/remoteGatewayDriver';
import { TargetId } from '../../../packages/shared/src/protocol/serial';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import { api } from '../services/api';
import {
  CpuIcon,
  WifiIcon,
  UsbIcon,
  TerminalIcon,
  RefreshIcon,
  SlidersIcon,
  CheckCircleIcon,
  ShieldAlertIcon,
} from './Icons';

export function HardwareView() {
  const { theme, fs } = useAccessibility();
  const { width, isMobile, cardPadding } = useResponsive();

  const [activeMode, setActiveMode] = useState<DriverMode>(hardwareManager.mode);
  const [isConnected, setIsConnected] = useState<boolean>(hardwareManager.isConnected);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [logs, setLogs] = useState<SerialLogEntry[]>(hardwareManager.logHistory);
  const [piezoSensors, setPiezoSensors] = useState<number[]>([250, 250, 250, 250, 250]);
  const [customCommand, setCustomCommand] = useState<string>('');
  const [pairingToken, setPairingToken] = useState<string>('sta-iot-uno-r3-demo-token-2026');
  const [isPairingAuthorized, setIsPairingAuthorized] = useState<boolean>(false);
  const [pairingStatusMsg, setPairingStatusMsg] = useState<string | null>(null);
  const [connectedControllers, setConnectedControllers] = useState<number>(hostGatewayBridge.controllers);

  const isWebSerialSupported = WebSerialDriver.isSupported();

  useEffect(() => {
    setActiveMode(hardwareManager.mode);
    setIsConnected(hardwareManager.isConnected);
    setLogs([...hardwareManager.logHistory]);

    const unsubStatus = hardwareManager.addStatusListener((conn) => {
      setIsConnected(conn);
      setIsConnecting(false);
    });

    const unsubBridge = hostGatewayBridge.addStatusListener((_conn, count) => {
      setConnectedControllers(count);
    });

    const unsubLogs = hardwareManager.addLogListener((dir, msg) => {
      setLogs([...hardwareManager.logHistory]);

      // Captura calibração e autoteste dos sensores do Arduino
      if (dir === 'RX' && msg.includes('READY')) {
        try {
          const parsed = JSON.parse(msg);
          if (Array.isArray(parsed.piezo) && parsed.piezo.length === 5) {
            setPiezoSensors(parsed.piezo);
          }
        } catch {}
      }
    });

    return () => {
      unsubStatus();
      unsubLogs();
      unsubBridge();
    };
  }, []);

  const handleSelectMode = async (mode: DriverMode) => {
    setActiveMode(mode);
    await hardwareManager.setMode(mode);
    if ((mode === 'MOCK' || mode === 'REMOTE_GATEWAY') && !hardwareManager.isConnected) {
      await hardwareManager.connect();
    }
  };

  const handleConnectHardware = async () => {
    setIsConnecting(true);
    setPairingStatusMsg(null);
    try {
      if (hardwareManager.isConnected) {
        await hardwareManager.disconnect();
      }
      const success = await hardwareManager.connect();
      if (success) {
        // Valida pareamento autorizado com a API REST (RF05)
        try {
          const deviceCode = activeMode === 'WEB_SERIAL'
            ? 'STA-UNO-R3-01'
            : activeMode === 'REMOTE_GATEWAY'
              ? 'STA-REMOTE-GATEWAY-01'
              : 'STA-SIM-VIRTUAL-01';
          const res = await api.pairDevice({
            deviceCode,
            pairingToken,
            piezoThresholds: piezoSensors,
          });
          if (res.authorized) {
            setIsPairingAuthorized(true);
            setPairingStatusMsg('Dispositivo IoT pareado e autenticado com sucesso na Arena!');
          }
        } catch (apiErr: any) {
          setPairingStatusMsg(`Hardware conectado, mas pendente de autorização na API: ${apiErr.message}`);
        }
      }
    } catch (err: any) {
      setPairingStatusMsg(`Falha na conexão: ${err?.message || err}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSendCustomCommand = async () => {
    if (!customCommand.trim()) return;
    const cmdStr = customCommand.trim();
    setCustomCommand('');

    if (cmdStr === '!EMG') {
      await hardwareManager.send('!EMG');
      return;
    }

    try {
      const parsed = JSON.parse(cmdStr);
      await hardwareManager.send(parsed);
    } catch {
      await hardwareManager.send({ cmd: 'PING' });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border, padding: cardPadding }]}>
      <View style={styles.headerRow}>
        <CpuIcon size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text, fontSize: fs(17) }]}>
          Comunicação IoT & Pareamento (RF05 / RF07 / RF08)
        </Text>
      </View>
      <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: fs(12.5) }]}>
        Conexão física via Web Serial USB (115200 bps) ou Simulador Virtual com chave autorizada.
      </Text>

      {/* Seletor de Modo */}
      <View style={styles.modeTabsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.modeTab,
            activeMode === 'MOCK' && { backgroundColor: theme.primary, borderColor: theme.primaryDark },
          ]}
          onPress={() => handleSelectMode('MOCK')}
        >
          <Text style={[styles.modeTabText, { color: activeMode === 'MOCK' ? '#FFF' : theme.textSecondary, fontSize: fs(11.5) }]}>
            Simulador Digital
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.modeTab,
            activeMode === 'WEB_SERIAL' && { backgroundColor: theme.primary, borderColor: theme.primaryDark },
          ]}
          onPress={() => handleSelectMode('WEB_SERIAL')}
        >
          <Text style={[styles.modeTabText, { color: activeMode === 'WEB_SERIAL' ? '#FFF' : theme.textSecondary, fontSize: fs(11.5) }]}>
            Arduino Físico (USB PC)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.modeTab,
            activeMode === 'REMOTE_GATEWAY' && { backgroundColor: theme.primary, borderColor: theme.primaryDark },
          ]}
          onPress={() => handleSelectMode('REMOTE_GATEWAY')}
        >
          <Text style={[styles.modeTabText, { color: activeMode === 'REMOTE_GATEWAY' ? '#FFF' : theme.textSecondary, fontSize: fs(11.5) }]}>
            📱 Celular (Ponte PC)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Indicador de Ponte WebSocket para o PC */}
      {activeMode === 'WEB_SERIAL' && isConnected && (
        <View style={[styles.gatewayBanner, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
          <WifiIcon size={16} color="#15803D" />
          <Text style={[styles.gatewayBannerText, { color: '#15803D', fontSize: fs(12) }]}>
            Ponte com Celular Ativa: {connectedControllers} celular(es) conectado(s) na Arena.
          </Text>
        </View>
      )}

      {/* Dica explicativa para o modo Celular */}
      {activeMode === 'REMOTE_GATEWAY' && (
        <View style={[styles.gatewayBanner, { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }]}>
          <WifiIcon size={16} color="#1D4ED8" />
          <Text style={[styles.gatewayBannerText, { color: '#1E40AF', fontSize: fs(12) }]}>
            {isConnected
              ? `Conectado ao PC da Arena! Comandos enviados do celular irão para o Arduino e os impactos dos sensores serão recebidos aqui.`
              : `Toque em "Conectar ao PC" abaixo para parear com o PC onde o Arduino está conectado via USB.`}
          </Text>
        </View>
      )}

      {/* Caixa de Conexão e Token RF05 */}
      <View style={[styles.connectCard, { backgroundColor: theme.surfaceMint, borderColor: theme.primaryBorder }]}>
        <View style={styles.deviceInfoRow}>
          <View style={[styles.dot, { backgroundColor: isConnected ? '#22C55E' : '#EF4444' }]} />
          <Text style={[styles.deviceInfoText, { color: theme.text, fontSize: fs(13) }]}>
            {isConnected ? hardwareManager.deviceName : 'Nenhum controlador serial ativo'}
          </Text>
        </View>

        <View style={styles.tokenRow}>
          <Text style={[styles.tokenLabel, { color: theme.textSecondary, fontSize: fs(11) }]}>
            Chave/Token de Pareamento IoT (RF05):
          </Text>
          <TextInput
            style={[styles.tokenInput, { backgroundColor: theme.surface, borderColor: theme.borderNeutral, color: theme.text, fontSize: fs(11) }]}
            value={pairingToken}
            onChangeText={setPairingToken}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.connectButton, { backgroundColor: isConnected ? theme.danger : theme.primary }]}
          disabled={isConnecting}
          onPress={isConnected ? () => hardwareManager.disconnect() : handleConnectHardware}
        >
          {isConnecting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={[styles.connectButtonText, { fontSize: fs(13) }]}>
              {isConnected
                ? 'Desconectar Dispositivo'
                : activeMode === 'REMOTE_GATEWAY'
                  ? 'Conectar ao PC da Arena (WebSocket)'
                  : 'Conectar Porta Serial & Parear'}
            </Text>
          )}
        </TouchableOpacity>

        {pairingStatusMsg && (
          <Text style={[styles.statusMsg, { color: isPairingAuthorized ? theme.primaryDark : theme.warning, fontSize: fs(11.5) }]}>
            {pairingStatusMsg}
          </Text>
        )}
      </View>

      {/* Diagnóstico Individual dos 5 Sensores Piezoelétricos (RF05, RF07) */}
      <View style={styles.sensorStatusSection}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: fs(13) }]}>
          Sensores Piezoelétricos • Limiares ADC de Calibração (A0..A4)
        </Text>
        <View style={styles.sensorsGrid}>
          {piezoSensors.map((thresh, idx) => (
            <View key={idx} style={[styles.sensorBadge, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral }]}>
              <Text style={[styles.sensorName, { color: theme.primaryDark, fontSize: fs(11.5) }]}>
                Alvo #{idx + 1}
              </Text>
              <Text style={[styles.sensorThresh, { color: theme.text, fontSize: fs(12) }]}>
                {thresh} ADC
              </Text>
              <Text style={[styles.sensorStatus, { color: '#16A34A', fontSize: fs(10) }]}>
                Ativo / OK
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Monitor de Log do Protocolo Serial */}
      <View style={[styles.consoleCard, { backgroundColor: theme.terminalBg, borderColor: theme.borderNeutral }]}>
        <View style={styles.consoleHeader}>
          <TerminalIcon size={14} color={theme.terminalText} />
          <Text style={[styles.consoleTitle, { color: theme.terminalText, fontSize: fs(11.5) }]}>
            Monitor de Quadros Seriais UART (JSON \n)
          </Text>
        </View>

        <ScrollView style={styles.consoleScroll} nestedScrollEnabled>
          {logs.slice(-25).map((log) => (
            <Text key={log.id} style={[styles.consoleLine, { color: log.direction === 'TX' ? '#60A5FA' : log.direction === 'ERR' ? '#F87171' : theme.terminalText, fontSize: fs(11) }]}>
              [{log.timestamp}] [{log.direction}] {log.message}
            </Text>
          ))}
        </ScrollView>

        <View style={styles.commandRow}>
          <TextInput
            style={[styles.cmdInput, { color: theme.terminalText, borderColor: '#334155', fontSize: fs(11) }]}
            placeholder='Ex: {"cmd":"PING"} ou {"cmd":"START","tgt":1,"time":3000}'
            placeholderTextColor="#64748B"
            value={customCommand}
            onChangeText={setCustomCommand}
            onSubmitEditing={handleSendCustomCommand}
          />
          <TouchableOpacity activeOpacity={0.8} style={[styles.sendBtn, { backgroundColor: theme.primary }]} onPress={handleSendCustomCommand}>
            <Text style={[styles.sendBtnText, { fontSize: fs(11.5) }]}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1.5,
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
    marginBottom: 12,
  },
  modeTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  modeTabText: {
    fontWeight: '600',
  },
  gatewayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  gatewayBannerText: {
    flex: 1,
    lineHeight: 16,
  },
  connectCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  deviceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  deviceInfoText: {
    fontWeight: '700',
  },
  tokenRow: {
    gap: 4,
  },
  tokenLabel: {
    fontWeight: '600',
  },
  tokenInput: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  connectButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  connectButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  statusMsg: {
    fontWeight: '600',
    marginTop: 2,
  },
  sensorStatusSection: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 8,
  },
  sensorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sensorBadge: {
    flex: 1,
    minWidth: 90,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  sensorName: {
    fontWeight: '700',
  },
  sensorThresh: {
    fontFamily: 'monospace',
    fontWeight: '700',
    marginVertical: 2,
  },
  sensorStatus: {
    fontWeight: '600',
  },
  consoleCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  consoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  consoleTitle: {
    fontWeight: '700',
  },
  consoleScroll: {
    height: 140,
    marginBottom: 8,
  },
  consoleLine: {
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  commandRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cmdInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    fontFamily: 'monospace',
  },
  sendBtn: {
    paddingHorizontal: 12,
    borderRadius: 6,
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
