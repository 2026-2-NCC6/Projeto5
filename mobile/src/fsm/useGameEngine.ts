/**
 * Smart Tennis Arena — Game Engine & Mealy FSM
 * Alinhado com: docs/spec/01 (RN03/05/09) e docs/spec/03-state-machine-and-formal-model.md
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameState,
  SessionMetrics,
} from '../../../packages/shared/src/fsm/types';
import {
  SerialEvent,
  TargetId,
} from '../../../packages/shared/src/protocol/serial';
import {
  DrillDefinition,
  DEFAULT_DRILLS,
} from '../../../packages/shared/src/contracts/drills';
import { calculateHitScore } from '../../../packages/shared/src/rules/scoring';
import { ISerialDriver } from '../hardware/serialInterface';
import { mockSerialDriver } from '../hardware/mockSerialDriver';

export interface GameEngineState {
  gameState: GameState;
  selectedDrill: DrillDefinition;
  isKidsMode: boolean;
  currentStepIndex: number;
  activeTarget: TargetId | null;
  stepRemainingMs: number;
  stepTotalMs: number;
  ledCount: number; // 0..8
  countdownValue: number; // 3, 2, 1, 0
  score: number;
  streak: number;
  maxStreak: number;
  lastPointsAdded: number;
  lastHitTarget: TargetId | null;
  lastHitResult: 'HIT' | 'WRONG_HIT' | 'MISS' | null;
  metrics: SessionMetrics;
  isHardwareConnected: boolean;
  hardwareDeviceName: string | null;
  emergencyAlert: string | null;
}

export function useGameEngine(driver: ISerialDriver = mockSerialDriver) {
  const [selectedDrill, setSelectedDrill] = useState<DrillDefinition>(DEFAULT_DRILLS[0]);
  const [isKidsMode, setIsKidsMode] = useState<boolean>(true);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [isHardwareConnected, setIsHardwareConnected] = useState<boolean>(driver.isConnected);
  const [hardwareDeviceName, setHardwareDeviceName] = useState<string | null>(driver.deviceName);

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [activeTarget, setActiveTarget] = useState<TargetId | null>(null);
  const [stepRemainingMs, setStepRemainingMs] = useState<number>(0);
  const [stepTotalMs, setStepTotalMs] = useState<number>(0);
  const [ledCount, setLedCount] = useState<number>(8);
  const [countdownValue, setCountdownValue] = useState<number>(3);

  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [lastPointsAdded, setLastPointsAdded] = useState<number>(0);
  const [lastHitTarget, setLastHitTarget] = useState<TargetId | null>(null);
  const [lastHitResult, setLastHitResult] = useState<'HIT' | 'WRONG_HIT' | 'MISS' | null>(null);

  const [emergencyAlert, setEmergencyAlert] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<SessionMetrics>({
    score: 0,
    streak: 0,
    maxStreak: 0,
    hits: 0,
    misses: 0,
    wrongHits: 0,
    reactionTimes: [],
    averageReactionTimeMs: 0,
    hitsByTarget: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepStartTimeRef = useRef<number>(0);
  const stepDurationRef = useRef<number>(0);
  const currentStepIndexRef = useRef<number>(0);

  // Mantém referências atualizadas para callbacks assíncronos
  currentStepIndexRef.current = currentStepIndex;

  // 1. Ouvir status e eventos do hardware
  useEffect(() => {
    const unsubStatus = driver.addStatusListener((connected, name) => {
      setIsHardwareConnected(connected);
      setHardwareDeviceName(name ?? null);
      if (connected && gameState === GameState.CONNECTING) {
        setGameState(GameState.READY);
      } else if (!connected && gameState !== GameState.EMERGENCY_STOP) {
        setGameState(GameState.IDLE);
      }
    });

    const unsubEvents = driver.addEventListener((event: SerialEvent) => {
      handleSerialEvent(event);
    });

    return () => {
      unsubStatus();
      unsubEvents();
    };
  }, [driver, gameState]);

  // Limpa timers ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const connectHardware = useCallback(async () => {
    setGameState(GameState.CONNECTING);
    await driver.connect();
  }, [driver]);

  const disconnectHardware = useCallback(async () => {
    await driver.disconnect();
    setGameState(GameState.IDLE);
  }, [driver]);

  // Manipulação dos eventos seriais recebidos do hardware/simulador
  const handleSerialEvent = useCallback((event: SerialEvent) => {
    switch (event.evt) {
      case 'READY':
        setGameState(GameState.READY);
        break;

      case 'HIT':
        handleHitEvent(event.tgt, event.val, event.ts);
        break;

      case 'WRONG_HIT':
        handleWrongHitEvent(event.tgt, event.val);
        break;

      case 'MISS':
        handleMissEvent(event.tgt);
        break;

      case 'ESTOP_ALERT':
        handleEmergencyStop(event.src);
        break;
    }
  }, [gameState, activeTarget, stepRemainingMs, stepTotalMs, streak, isKidsMode, selectedDrill]);

  // Disparo incondicional de Parada Segura (RF22)
  const triggerEmergencyStop = useCallback(async () => {
    await driver.send('!EMG');
    handleEmergencyStop('MANUAL_APP_BUTTON');
  }, [driver]);

  const handleEmergencyStop = (source: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState(GameState.EMERGENCY_STOP);
    setEmergencyAlert(`PARADA DE SEGURANÇA ATIVADA (${source})`);
    setActiveTarget(null);
  };

  const resetEmergencyStop = useCallback(async () => {
    await driver.send({ cmd: 'RESET' });
    setEmergencyAlert(null);
    setGameState(driver.isConnected ? GameState.READY : GameState.IDLE);
  }, [driver]);

  // Início da sessão com contagem regressiva 3, 2, 1
  const startSession = useCallback(async () => {
    if (!driver.isConnected) {
      await driver.connect();
    }

    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCurrentStepIndex(0);
    setLastPointsAdded(0);
    setLastHitTarget(null);
    setLastHitResult(null);
    setMetrics({
      score: 0,
      streak: 0,
      maxStreak: 0,
      hits: 0,
      misses: 0,
      wrongHits: 0,
      reactionTimes: [],
      averageReactionTimeMs: 0,
      hitsByTarget: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });

    setGameState(GameState.COUNTDOWN);
    setCountdownValue(3);

    let count = 3;
    const countInterval = setInterval(() => {
      count -= 1;
      setCountdownValue(count);
      if (count <= 0) {
        clearInterval(countInterval);
        startStep(0);
      }
    }, 1000);
  }, [driver, selectedDrill, isKidsMode]);

  // Inicia um step de alvo específico
  const startStep = useCallback((stepIdx: number) => {
    if (stepIdx >= selectedDrill.steps.length) {
      completeSession();
      return;
    }

    const step = selectedDrill.steps[stepIdx];
    // Em Modo Kids, acrescenta tolerância temporal de +50% (RN09)
    const effectiveDuration = isKidsMode
      ? Math.round(step.durationMs * 1.5)
      : step.durationMs;

    setCurrentStepIndex(stepIdx);
    setActiveTarget(step.targetId);
    setStepTotalMs(effectiveDuration);
    setStepRemainingMs(effectiveDuration);
    setLedCount(8);
    setGameState(GameState.RUNNING_TARGET_ACTIVE);

    stepStartTimeRef.current = Date.now();
    stepDurationRef.current = effectiveDuration;

    // Notifica o hardware via comando START
    driver.send({
      cmd: 'START',
      tgt: step.targetId,
      time: effectiveDuration,
    });

    // Inicia timer de alta resolução local (atualiza LEDs e HUD a cada 50ms)
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - stepStartTimeRef.current;
      const remaining = Math.max(0, effectiveDuration - elapsed);

      setStepRemainingMs(remaining);

      // Decaimento do anel de 8 LEDs (RN04)
      const fraction = remaining / effectiveDuration;
      const leds = Math.ceil(fraction * 8);
      setLedCount(leds);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 50);
  }, [selectedDrill, isKidsMode, driver]);

  // Processa impacto com sucesso
  const handleHitEvent = (targetId: TargetId, adcFifo: number, timestamp: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const reactionTime = Date.now() - stepStartTimeRef.current;
    const elapsed = reactionTime;
    const remaining = Math.max(0, stepDurationRef.current - elapsed);

    const scoreResult = calculateHitScore({
      remainingMs: remaining,
      totalMs: stepDurationRef.current,
      streak,
      adcFifoValue: adcFifo,
      isCorrectTarget: true,
      isKidsMode,
    });

    const newScore = score + scoreResult.pointsAdded;
    const newStreak = scoreResult.newStreak;
    const newMaxStreak = Math.max(maxStreak, newStreak);

    setScore(newScore);
    setStreak(newStreak);
    setMaxStreak(newMaxStreak);
    setLastPointsAdded(scoreResult.pointsAdded);
    setLastHitTarget(targetId);
    setLastHitResult('HIT');
    setGameState(GameState.TARGET_HIT);

    setMetrics((prev) => {
      const hits = prev.hits + 1;
      const reactionTimes = [...prev.reactionTimes, reactionTime];
      const avgReaction = Math.round(
        reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
      );
      const hitsByTarget = {
        ...prev.hitsByTarget,
        [targetId]: (prev.hitsByTarget[targetId] || 0) + 1,
      };
      return {
        ...prev,
        score: newScore,
        streak: newStreak,
        maxStreak: newMaxStreak,
        hits,
        reactionTimes,
        averageReactionTimeMs: avgReaction,
        hitsByTarget,
      };
    });

    // Aguarda breve intervalo de celebração visual (600ms) e avança
    setTimeout(() => {
      advanceNextStep();
    }, 600);
  };

  // Processa impacto em alvo incorreto
  const handleWrongHitEvent = (targetId: TargetId, adcFifo: number) => {
    const scoreResult = calculateHitScore({
      remainingMs: stepRemainingMs,
      totalMs: stepDurationRef.current,
      streak,
      adcFifoValue: adcFifo,
      isCorrectTarget: false,
      isKidsMode,
    });

    setScore((prev) => Math.max(0, prev + scoreResult.pointsAdded));
    setStreak(0);
    setLastPointsAdded(scoreResult.pointsAdded);
    setLastHitTarget(targetId);
    setLastHitResult('WRONG_HIT');

    setMetrics((prev) => ({
      ...prev,
      wrongHits: prev.wrongHits + 1,
      streak: 0,
    }));
  };

  // Processa tempo esgotado sem acerto
  const handleMissEvent = (targetId: TargetId) => {
    if (timerRef.current) clearInterval(timerRef.current);

    setStreak(0);
    setLastPointsAdded(0);
    setLastHitTarget(targetId);
    setLastHitResult('MISS');
    setGameState(GameState.TARGET_MISS_TIMEOUT);

    setMetrics((prev) => ({
      ...prev,
      misses: prev.misses + 1,
      streak: 0,
    }));

    setTimeout(() => {
      advanceNextStep();
    }, 700);
  };

  const advanceNextStep = () => {
    const nextIdx = currentStepIndexRef.current + 1;
    if (nextIdx >= selectedDrill.steps.length) {
      completeSession();
    } else {
      startStep(nextIdx);
    }
  };

  const completeSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState(GameState.COMPLETED);
    setActiveTarget(null);
  };

  // Toque interativo na tela pelo usuário (simula impacto mecânico no sensor piezo)
  const tapTargetSimulated = useCallback((targetId: TargetId) => {
    if (mockSerialDriver) {
      mockSerialDriver.simulateHit(targetId);
    }
  }, []);

  return {
    state: {
      gameState,
      selectedDrill,
      isKidsMode,
      currentStepIndex,
      activeTarget,
      stepRemainingMs,
      stepTotalMs,
      ledCount,
      countdownValue,
      score,
      streak,
      maxStreak,
      lastPointsAdded,
      lastHitTarget,
      lastHitResult,
      metrics,
      isHardwareConnected,
      hardwareDeviceName,
      emergencyAlert,
    },
    actions: {
      setSelectedDrill,
      setIsKidsMode,
      connectHardware,
      disconnectHardware,
      startSession,
      triggerEmergencyStop,
      resetEmergencyStop,
      tapTargetSimulated,
    },
  };
}
