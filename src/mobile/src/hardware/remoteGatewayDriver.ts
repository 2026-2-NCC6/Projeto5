/**
 * Smart Tennis Arena — Remote Gateway Driver
 * Driver para celular (ou navegador secundário) que se comunica com o Arduino
 * conectado fisicamente ao PC via WebSocket Gateway em tempo real.
 */

import {
  SerialCommand,
  SerialEvent,
  serializeSerialCommand,
} from '../../../packages/shared/src/protocol/serial';
import {
  EventListener,
  ISerialDriver,
  StatusListener,
} from './serialInterface';
import { SerialLogListener } from './webSerialDriver';
import { getWebSocketGatewayUrl } from './hostGatewayBridge';

export class RemoteGatewayDriver implements ISerialDriver {
  public isConnected: boolean = false;
  public deviceName: string | null = null;
  public isHostOnline: boolean = false;
  public piezoSensors: number[] = [250, 250, 250, 250, 250];

  private ws: WebSocket | null = null;
  private eventListeners: Set<EventListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private logListeners: Set<SerialLogListener> = new Set();

  async connect(): Promise<boolean> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return true;
    }

    const url = getWebSocketGatewayUrl();
    this.notifyLog('INFO', `Conectando ao Gateway da Arena em: ${url}...`);

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(url);

        const timeout = setTimeout(() => {
          if (!this.isConnected && !this.isHostOnline) {
            this.notifyLog('ERR', 'Tempo limite de conexão com o Gateway esgotado.');
            resolve(false);
          }
        }, 5000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.deviceName = 'Ponte PC Gateway (WebSocket)';
          this.notifyStatus(true, this.deviceName);
          this.notifyLog('INFO', 'Conexão WebSocket estabelecida com o servidor!');

          // Registra como controle remoto (celular)
          this.sendWsPayload({
            type: 'REGISTER',
            role: 'CONTROLLER',
          });

          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this.handleGatewayMessage(msg);
          } catch (e) {
            console.error('[RemoteGatewayDriver] Erro ao parsear mensagem:', e);
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.isHostOnline = false;
          this.deviceName = null;
          this.notifyStatus(false);
          this.notifyLog('INFO', 'Desconectado do Gateway WebSocket.');
        };

        this.ws.onerror = (err) => {
          this.notifyLog('ERR', 'Erro na conexão WebSocket com o Gateway.');
          resolve(false);
        };
      } catch (err: any) {
        this.notifyLog('ERR', `Falha ao iniciar WebSocket: ${err?.message || err}`);
        resolve(false);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.isConnected = false;
    this.isHostOnline = false;
    this.deviceName = null;
    this.notifyStatus(false);
  }

  async send(command: SerialCommand | '!EMG'): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.notifyLog('ERR', 'Não conectado ao Gateway WebSocket.');
      return;
    }

    const raw = typeof command === 'string' ? command : serializeSerialCommand(command).trim();
    this.notifyLog('TX', `[Celular -> PC] ${raw}`);

    this.sendWsPayload({
      type: 'SERIAL_COMMAND',
      command,
      raw,
    });
  }

  private sendWsPayload(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleGatewayMessage(msg: any): void {
    switch (msg.type) {
      case 'GATEWAY_STATE':
      case 'REGISTER_ACK': {
        const state = msg.state;
        if (!state) return;

        this.isHostOnline = Boolean(state.hostOnline);
        this.isConnected = true;
        if (state.isArduinoConnected) {
          this.deviceName = state.deviceName || 'Arduino Uno R3 (via PC)';
          if (Array.isArray(state.piezo)) this.piezoSensors = state.piezo;
          this.notifyStatus(true, this.deviceName ?? undefined);
          this.notifyLog('INFO', `✅ Conectado ao Arduino do PC: ${this.deviceName}`);
        } else if (state.hostOnline) {
          this.deviceName = 'Ponte PC Arena (Host Ativo)';
          this.notifyStatus(true, this.deviceName ?? undefined);
          this.notifyLog('INFO', '🟢 Conectado ao PC da Arena via WebSocket!');
        } else {
          this.deviceName = 'Ponte PC Gateway (WebSocket)';
          this.notifyStatus(true, this.deviceName);
          this.notifyLog('INFO', '🟢 Conectado ao Gateway WebSocket do PC (pronto para ponte).');
        }
        break;
      }

      case 'HARDWARE_STATUS': {
        if (msg.isConnected) {
          this.isConnected = true;
          this.deviceName = msg.deviceName || 'Arduino Uno R3 (via PC)';
          if (Array.isArray(msg.piezo)) this.piezoSensors = msg.piezo;
          this.notifyStatus(true, this.deviceName ?? undefined);
          this.notifyLog('INFO', `🟢 Arduino conectado no PC: ${this.deviceName}`);
        } else {
          this.isConnected = this.ws?.readyState === WebSocket.OPEN;
          this.deviceName = this.isConnected ? 'Ponte PC Gateway (WebSocket)' : null;
          this.notifyStatus(this.isConnected, this.deviceName ?? undefined);
          this.notifyLog('INFO', '⚠️ Cabo USB do Arduino desconectado no PC (Ponte WebSocket continua ativa).');
        }
        break;
      }

      case 'SERIAL_EVENT': {
        if (msg.event) {
          this.notifyEvent(msg.event);
          const raw = msg.raw || JSON.stringify(msg.event);
          this.notifyLog('RX', `[PC -> Celular] ${raw}`);

          if (msg.event.evt === 'READY' && Array.isArray(msg.event.piezo)) {
            this.piezoSensors = msg.event.piezo;
          }
        }
        break;
      }

      case 'GATEWAY_INFO': {
        this.notifyLog('INFO', msg.message || 'Comando recebido pelo Gateway.');
        break;
      }

      case 'GATEWAY_ERROR': {
        this.notifyLog('ERR', msg.message || 'Erro reportado pelo Gateway.');
        break;
      }

      default:
        break;
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
    this.eventListeners.forEach((fn) => {
      try {
        fn(event);
      } catch (e) {
        console.error('[RemoteGatewayDriver] Erro no listener de eventos:', e);
      }
    });
  }

  private notifyStatus(connected: boolean, name?: string): void {
    this.statusListeners.forEach((fn) => {
      try {
        fn(connected, name);
      } catch (e) {
        console.error('[RemoteGatewayDriver] Erro no listener de status:', e);
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

export const remoteGatewayDriver = new RemoteGatewayDriver();
