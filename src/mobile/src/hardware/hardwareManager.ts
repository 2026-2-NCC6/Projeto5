/**
 * Smart Tennis Arena — Hardware Manager Unificado
 * Gerencia a alternância transparente entre Arduino Real (Web Serial USB) e Simulador Virtual (Mock).
 */

import { SerialCommand, SerialEvent } from '../../../packages/shared/src/protocol/serial';
import { EventListener, ISerialDriver, StatusListener } from './serialInterface';
import { mockSerialDriver } from './mockSerialDriver';
import { webSerialDriver, SerialLogListener } from './webSerialDriver';

export type DriverMode = 'WEB_SERIAL' | 'MOCK';

export class HardwareManager implements ISerialDriver {
  private activeMode: DriverMode = 'MOCK';
  private eventListeners: Set<EventListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private logListeners: Set<SerialLogListener> = new Set();

  private unsubActiveEvent: (() => void) | null = null;
  private unsubActiveStatus: (() => void) | null = null;
  private unsubActiveLog: (() => void) | null = null;

  constructor() {
    this.bindDriver(mockSerialDriver);
  }

  public get mode(): DriverMode {
    return this.activeMode;
  }

  public get isConnected(): boolean {
    return this.activeDriver.isConnected;
  }

  public get deviceName(): string | null {
    return this.activeDriver.deviceName;
  }

  public get activeDriver(): ISerialDriver {
    return this.activeMode === 'WEB_SERIAL' ? webSerialDriver : mockSerialDriver;
  }

  /**
   * Altera o driver ativo (Arduino Físico vs Mock). Se houver conexão ativa, desconecta antes de trocar.
   */
  public async setMode(newMode: DriverMode): Promise<void> {
    if (this.activeMode === newMode) return;

    if (this.activeDriver.isConnected) {
      await this.activeDriver.disconnect();
    }

    this.activeMode = newMode;
    const driver = this.activeDriver;
    this.bindDriver(driver);

    this.notifyStatus(driver.isConnected, driver.deviceName ?? undefined);
    this.notifyLog('INFO', `Modo de hardware alterado para: ${newMode === 'WEB_SERIAL' ? 'Arduino Físico (USB)' : 'Simulador Virtual'}`);
  }

  private bindDriver(driver: ISerialDriver): void {
    if (this.unsubActiveEvent) this.unsubActiveEvent();
    if (this.unsubActiveStatus) this.unsubActiveStatus();
    if (this.unsubActiveLog) this.unsubActiveLog();

    this.unsubActiveEvent = driver.addEventListener((evt: SerialEvent) => {
      this.notifyEvent(evt);
    });

    this.unsubActiveStatus = driver.addStatusListener((conn: boolean, name?: string) => {
      this.notifyStatus(conn, name);
    });

    if ('addLogListener' in driver) {
      this.unsubActiveLog = (driver as any).addLogListener((dir: 'TX' | 'RX' | 'INFO' | 'ERR', msg: string) => {
        this.notifyLog(dir, msg);
      });
    }
  }

  async connect(): Promise<boolean> {
    return this.activeDriver.connect();
  }

  async disconnect(): Promise<void> {
    return this.activeDriver.disconnect();
  }

  async send(command: SerialCommand | '!EMG'): Promise<void> {
    return this.activeDriver.send(command);
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
    this.eventListeners.forEach((fn) => {
      try {
        fn(event);
      } catch (e) {
        console.error('[HardwareManager] Erro no listener de eventos:', e);
      }
    });
  }

  private notifyStatus(connected: boolean, name?: string): void {
    this.statusListeners.forEach((fn) => {
      try {
        fn(connected, name);
      } catch (e) {
        console.error('[HardwareManager] Erro no listener de status:', e);
      }
    });
  }

  private notifyLog(direction: 'TX' | 'RX' | 'INFO' | 'ERR', message: string): void {
    this.logListeners.forEach((fn) => {
      try {
        fn(direction, message);
      } catch {}
    });
  }
}

export const hardwareManager = new HardwareManager();
