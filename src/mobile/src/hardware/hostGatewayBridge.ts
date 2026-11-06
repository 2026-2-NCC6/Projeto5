/**
 * Smart Tennis Arena — Host Gateway Bridge
 * Roda no Navegador do PC quando o Arduino está conectado via Web Serial USB.
 * Conecta-se ao WebSocket do Backend como 'HOST' e transmite eventos de sensores
 * para os celulares conectados, além de repassar comandos vindos do celular para o cabo USB.
 */

import { SerialCommand, SerialEvent } from '../../../packages/shared/src/protocol/serial';
import { API_BASE_URL } from '../services/api';

export function getWebSocketGatewayUrl(): string {
  const base = API_BASE_URL.replace(/\/api(\/v\d+)?$/, '');
  const wsProto = base.startsWith('https') ? 'wss:' : 'ws:';
  const cleanHost = base.replace(/^https?:/, '');
  return `${wsProto}${cleanHost}/ws/hardware`;
}

export class HostGatewayBridge {
  private ws: WebSocket | null = null;
  private isConnectedToGateway: boolean = false;
  private onCommandReceivedCallback: ((cmd: SerialCommand | '!EMG') => void) | null = null;
  private statusListeners: Set<(connected: boolean, controllerCount: number) => void> = new Set();
  private controllerCount: number = 0;
  private reconnectTimer: any = null;

  public get isConnected(): boolean {
    return this.isConnectedToGateway;
  }

  public get controllers(): number {
    return this.controllerCount;
  }

  public setCommandHandler(handler: (cmd: SerialCommand | '!EMG') => void): void {
    this.onCommandReceivedCallback = handler;
  }

  public addStatusListener(listener: (connected: boolean, controllerCount: number) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.isConnectedToGateway, this.controllerCount);
    return () => this.statusListeners.delete(listener);
  }

  private notifyStatus(): void {
    this.statusListeners.forEach((fn) => {
      try {
        fn(this.isConnectedToGateway, this.controllerCount);
      } catch {}
    });
  }

  /**
   * Conecta ao WebSocket do Backend como HOST
   */
  public connect(arduinoConnected: boolean, deviceName: string | null, piezo?: number[]): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      // Já conectado ou conectando; apenas atualiza o status de hardware
      this.sendHardwareStatus(arduinoConnected, deviceName, piezo);
      return;
    }

    try {
      const url = getWebSocketGatewayUrl();
      console.log('[HostGatewayBridge] Conectando ao gateway WebSocket:', url);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[HostGatewayBridge] Conectado ao Gateway como HOST.');
        this.isConnectedToGateway = true;
        this.send({
          type: 'REGISTER',
          role: 'HOST',
        });
        this.sendHardwareStatus(arduinoConnected, deviceName, piezo);
        this.notifyStatus();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('[HostGatewayBridge] Erro ao parsear mensagem do Gateway:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[HostGatewayBridge] Conexão com Gateway encerrada.');
        this.isConnectedToGateway = false;
        this.notifyStatus();
      };

      this.ws.onerror = (err) => {
        console.warn('[HostGatewayBridge] Erro no WebSocket do Gateway:', err);
      };
    } catch (e) {
      console.error('[HostGatewayBridge] Falha ao iniciar WebSocket:', e);
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.isConnectedToGateway = false;
    this.notifyStatus();
  }

  public sendHardwareStatus(isConnected: boolean, deviceName: string | null, piezo?: number[]): void {
    this.send({
      type: 'HARDWARE_STATUS',
      isConnected,
      deviceName,
      piezo: piezo || [250, 250, 250, 250, 250],
    });
  }

  public broadcastSerialEvent(event: SerialEvent, raw?: string): void {
    this.send({
      type: 'SERIAL_EVENT',
      event,
      raw,
    });
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(msg: any): void {
    switch (msg.type) {
      case 'SERIAL_COMMAND':
        if (msg.command && this.onCommandReceivedCallback) {
          console.log('[HostGatewayBridge] Comando recebido do Celular -> Repassando ao Arduino USB:', msg.command);
          this.onCommandReceivedCallback(msg.command);
        }
        break;

      case 'CONTROLLER_COUNT_UPDATED':
      case 'GATEWAY_STATE':
        if (typeof msg.count === 'number') {
          this.controllerCount = msg.count;
        } else if (msg.state && typeof msg.state.controllerCount === 'number') {
          this.controllerCount = msg.state.controllerCount;
        }
        this.notifyStatus();
        break;

      default:
        break;
    }
  }
}

export const hostGatewayBridge = new HostGatewayBridge();

