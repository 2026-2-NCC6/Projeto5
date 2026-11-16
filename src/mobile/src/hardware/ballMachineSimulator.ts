/**
 * Smart Tennis Arena — Adaptador & Simulador da Máquina Lançadora de Bolas Spinshot
 * Alinhado com: RF09 (Comandos da Máquina ou Simulador), Seção 1 (Spinshot Plus-2 / Player) e Seção 3
 */

import { TargetId } from '../../../packages/shared/src/protocol/serial';
import { DrillStep } from '../../../packages/shared/src/contracts/drills';

export interface SpinshotSettings {
  ballSpeedKmh: number;      // 30..135 km/h
  spin: number;              // -10 (backspin) .. +10 (topspin)
  spinType: 'FLAT' | 'TOPSPIN' | 'BACKSPIN';
  elevationDeg: number;      // 5..45 graus
  horizontalAngleDeg: number;// -25..+25 graus
  feedIntervalMs: number;    // intervalo de disparo (ms)
  oscillation: string;       // NONE | HORIZONTAL | VERTICAL | RANDOM
}

export interface ShotEvent {
  id: string;
  timestamp: number;
  stepNumber: number;
  targetId: TargetId;
  settings: SpinshotSettings;
  trajectoryDescription: string;
  estimatedFlightMs: number;
}

export type ShotListener = (shot: ShotEvent) => void;

class BallMachineSimulator {
  private listeners: Set<ShotListener> = new Set();
  private lastShot: ShotEvent | null = null;
  private isFeedingActive: boolean = false;

  public subscribe(listener: ShotListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public get currentLastShot(): ShotEvent | null {
    return this.lastShot;
  }

  public get isFeeding(): boolean {
    return this.isFeedingActive;
  }

  /**
   * Converte parâmetros da etapa do treino em comandos operacionais da máquina Spinshot
   */
  public executeShotForStep(step: DrillStep, isKidsMode: boolean = false): ShotEvent {
    // Aplica limites de segurança (em Modo Kids, velocidade limitada a 65 km/h conforme RF09/Seção 5)
    let speed = step.ballSpeedKmh ?? (isKidsMode ? 40 : 85);
    if (isKidsMode && speed > 65) {
      speed = 65;
    }

    const spin = step.spinIntensity ?? (step.spinType === 'TOPSPIN' ? 4 : step.spinType === 'BACKSPIN' ? -4 : 0);
    const spinType = step.spinType ?? (spin > 0 ? 'TOPSPIN' : spin < 0 ? 'BACKSPIN' : 'FLAT');
    const elevation = step.elevationDeg ?? (isKidsMode ? 22 : 16);
    const angle = step.horizontalAngleDeg ?? (step.targetId === 1 || step.targetId === 3 ? -12 : step.targetId === 2 || step.targetId === 4 ? 12 : 0);
    const feedInterval = step.feedIntervalMs ?? 1000;
    const oscillation = step.oscillationMode ?? 'NONE';

    // Estimativa de tempo de voo da bola da máquina até a zona do alvo (baseada na velocidade da bola)
    // Distância aproximada de quadra = 12 metros
    const speedMs = (speed * 1000) / 3600;
    const estimatedFlightMs = Math.round((12 / Math.max(10, speedMs)) * 1000);

    const spinText = spin > 0 ? `Topspin +${spin}` : spin < 0 ? `Backspin ${spin}` : 'Bola Flat';
    const dirText = angle < -5 ? 'Cruzada Esquerda' : angle > 5 ? 'Paralela Direita' : 'Centro Quadra';
    const trajectoryDescription = `${speed} km/h • ${spinText} • Elevação ${elevation}° • Direção: ${dirText}`;

    const shot: ShotEvent = {
      id: `shot-${Date.now()}-${step.stepNumber}`,
      timestamp: Date.now(),
      stepNumber: step.stepNumber,
      targetId: step.targetId,
      settings: {
        ballSpeedKmh: speed,
        spin,
        spinType,
        elevationDeg: elevation,
        horizontalAngleDeg: angle,
        feedIntervalMs: feedInterval,
        oscillation,
      },
      trajectoryDescription,
      estimatedFlightMs,
    };

    this.lastShot = shot;
    this.isFeedingActive = true;
    this.notifyShot(shot);

    return shot;
  }

  public stopFeeding(): void {
    this.isFeedingActive = false;
  }

  private notifyShot(shot: ShotEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(shot);
      } catch (e) {
        console.error('[BallMachineSimulator] Erro no listener:', e);
      }
    });
  }
}

export const ballMachineSimulator = new BallMachineSimulator();

