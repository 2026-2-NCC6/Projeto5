/**
 * Smart Tennis Arena — Web Serial API Driver (Arduino Uno / USB Serial Real)
 * Permite conexão física direta entre o navegador do Notebook e a placa Arduino via cabo USB.
 * Alinhado com: docs/spec/05-firmware-protocol.md e RF05 (Pareamento de Dispositivo)
 */

import {
  SerialCommand,
  SerialEvent,
  parseSerialFrame,
  serializeSerialCommand,
} from '../../../packages/shared/src/protocol/serial';
import {
  EventListener,
  ISerialDriver,
  StatusListener,
} from './serialInterface';

export type SerialLogListener = (direction: 'TX' | 'RX' | 'INFO' | 'ERR', message: string) => void;

export class WebSerialDriver implements ISerialDriver {
  public isConnected: boolean = false;
  public deviceName: string | null = null;

  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private keepReading: boolean = false;
  private readLoopPromise: Promise<void> | null = null;

  private eventListeners: Set<EventListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private logListeners: Set<SerialLogListener> = new Set();

  constructor() {
    this.setupHardwareDisconnectListener();
  }

  /**
   * Verifica se o navegador atual suporta a Web Serial API (Chrome, Edge, Opera, etc.)
   */
  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Solicita autorização ao usuário para abrir a porta USB do Arduino.
   */
  async connect(): Promise<boolean> {
    if (!WebSerialDriver.isSupported()) {
      const err = 'Seu navegador não suporta a Web Serial API. Utilize o Google Chrome, Microsoft Edge ou Opera no seu computador.';
      this.notifyLog('ERR', err);
      throw new Error(err);
    }

    try {
      this.notifyLog('INFO', 'Aguardando seleção da porta USB do Arduino...');
      
      // Solicita ao usuário a seleção da porta serial conectada ao Arduino
      // O filtro de USB pode incluir o VendorId do Arduino (0x2341) ou abrir lista geral
      const port = await (navigator as any).serial.requestPort();
      this.port = port;

      // Abre a porta serial na velocidade padrão configurada no firmware (115200 bps)
      await this.port.open({ baudRate: 115200 });

      this.isConnected = true;
      this.deviceName = 'Arduino Uno (Porta USB Serial Real)';
      this.keepReading = true;

      this.notifyStatus(true, this.deviceName);
      this.notifyLog('INFO', `Conectado com sucesso ao Arduino a 115200 baud.`);

      // Inicia loop de leitura contínua de linhas
      this.readLoopPromise = this.startReadLoop();

      // Envia comando PING inicial de handshake para verificar resposta PONG
      setTimeout(() => {
        this.send({ cmd: 'PING' }).catch(() => {});
      }, 500);

      return true;
    } catch (err: any) {
      this.isConnected = false;
      this.deviceName = null;
      this.notifyStatus(false);
      this.notifyLog('ERR', `Falha ao conectar: ${err?.message || err}`);
      return false;
    }
  }

  /**
   * Encerra a conexão serial com a porta USB de forma segura.
   */
  async disconnect(): Promise<void> {
    this.keepReading = false;

    try {
      if (this.reader) {
        await this.reader.cancel().catch(() => {});
        this.reader = null;
      }

      if (this.readLoopPromise) {
        await this.readLoopPromise.catch(() => {});
        this.readLoopPromise = null;
      }

      if (this.port) {
        await this.port.close().catch(() => {});
        this.port = null;
      }
    } catch (err: any) {
      this.notifyLog('ERR', `Erro ao fechar porta: ${err?.message || err}`);
    } finally {
      this.isConnected = false;
      this.deviceName = null;
      this.notifyStatus(false);
      this.notifyLog('INFO', 'Porta serial desconectada.');
    }
  }

  /**
   * Envia comando serial formatado para o firmware do Arduino.
   */
  async send(command: SerialCommand | '!EMG'): Promise<void> {
    if (!this.isConnected || !this.port || !this.port.writable) {
      this.notifyLog('ERR', 'Não é possível enviar comando: Arduino não conectado.');
      return;
    }

    const payload = serializeSerialCommand(command);
    this.notifyLog('TX', payload.trim());

    const encoder = new TextEncoder();
    const data = encoder.encode(payload);

    const writer = this.port.writable.getWriter();
    try {
      await writer.write(data);
    } catch (err: any) {
      this.notifyLog('ERR', `Erro de envio serial: ${err?.message || err}`);
    } finally {
      writer.releaseLock();
    }
  }

  /**
   * Loop contínuo assíncrono que processa bytes recebidos, segmenta por \n e parseia frames JSON.
   */
  private async startReadLoop(): Promise<void> {
    const textDecoder = new TextDecoder();
    let lineBuffer = '';

    while (this.port && this.port.readable && this.keepReading) {
      try {
        this.reader = this.port.readable.getReader();

        while (this.keepReading) {
          const { value, done } = await this.reader.read();
          if (done) break;

          if (value) {
            const chunk = textDecoder.decode(value, { stream: true });
            lineBuffer += chunk;

            // Extrai linhas completas delimitadas por newline
            const lines = lineBuffer.split(/\r?\n/);
            // O último elemento pode ser incompleto; mantém no buffer
            lineBuffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;

              this.notifyLog('RX', trimmedLine);

              const parsedEvent = parseSerialFrame(trimmedLine);
              if (parsedEvent) {
                this.notifyEvent(parsedEvent);
              } else {
                this.notifyLog('INFO', `Frame não reconhecido: ${trimmedLine}`);
              }
            }
          }
        }
      } catch (err: any) {
        if (this.keepReading) {
          this.notifyLog('ERR', `Erro na leitura serial: ${err?.message || err}`);
        }
      } finally {
        if (this.reader) {
          try {
            this.reader.releaseLock();
          } catch {}
          this.reader = null;
        }
      }
    }
  }

  /**
   * Detecta quando o cabo USB do Arduino for desconectado fisicamente do notebook.
   */
  private setupHardwareDisconnectListener(): void {
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      (navigator as any).serial.addEventListener('disconnect', (event: any) => {
        if (event.target === this.port) {
          this.notifyLog('ERR', 'Dispositivo USB desconectado fisicamente.');
          this.disconnect();
        }
      });
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
        console.error('[WebSerialDriver] Erro no listener de evento:', e);
      }
    });
  }

  private notifyStatus(connected: boolean, name?: string): void {
    this.statusListeners.forEach((fn) => {
      try {
        fn(connected, name);
      } catch (e) {
        console.error('[WebSerialDriver] Erro no listener de status:', e);
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

// Instância singleton para uso no ecossistema
export const webSerialDriver = new WebSerialDriver();
