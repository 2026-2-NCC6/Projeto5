/**
 * Smart Tennis Arena — Simulador de Hardware Serial (Mock Arduino Uno R3)
 * Permite teste completo do fluxo físico/lógico antes da chegada dos componentes de hardware.
 * Alinhado com: docs/spec/05-firmware-protocol.md
 */

import {
  SerialCommand,
  SerialEvent,
  TargetId,
} from '../../../packages/shared/src/protocol/serial';
import {
  EventListener,
  ISerialDriver,
  StatusListener,
} from './serialInterface';
import { SerialLogListener } from './webSerialDriver';

export class MockSerialDriver implements ISerialDriver {
  public isConnected: boolean = false;
  public deviceName: string | null = null;
  public thresholdMv: number = 400;

  private eventListeners: Set<EventListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private logListeners: Set<SerialLogListener> = new Set();

  private activeTarget: TargetId | null = null;
  private roundTimer: ReturnType<typeof setTimeout> | null = null;
  private roundStartTime: number = 0;
  private roundDurationMs: number = 0;

  async connect(): Promise<boolean> {
    await new Promise((res) => setTimeout(res, 180));
    this.isConnected = true;
    this.deviceName = 'Simulador';

    this.notifyStatus(true, this.deviceName);
    this.notifyLog('INFO', '<ARDUINO_BOOT> Smart Tennis Arena Firmware v2.4 Ready');
    this.notifyLog('RX', '<CMD_IN> PING -> <ACK_PONG> STATUS:OK SENSORS:5');
    this.notifyLog('INFO', `<CALIB> Piezo Threshold configurado em ${this.thresholdMv}mV`);

    // Emite o evento oficial de READY
    this.notifyEvent({
      evt: 'READY',
      hw: 'STA-UNO-R3-VIRTUAL',
      fw: '2.4.0-SIM',
      piezo: [12, 10, 14, 11, 9],
    });

    return true;
  }

  async disconnect(): Promise<void> {
    this.clearRoundTimer();
    this.isConnected = false;
    this.deviceName = null;
    this.notifyLog('INFO', '<DISCONNECT> Porta virtual encerrada pelo host');
    this.notifyStatus(false);
  }

  async send(command: SerialCommand | '!EMG'): Promise<void> {
    if (!this.isConnected) {
      this.notifyLog('ERR', 'Tentativa de envio TX com hardware desconectado.');
      return;
    }

    if (command === '!EMG' || (typeof command === 'object' && command.cmd === 'ESTOP')) {
      this.notifyLog('TX', '!EMG');
      this.clearRoundTimer();
      this.activeTarget = null;
      const alertEvt: SerialEvent = {
        evt: 'ESTOP_ALERT',
        src: 'SIMULATOR_FAIL_SAFE',
        ts: Date.now(),
      };
      this.notifyLog('ERR', `<ESTOP_ALERT> Parada segura ativada! Registradores 74HC595 -> 0x00`);
      this.notifyEvent(alertEvt);
      return;
    }

    this.notifyLog('TX', JSON.stringify(command));

    if (typeof command === 'object') {
      switch (command.cmd) {
        case 'START':
          this.startTargetRound(command.tgt, command.time);
          this.notifyLog('RX', `<TARGET_ON> Alvo #${command.tgt} ativado (${command.time}ms)`);
          break;

        case 'RESET':
          this.clearRoundTimer();
          this.activeTarget = null;
          this.notifyLog('RX', '<RESET_OK> Todos os anéis de LED reiniciados');
          this.notifyEvent({
            evt: 'READY',
            hw: 'STA-UNO-R3-VIRTUAL',
            fw: '2.4.0-RESET',
          });
          break;

        case 'PING': {
          const ts = Date.now();
          this.notifyLog('RX', `<ACK_PONG> STATUS:OK SENSORS:5 TS:${ts}`);
          this.notifyEvent({
            evt: 'PONG',
            ts,
          });
          break;
        }

        case 'CALIB': {
          const avg = Math.round(
            command.thresh.reduce((acc, v) => acc + v, 0) / command.thresh.length
          );
          this.thresholdMv = avg;
          this.notifyLog('INFO', `<CALIB> Piezo Threshold configurado em ${avg}mV [${command.thresh.join(',')}]`);
          break;
        }

        case 'SET_LEDS':
          this.notifyLog('RX', `<LEDS_ACK> Alvo:${command.tgt === 0 ? 'TODOS' : command.tgt} Mask:0x${command.mask.toString(16).toUpperCase()}`);
          break;

        case 'BUZZ':
          this.notifyLog('RX', `<BUZZ_ACK> Freq:${command.freq}Hz Dur:${command.dur}ms`);
          break;

        case 'DISPLAY':
          this.notifyLog('RX', `<DISP_7SEG> "${command.val}"`);
          break;
      }
    }
  }

  /**
   * Simula o impacto físico de uma bola de tênis em um dos 5 alvos.
   */
  public simulateHit(targetId: TargetId, customAdcVal?: number): void {
    if (!this.isConnected) return;

    const now = Date.now();
    const adcVal = customAdcVal ?? Math.floor(650 + Math.random() * 300); // 650..950

    if (this.activeTarget && targetId === this.activeTarget) {
      this.clearRoundTimer();
      const evt: SerialEvent = {
        evt: 'HIT',
        tgt: targetId,
        val: adcVal,
        ts: now,
      };
      this.notifyLog('RX', JSON.stringify(evt));
      this.notifyEvent(evt);
      this.activeTarget = null;
    } else if (this.activeTarget && targetId !== this.activeTarget) {
      const evt: SerialEvent = {
        evt: 'WRONG_HIT',
        tgt: targetId,
        val: adcVal,
        expected: this.activeTarget,
        ts: now,
      };
      this.notifyLog('RX', JSON.stringify(evt));
      this.notifyEvent(evt);
    } else {
      // Toque livre fora de rodada ativa (teste de bancada)
      this.notifyLog('RX', `<PIEZO_TEST> Impacto detectado no Sensor #${targetId} (ADC:${adcVal})`);
    }
  }

  private startTargetRound(tgt: TargetId, timeMs: number): void {
    this.clearRoundTimer();
    this.activeTarget = tgt;
    this.roundDurationMs = timeMs;
    this.roundStartTime = Date.now();

    this.roundTimer = setTimeout(() => {
      if (this.activeTarget === tgt) {
        const evt: SerialEvent = {
          evt: 'MISS',
          tgt,
          ts: Date.now(),
        };
        this.notifyLog('RX', JSON.stringify(evt));
        this.notifyEvent(evt);
        this.activeTarget = null;
      }
    }, timeMs);
  }

  private clearRoundTimer(): void {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
  }

  addEventListener(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  addStatusListener(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  addLogListener(listener: SerialLogListener): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  private notifyEvent(event: SerialEvent): void {
    this.eventListeners.forEach((fn) => fn(event));
  }

  private notifyStatus(connected: boolean, name?: string): void {
    this.statusListeners.forEach((fn) => fn(connected, name));
  }

  private notifyLog(direction: 'TX' | 'RX' | 'INFO' | 'ERR', message: string): void {
    this.logListeners.forEach((fn) => {
      try {
        fn(direction, message);
      } catch {}
    });
  }
}

export const mockSerialDriver = new MockSerialDriver();
