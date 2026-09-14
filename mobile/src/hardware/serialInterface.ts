/**
 * Smart Tennis Arena — Interface Abstrata do Driver Serial
 * Alinhado com: docs/spec/02-architecture-and-diagrams.md e docs/spec/05-firmware-protocol.md
 */

import { SerialCommand, SerialEvent } from '../../../packages/shared/src/protocol/serial';

export type EventListener = (event: SerialEvent) => void;
export type StatusListener = (connected: boolean, deviceName?: string) => void;

export interface ISerialDriver {
  isConnected: boolean;
  deviceName: string | null;

  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  send(command: SerialCommand | '!EMG'): Promise<void>;

  addEventListener(listener: EventListener): () => void;
  addStatusListener(listener: StatusListener): () => void;
}
