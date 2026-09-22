/**
 * Smart Tennis Arena — Protocolo Serial e Enquadramento de Mensagens
 * Alinhado com: docs/spec/03-state-machine-and-formal-model.md e docs/spec/05-firmware-protocol.md
 */

export type TargetId = 1 | 2 | 3 | 4 | 5;

// ==========================================
// UPLINK: Firmware -> Host
// ==========================================

export interface HitEvent {
  evt: 'HIT';
  tgt: TargetId;
  val: number; // 0..1023 (ADC)
  ts: number;  // monotonic timestamp (ms)
}

export interface WrongHitEvent {
  evt: 'WRONG_HIT';
  tgt: TargetId;
  val: number;
  expected: TargetId;
  ts: number;
}

export interface MissEvent {
  evt: 'MISS';
  tgt: TargetId;
  ts: number;
}

export interface ReadyEvent {
  evt: 'READY';
  hw: string;
  fw: string;
  piezo?: number[];
}

export interface PongEvent {
  evt: 'PONG';
  ts: number;
}

export interface EStopAlertEvent {
  evt: 'ESTOP_ALERT';
  src: string;
  ts?: number;
}

export type SerialEvent =
  | HitEvent
  | WrongHitEvent
  | MissEvent
  | ReadyEvent
  | PongEvent
  | EStopAlertEvent;

// ==========================================
// DOWNLINK: Host -> Firmware
// ==========================================

export interface StartCommand {
  cmd: 'START';
  tgt: TargetId;
  time: number; // ms
}

export interface SetLedsCommand {
  cmd: 'SET_LEDS';
  tgt: TargetId | 0; // 0 = all
  mask: number;      // 0..255
}

export interface DisplayCommand {
  cmd: 'DISPLAY';
  val: string; // 4 chars e.g. "0042", "PAUS", "----"
}

export interface BuzzCommand {
  cmd: 'BUZZ';
  freq: number; // Hz
  dur: number;  // ms
}

export interface EStopCommand {
  cmd: 'ESTOP';
}

export interface ResetCommand {
  cmd: 'RESET';
}

export interface PingCommand {
  cmd: 'PING';
}

export interface CalibCommand {
  cmd: 'CALIB';
  thresh: [number, number, number, number, number];
}

export type SerialCommand =
  | StartCommand
  | SetLedsCommand
  | DisplayCommand
  | BuzzCommand
  | EStopCommand
  | ResetCommand
  | PingCommand
  | CalibCommand;

// ==========================================
// Regexes Formais (Conforme Secção 6 do Modelo Formal)
// ==========================================
export const HIT_REGEX = /^\{"evt":"HIT","tgt":([1-5]),"val":([0-9]{1,4}),"ts":([0-9]{1,10})\}$/;
export const MISS_REGEX = /^\{"evt":"MISS","tgt":([1-5]),"ts":([0-9]{1,10})\}$/;
export const ESTOP_REGEX = /^(!EMG|\{"cmd":"ESTOP"\}|\{"evt":"ESTOP_ALERT".*\})$/;
export const START_REGEX = /^\{"cmd":"START","tgt":([1-5]),"time":([0-9]{2,5})\}$/;

/**
 * Parser de quadros seriais recebidos com validação estrita.
 */
export function parseSerialFrame(rawLine: string): SerialEvent | null {
  const line = rawLine.trim();
  if (!line) return null;

  // Comando prioritário de emergência
  if (line === '!EMG' || line.includes('"ESTOP_ALERT"')) {
    return {
      evt: 'ESTOP_ALERT',
      src: line === '!EMG' ? 'RAW_EMG' : 'ALERT_FRAME',
    };
  }

  try {
    const parsed = JSON.parse(line);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.evt !== 'string') {
      return null;
    }

    switch (parsed.evt) {
      case 'HIT':
        if (parsed.tgt >= 1 && parsed.tgt <= 5 && typeof parsed.val === 'number' && typeof parsed.ts === 'number') {
          return {
            evt: 'HIT',
            tgt: parsed.tgt as TargetId,
            val: parsed.val,
            ts: parsed.ts,
          };
        }
        return null;

      case 'WRONG_HIT':
        if (parsed.tgt >= 1 && parsed.tgt <= 5 && typeof parsed.val === 'number' && typeof parsed.ts === 'number') {
          return {
            evt: 'WRONG_HIT',
            tgt: parsed.tgt as TargetId,
            val: parsed.val,
            expected: parsed.expected as TargetId,
            ts: parsed.ts,
          };
        }
        return null;

      case 'MISS':
        if (parsed.tgt >= 1 && parsed.tgt <= 5 && typeof parsed.ts === 'number') {
          return {
            evt: 'MISS',
            tgt: parsed.tgt as TargetId,
            ts: parsed.ts,
          };
        }
        return null;

      case 'READY':
        return {
          evt: 'READY',
          hw: String(parsed.hw || 'STA-HW'),
          fw: String(parsed.fw || '1.0.0'),
          piezo: Array.isArray(parsed.piezo) ? parsed.piezo : undefined,
        };

      case 'PONG':
        return {
          evt: 'PONG',
          ts: Number(parsed.ts || 0),
        };

      case 'ESTOP_ALERT':
        return {
          evt: 'ESTOP_ALERT',
          src: String(parsed.src || 'UNKNOWN'),
          ts: typeof parsed.ts === 'number' ? parsed.ts : undefined,
        };

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Serializa comandos para envio na porta UART, finalizando com \n.
 */
export function serializeSerialCommand(cmd: SerialCommand | '!EMG'): string {
  if (cmd === '!EMG') {
    return '!EMG\n';
  }
  return JSON.stringify(cmd) + '\n';
}
