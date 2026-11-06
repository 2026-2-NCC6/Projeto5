/**
 * Smart Tennis Arena — Hardware WebSocket Gateway
 * Permite ponte bidirecional em tempo real entre o Navegador do PC (com Arduino USB)
 * e o Aplicativo Mobile rodando no Celular (ou múltiplos clientes).
 */

import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface HardwareGatewayState {
  hostOnline: boolean;
  isArduinoConnected: boolean;
  deviceName: string | null;
  piezo: number[];
  controllerCount: number;
  lastEvent: any | null;
}

class HardwareGateway {
  private wss: WebSocketServer | null = null;
  private hostSocket: WebSocket | null = null;
  private controllerSockets: Set<WebSocket> = new Set();

  private state: HardwareGatewayState = {
    hostOnline: false,
    isArduinoConnected: false,
    deviceName: null,
    piezo: [250, 250, 250, 250, 250],
    controllerCount: 0,
    lastEvent: null,
  };

  public init(server: HttpServer): void {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const pathname = request.url?.split('?')[0];
      if (pathname === '/ws/hardware' || pathname === '/ws') {
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          this.wss!.emit('connection', ws, request);
        });
      }
    });

    this.wss.on('connection', (ws: WebSocket) => {
      let registeredRole: 'HOST' | 'CONTROLLER' | null = null;

      // Envia o estado atual imediatamente na conexão
      this.sendToSocket(ws, {
        type: 'GATEWAY_STATE',
        state: this.getState(),
      });

      ws.on('message', (data: string | Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message, (role) => {
            registeredRole = role;
          });
        } catch (err) {
          console.error('[HardwareGateway] Erro ao processar mensagem JSON:', err);
        }
      });

      ws.on('close', () => {
        if (registeredRole === 'HOST' || ws === this.hostSocket) {
          console.log('[HardwareGateway] PC Host (Arduino USB) desconectou.');
          this.hostSocket = null;
          this.state.hostOnline = false;
          this.state.isArduinoConnected = false;
          this.state.deviceName = null;
          this.broadcastToControllers({
            type: 'GATEWAY_STATE',
            state: this.getState(),
          });
        } else if (registeredRole === 'CONTROLLER') {
          this.controllerSockets.delete(ws);
          this.state.controllerCount = this.controllerSockets.size;
          console.log(`[HardwareGateway] Celular desconectou. Total de celulares: ${this.state.controllerCount}`);
          if (this.hostSocket) {
            this.sendToSocket(this.hostSocket, {
              type: 'CONTROLLER_COUNT_UPDATED',
              count: this.state.controllerCount,
            });
          }
        }
      });

      ws.on('error', (err) => {
        console.error('[HardwareGateway] Erro no socket do cliente:', err.message);
      });
    });

    console.log('📡 Hardware Gateway WebSocket ativo em /ws/hardware e /ws');
  }

  private handleMessage(
    ws: WebSocket,
    msg: any,
    setRole: (role: 'HOST' | 'CONTROLLER') => void
  ): void {
    switch (msg.type) {
      case 'REGISTER': {
        const role = msg.role;
        if (role === 'HOST') {
          this.hostSocket = ws;
          this.state.hostOnline = true;
          setRole('HOST');
          console.log('[HardwareGateway] PC Host registrado como transmissor USB do Arduino.');
          this.broadcastToControllers({
            type: 'GATEWAY_STATE',
            state: this.getState(),
          });
        } else {
          this.controllerSockets.add(ws);
          this.state.controllerCount = this.controllerSockets.size;
          setRole('CONTROLLER');
          console.log(`[HardwareGateway] Celular registrado como controle remoto. Total: ${this.state.controllerCount}`);
          // Confirma registro e envia estado atual
          this.sendToSocket(ws, {
            type: 'REGISTER_ACK',
            role: 'CONTROLLER',
            state: this.getState(),
          });
          if (this.hostSocket) {
            this.sendToSocket(this.hostSocket, {
              type: 'CONTROLLER_COUNT_UPDATED',
              count: this.state.controllerCount,
            });
          }
        }
        break;
      }

      case 'HARDWARE_STATUS': {
        // Recebido do HOST quando o Arduino conecta ou desconecta fisicamente
        this.state.isArduinoConnected = Boolean(msg.isConnected);
        this.state.deviceName = msg.deviceName || (msg.isConnected ? 'Arduino Uno R3 (via Host)' : null);
        if (Array.isArray(msg.piezo)) {
          this.state.piezo = msg.piezo;
        }

        this.broadcastToControllers({
          type: 'HARDWARE_STATUS',
          isConnected: this.state.isArduinoConnected,
          deviceName: this.state.deviceName,
          piezo: this.state.piezo,
        });
        break;
      }

      case 'SERIAL_EVENT': {
        // Recebido do HOST (impacto piezo, READY, etc.) -> Repassa a todos os celulares
        this.state.lastEvent = msg.event;
        this.broadcastToControllers({
          type: 'SERIAL_EVENT',
          event: msg.event,
          raw: msg.raw,
        });
        break;
      }

      case 'SERIAL_COMMAND': {
        // Recebido do Celular -> Envia para o HOST repassar ao cabo USB do Arduino
        if (this.hostSocket && this.hostSocket.readyState === WebSocket.OPEN) {
          this.sendToSocket(this.hostSocket, {
            type: 'SERIAL_COMMAND',
            command: msg.command,
            raw: msg.raw,
            from: 'CONTROLLER',
          });
        } else {
          // Host não está online
          this.sendToSocket(ws, {
            type: 'GATEWAY_ERROR',
            message: 'O PC com Arduino USB não está conectado ao gateway.',
          });
        }
        break;
      }

      case 'DRILL_ACTION': {
        // Sincronização de treino (Start, Pause, Resume, Stop) entre Celular e PC
        this.broadcastAllExcept(ws, {
          type: 'DRILL_ACTION',
          action: msg.action,
          payload: msg.payload,
        });
        break;
      }

      case 'PING': {
        this.sendToSocket(ws, { type: 'PONG', timestamp: Date.now() });
        break;
      }

      default:
        break;
    }
  }

  private sendToSocket(ws: WebSocket, payload: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  private broadcastToControllers(payload: any): void {
    const raw = JSON.stringify(payload);
    for (const client of this.controllerSockets) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  }

  private broadcastAllExcept(sender: WebSocket, payload: any): void {
    const raw = JSON.stringify(payload);
    if (this.hostSocket && this.hostSocket !== sender && this.hostSocket.readyState === WebSocket.OPEN) {
      this.hostSocket.send(raw);
    }
    for (const client of this.controllerSockets) {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  }

  public getState(): HardwareGatewayState {
    return {
      ...this.state,
      controllerCount: this.controllerSockets.size,
    };
  }
}

export const hardwareGateway = new HardwareGateway();

