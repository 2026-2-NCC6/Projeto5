/**
 * Smart Tennis Arena — Hardware & Porta Serial + Monitor de Protocolo Serial
 * Responsivo para Smartphone, Tablet & Desktop Web (Sem alterar mecânicas)
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
import { TargetId } from '../../../packages/shared/src/protocol/serial';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import {
  CpuIcon,
  WifiIcon,
  UsbIcon,
  TerminalIcon,
  RefreshIcon,
} from './Icons';

const THRESHOLD_STEPS = [200, 280, 340, 400, 480, 560, 650, 750];

export function HardwareView() {
  const { theme, fs } = useAccessibility();
  const { width, isMobile, isSmallPhone, cardPadding, sectionGap } = useResponsive();
  const isWide = width >= 960;

  const [activeMode, setActiveMode] = useState<DriverMode>(hardwareManager.mode);
  const [isConnected, setIsConnected] = useState<boolean>(hardwareManager.isConnected);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [logs, setLogs] = useState<SerialLogEntry[]>(hardwareManager.logHistory);
  const [thresholdMv, setThresholdMv] = useState<number>(
    mockSerialDriver.thresholdMv || 400
  );
  const [baudLabel, setBaudLabel] = useState<'115200 bps (Padrão)' | '57600 bps'>(
    '115200 bps (Padrão)'
  );
  const [customCommand, setCustomCommand] = useState<string>('');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const pingStartRef = useRef<number>(0);

  const isWebSerialSupported = WebSerialDriver.isSupported();

  useEffect(() => {
    setActiveMode(hardwareManager.mode);
    setIsConnected(hardwareManager.isConnected);
    setLogs([...hardwareManager.logHistory]);

    const unsubStatus = hardwareManager.addStatusListener((conn) => {
      setIsConnected(conn);
      setIsConnecting(false);
    });

    const unsubLogs = hardwareManager.addLogListener((dir, msg) => {
      setLogs([...hardwareManager.logHistory]);

      if (dir === 'RX' && (msg.includes('PONG') || msg.includes('ACK_PONG'))) {
        if (pingStartRef.current > 0) {
          setPingLatency(Date.now() - pingStartRef.current);
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
    setActiveMode(mode);
    await hardwareManager.setMode(mode);
    if (mode === 'MOCK' && !hardwareManager.isConnected) {
      await hardwareManager.connect();
    }
  };

  const handleReconnect = async () => {
    setIsConnecting(true);
    try {
      if (hardwareManager.isConnected) {
        await hardwareManager.disconnect();
      }
      await hardwareManager.connect();
    } catch (err) {
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleUpdateThreshold = async (newVal: number) => {
    const clamped = Math.max(150, Math.min(900, newVal));
    setThresholdMv(clamped);
    if (hardwareManager.isConnected) {
      await hardwareManager.send({
        cmd: 'CALIB',
        thresh: [clamped, clamped, clamped, clamped, clamped],
      });
    }
  };

  const handleTestAllSensors = async () => {
    if (!hardwareManager.isConnected) {
      await hardwareManager.connect();
    }
    pingStartRef.current = Date.now();
    await hardwareManager.send({ cmd: 'PING' });
    await hardwareManager.send({ cmd: 'SET_LEDS', tgt: 0, mask: 255 });
    await hardwareManager.send({ cmd: 'BUZZ', freq: 1400, dur: 120 });
    setTimeout(() => {
      hardwareManager.send({ cmd: 'RESET' }).catch(() => {});
    }, 800);
  };

  const handleSendCustom = async () => {
    const raw = customCommand.trim();
    if (!raw) return;

    if (!hardwareManager.isConnected) {
      await hardwareManager.connect();
    }

    const upper = raw.toUpperCase();
    try {
      if (upper === '!EMG' || upper === 'ESTOP') {
        await hardwareManager.send('!EMG');
      } else if (upper === 'PING' || upper === 'STATUS') {
        pingStartRef.current = Date.now();
        await hardwareManager.send({ cmd: 'PING' });
      } else if (upper === 'RESET') {
        await hardwareManager.send({ cmd: 'RESET' });
      } else if (upper === 'BUZZ') {
        await hardwareManager.send({ cmd: 'BUZZ', freq: 1500, dur: 160 });
      } else if (upper.startsWith('CALIB:')) {
        const val = parseInt(upper.split(':')[1], 10);
        if (!isNaN(val)) {
          await handleUpdateThreshold(val);
        }
      } else if (upper.startsWith('LED_ON:')) {
        const tgt = parseInt(upper.split(':')[1], 10) as TargetId | 0;
        if (tgt >= 0 && tgt <= 5) {
          await hardwareManager.send({ cmd: 'SET_LEDS', tgt, mask: 255 });
        }
      } else {
        const parsed = JSON.parse(raw);
        await hardwareManager.send(parsed);
      }
      setCustomCommand('');
    } catch {
      alert(
        'Formato inválido. Use atalhos como PING, STATUS, RESET, !EMG, CALIB:420, LED_ON:2 ou JSON {"cmd":"PING"}'
      );
    }
  };

  const thresholdRatio = Math.max(
    0.05,
    Math.min(1, (thresholdMv - 150) / (800 - 150))
  );

  return (
    <View
      style={[
        styles.grid,
        !isWide && styles.gridStacked,
        { gap: sectionGap },
      ]}
    >
      {/* COLUNA ESQUERDA: Hardware & Porta Serial */}
      <View
        style={[
          styles.leftCard,
          !isWide && styles.fullWidth,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            padding: cardPadding,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={[styles.titleRow, { flex: 1, minWidth: 180 }]}>
            <View
              style={[
                styles.iconSquare,
                { backgroundColor: theme.surfaceMint, borderColor: theme.primaryBorder },
              ]}
            >
              <CpuIcon size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.cardTitle,
                  { color: theme.text, fontSize: isMobile ? fs(16) : fs(17) },
                ]}
              >
                Hardware & Porta Serial
              </Text>
              <Text
                style={[
                  styles.cardSubtitle,
                  { color: theme.textSecondary, fontSize: fs(12) },
                ]}
              >
                Controlador Arduino Uno / ESP32
              </Text>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            style={[
              styles.reconnectPill,
              isMobile && { width: '100%', alignItems: 'center' },
              {
                backgroundColor: theme.primarySoft,
                opacity:
                  activeMode === 'WEB_SERIAL' && !isWebSerialSupported ? 0.5 : 1,
              },
            ]}
            disabled={
              isConnecting || (activeMode === 'WEB_SERIAL' && !isWebSerialSupported)
            }
            onPress={handleReconnect}
          >
            {isConnecting ? (
              <ActivityIndicator size="small" color={theme.primaryDark} />
            ) : (
              <Text
                style={[
                  styles.reconnectText,
                  { color: theme.primaryDark, fontSize: fs(12) },
                ]}
              >
                {isConnected ? 'Reconectar Porta' : 'Conectar Porta'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Seletor de Driver */}
        <Text
          style={[
            styles.sectionCap,
            { color: theme.textSecondary, fontSize: fs(10) },
          ]}
        >
          MODO DE OPERAÇÃO DO DRIVER (&apos;HARDWAREMANAGER.TS&apos;)
        </Text>

        <View
          style={[
            styles.driverRow,
            isSmallPhone && { flexDirection: 'column' },
          ]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: activeMode === 'MOCK' }}
            activeOpacity={0.85}
            style={[
              styles.driverOption,
              {
                backgroundColor:
                  activeMode === 'MOCK' ? theme.surfaceMint : theme.surface,
                borderColor:
                  activeMode === 'MOCK' ? theme.primary : theme.borderNeutral,
                borderWidth: activeMode === 'MOCK' ? 2 : 1,
                padding: isMobile ? 12 : 15,
              },
            ]}
            onPress={() => handleSelectMode('MOCK')}
          >
            <WifiIcon
              size={18}
              color={activeMode === 'MOCK' ? theme.primary : theme.textMuted}
            />
            <Text
              style={[
                styles.driverTitle,
                { color: theme.text, fontSize: fs(13) },
              ]}
            >
              Simulador Virtual
            </Text>
            <Text
              style={[
                styles.driverDesc,
                { color: theme.textSecondary, fontSize: fs(11) },
              ]}
            >
              Testes sem bancada física
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: activeMode === 'WEB_SERIAL' }}
            activeOpacity={0.85}
            style={[
              styles.driverOption,
              {
                backgroundColor:
                  activeMode === 'WEB_SERIAL' ? theme.surfaceMint : theme.surface,
                borderColor:
                  activeMode === 'WEB_SERIAL' ? theme.primary : theme.borderNeutral,
                borderWidth: activeMode === 'WEB_SERIAL' ? 2 : 1,
                padding: isMobile ? 12 : 15,
              },
            ]}
            onPress={() => handleSelectMode('WEB_SERIAL')}
          >
            <UsbIcon
              size={18}
              color={activeMode === 'WEB_SERIAL' ? theme.primary : theme.textMuted}
            />
            <Text
              style={[
                styles.driverTitle,
                { color: theme.text, fontSize: fs(13) },
              ]}
            >
              Web Serial USB
            </Text>
            <Text
              style={[
                styles.driverDesc,
                { color: theme.textSecondary, fontSize: fs(11) },
              ]}
            >
              Conexão direta cabo OTG/USB
            </Text>
          </TouchableOpacity>
        </View>

        {activeMode === 'WEB_SERIAL' && !isWebSerialSupported && (
          <View
            style={[
              styles.browserAlert,
              { backgroundColor: theme.warningSoft, borderColor: theme.warningBorder },
            ]}
          >
            <Text style={{ color: theme.warning, fontSize: fs(11), fontWeight: '600' }}>
              Web Serial API requer navegador baseado em Chromium no computador (Chrome, Edge ou Opera).
            </Text>
          </View>
        )}

        {/* Calibração de Sensibilidade Piezoelétrica */}
        <View
          style={[
            styles.calibBox,
            {
              backgroundColor: theme.bg,
              borderColor: theme.primaryBorder,
              padding: isMobile ? 13 : 16,
            },
          ]}
        >
          <View style={styles.calibTopRow}>
            <Text
              style={[
                styles.calibTitle,
                { color: theme.text, fontSize: fs(12) },
              ]}
            >
              Sensibilidade Piezoelétrica (Threshold)
            </Text>
            <View
              style={[
                styles.mvBadge,
                { backgroundColor: theme.primarySoft },
              ]}
            >
              <Text
                style={[
                  styles.mvBadgeText,
                  { color: theme.primaryDark, fontSize: fs(11) },
                ]}
              >
                {thresholdMv} mV
              </Text>
            </View>
          </View>

          {/* Barra Slider Interativa */}
          <View style={styles.sliderControlsRow}>
            <TouchableOpacity
              accessibilityLabel="Reduzir limiar piezoelétrico"
              style={[styles.stepMiniBtn, { borderColor: theme.primaryBorder }]}
              onPress={() => handleUpdateThreshold(thresholdMv - 40)}
            >
              <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: 16 }}>
                −
              </Text>
            </TouchableOpacity>

            <View style={styles.sliderTrackWrap}>
              <View
                style={[
                  styles.sliderTrack,
                  { backgroundColor: theme.borderNeutral },
                ]}
              >
                <View
                  style={[
                    styles.sliderFill,
                    {
                      width: `${Math.round(thresholdRatio * 100)}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>
              <View style={styles.sliderStepsOverlay}>
                {THRESHOLD_STEPS.map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={styles.stepHitArea}
                    onPress={() => handleUpdateThreshold(val)}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              accessibilityLabel="Aumentar limiar piezoelétrico"
              style={[styles.stepMiniBtn, { borderColor: theme.primaryBorder }]}
              onPress={() => handleUpdateThreshold(thresholdMv + 40)}
            >
              <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: 16 }}>
                +
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.calibLabelsRow}>
            <Text style={{ color: theme.textMuted, fontSize: fs(10) }}>
              Mais Sensível (Leve)
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: fs(10) }}>
              Menos Sensível (Forte)
            </Text>
          </View>
        </View>

        {/* Baud Rate & Comandos Rápidos */}
        <View style={styles.baudRow}>
          <Text
            style={{
              color: theme.textSecondary,
              fontWeight: '700',
              fontSize: fs(12),
            }}
          >
            Baud Rate:
          </Text>

          <TouchableOpacity
            style={[
              styles.baudPill,
              {
                backgroundColor: theme.surface,
                borderColor: theme.primaryBorder,
              },
            ]}
            onPress={() =>
              setBaudLabel((prev) =>
                prev === '115200 bps (Padrão)'
                  ? '57600 bps'
                  : '115200 bps (Padrão)'
              )
            }
          >
            <Text
              style={{
                color: theme.text,
                fontWeight: '700',
                fontSize: fs(12),
              }}
            >
              {baudLabel} ▾
            </Text>
          </TouchableOpacity>
        </View>

        {/* Atalhos Rápidos de Bancada */}
        <View style={styles.quickBenchRow}>
          <TouchableOpacity
            style={[
              styles.benchChip,
              { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral },
            ]}
            onPress={async () => {
              pingStartRef.current = Date.now();
              await hardwareManager.send({ cmd: 'PING' });
            }}
          >
            <Text style={{ color: theme.textSecondary, fontWeight: '700', fontSize: fs(11) }}>
              PING {pingLatency !== null ? `(${pingLatency}ms)` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.benchChip,
              { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral },
            ]}
            onPress={() => hardwareManager.send({ cmd: 'BUZZ', freq: 1600, dur: 150 })}
          >
            <Text style={{ color: theme.textSecondary, fontWeight: '700', fontSize: fs(11) }}>
              Buzzer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.benchChip,
              { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral },
            ]}
            onPress={() => hardwareManager.send({ cmd: 'SET_LEDS', tgt: 0, mask: 255 })}
          >
            <Text style={{ color: theme.textSecondary, fontWeight: '700', fontSize: fs(11) }}>
              LEDs ON
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.benchChip,
              { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral },
            ]}
            onPress={() => hardwareManager.send({ cmd: 'RESET' })}
          >
            <Text style={{ color: theme.textSecondary, fontWeight: '700', fontSize: fs(11) }}>
              Reset
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* COLUNA DIREITA: Monitor de Protocolo Serial */}
      <View
        style={[
          styles.rightCard,
          !isWide && styles.fullWidth,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            padding: cardPadding,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={[styles.titleRow, { flex: 1, minWidth: 180 }]}>
            <TerminalIcon size={20} color={theme.primary} />
            <Text
              style={[
                styles.cardTitle,
                { color: theme.text, fontSize: isMobile ? fs(15) : fs(17), flexShrink: 1 },
              ]}
            >
              Monitor Serial (`serial.ts`)
            </Text>
          </View>

          <View
            style={[
              styles.monitorActionsRow,
              isMobile && { width: '100%', justifyContent: 'space-between' },
            ]}
          >
            {logs.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  hardwareManager.clearLogHistory();
                  setLogs([]);
                }}
              >
                <Text
                  style={{
                    color: theme.textMuted,
                    fontSize: fs(11),
                    fontWeight: '600',
                  }}
                >
                  Limpar
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.8}
              style={[
                styles.testSensorsBtn,
                {
                  backgroundColor: theme.surfaceMint,
                  borderColor: theme.primaryBorder,
                },
              ]}
              onPress={handleTestAllSensors}
            >
              <RefreshIcon size={13} color={theme.primaryDark} />
              <Text
                style={{
                  color: theme.primaryDark,
                  fontWeight: '700',
                  fontSize: fs(11),
                }}
              >
                Testar Todos os Sensores
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Console Terminal Escuro */}
        <View
          style={[
            styles.terminalWindow,
            {
              backgroundColor: theme.terminalBg,
              height: isMobile ? 220 : 310,
            },
          ]}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: isMobile ? 12 : 16 }}
            nestedScrollEnabled
          >
            {logs.length === 0 ? (
              <Text
                style={[
                  styles.terminalLine,
                  { color: '#64748B', fontSize: fs(11) },
                ]}
              >
                [AGUARDANDO] Conecte ou envie um frame TX para inspecionar o barramento UART...
              </Text>
            ) : (
              logs.map((item) => (
                <Text
                  key={item.id}
                  style={[
                    styles.terminalLine,
                    {
                      color:
                        item.direction === 'ERR'
                          ? '#F87171'
                          : item.direction === 'TX'
                          ? '#34D399'
                          : theme.terminalText,
                      fontSize: isMobile ? fs(11) : fs(12),
                    },
                  ]}
                >
                  [{item.timestamp}] {item.direction === 'TX' ? '<CMD_IN> ' : ''}
                  {item.message}
                </Text>
              ))
            )}
          </ScrollView>
        </View>

        {/* Barra de Envio TX */}
        <View style={[styles.txRow, isSmallPhone && { flexDirection: 'column' }]}>
          <TextInput
            style={[
              styles.txInput,
              {
                backgroundColor: theme.surfaceMuted,
                borderColor: theme.primaryBorder,
                color: theme.text,
                fontSize: fs(12),
              },
            ]}
            value={customCommand}
            onChangeText={setCustomCommand}
            onSubmitEditing={handleSendCustom}
            placeholder={
              isMobile
                ? 'Frame TX (PING, CALIB:420, !EMG)...'
                : 'Enviar frame serial (ex: LED_ON:2, CALIB:420, STATUS)...'
            }
            placeholderTextColor={theme.textMuted}
          />
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            style={[
              styles.txSendBtn,
              isSmallPhone && { width: '100%' },
              { backgroundColor: theme.primary },
            ]}
            onPress={handleSendCustom}
          >
            <Text style={[styles.txSendText, { fontSize: fs(13) }]}>
              Enviar TX
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
  },
  gridStacked: {
    flexDirection: 'column',
  },
  fullWidth: {
    width: '100%',
  },
  leftCard: {
    flex: 4.5,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  rightCard: {
    flex: 5.5,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'space-between',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monitorActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconSquare: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    marginTop: 2,
  },
  reconnectPill: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  reconnectText: {
    fontWeight: '800',
  },
  sectionCap: {
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  driverRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  driverOption: {
    flex: 1,
    borderRadius: 14,
    gap: 4,
  },
  driverTitle: {
    fontWeight: '800',
    marginTop: 4,
  },
  driverDesc: {
    lineHeight: 15,
  },
  browserAlert: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  calibBox: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  calibTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  calibTitle: {
    fontWeight: '800',
    flex: 1,
  },
  mvBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  mvBadgeText: {
    fontWeight: '800',
  },
  sliderControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  stepMiniBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  sliderTrackWrap: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 999,
  },
  sliderStepsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  stepHitArea: {
    flex: 1,
  },
  calibLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  baudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  baudPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  quickBenchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  benchChip: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
  },
  testSensorsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  terminalWindow: {
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  terminalLine: {
    fontFamily: 'monospace',
    lineHeight: 20,
    marginBottom: 4,
  },
  txRow: {
    flexDirection: 'row',
    gap: 10,
  },
  txInput: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  txSendBtn: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txSendText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
