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

export class MockSerialDriver implements ISerialDriver {
  public isConnected: boolean = false;
  public deviceName: string | null = null;

  private eventListeners: Set<EventListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();

  private activeTarget: TargetId | null = null;
  private roundTimer: ReturnType<typeof setTimeout> | null = null;
  private roundStartTime: number = 0;
  private roundDurationMs: number = 0;

  async connect(): Promise<boolean> {
    // Simula handshake de 300ms
    await new Promise((res) => setTimeout(res, 300));
    this.isConnected = true;
    this.deviceName = 'STA-UNO-R3 (Simulador Virtual)';

    this.notifyStatus(true, this.deviceName);

    // Emite o evento oficial de READY
    this.notifyEvent({
      evt: 'READY',
      hw: 'STA-UNO-R3-VIRTUAL',
      fw: '1.0.0-SIM',
      piezo: [12, 10, 14, 11, 9],
    });

    return true;
  }

  async disconnect(): Promise<void> {
    this.clearRoundTimer();
    this.isConnected = false;
    this.deviceName = null;
    this.notifyStatus(false);
  }

  async send(command: SerialCommand | '!EMG'): Promise<void> {
    if (!this.isConnected) {
      console.warn('[MockSerialDriver] Tentativa de envio com hardware desconectado.');
      return;
    }

    if (command === '!EMG' || (typeof command === 'object' && command.cmd === 'ESTOP')) {
      this.clearRoundTimer();
      this.activeTarget = null;
      this.notifyEvent({
        evt: 'ESTOP_ALERT',
        src: 'SIMULATOR_FAIL_SAFE',
        ts: Date.now(),
      });
      return;
    }

    if (typeof command === 'object') {
      switch (command.cmd) {
        case 'START':
          this.startTargetRound(command.tgt, command.time);
          break;

        case 'RESET':
          this.clearRoundTimer();
          this.activeTarget = null;
          this.notifyEvent({
            evt: 'READY',
            hw: 'STA-UNO-R3-VIRTUAL',
            fw: '1.0.0-RESET',
          });
          break;

        case 'PING':
          this.notifyEvent({
            evt: 'PONG',
            ts: Date.now(),
          });
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
      // Acerto válido no alvo ativo
      this.clearRoundTimer();
      this.notifyEvent({
        evt: 'HIT',
        tgt: targetId,
        val: adcVal,
        ts: now,
      });
      this.activeTarget = null;
    } else if (this.activeTarget && targetId !== this.activeTarget) {
      // Acerto no alvo incorreto
      this.notifyEvent({
        evt: 'WRONG_HIT',
        tgt: targetId,
        val: adcVal,
        expected: this.activeTarget,
        ts: now,
      });
    }
  }

  private startTargetRound(tgt: TargetId, timeMs: number): void {
    this.clearRoundTimer();
    this.activeTarget = tgt;
    this.roundDurationMs = timeMs;
    this.roundStartTime = Date.now();

    // Inicia contagem regressiva para expiração (MISS) caso não haja impacto
    this.roundTimer = setTimeout(() => {
      if (this.activeTarget === tgt) {
        this.notifyEvent({
          evt: 'MISS',
          tgt,
          ts: Date.now(),
        });
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

  private notifyEvent(event: SerialEvent): void {
    this.eventListeners.forEach((fn) => fn(event));
  }

  private notifyStatus(connected: boolean, name?: string): void {
    this.statusListeners.forEach((fn) => fn(connected, name));
  }
}

// Instância singleton para uso em todo o aplicativo mobile
export const mockSerialDriver = new MockSerialDriver();
