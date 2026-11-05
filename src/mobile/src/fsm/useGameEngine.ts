/**
 * Smart Tennis Arena — Game Engine & Mealy FSM Aprimorada
 * Implementa RF06 (Pausar/Retomar/Encerrar), RF07/08, RF09 (Spinshot), RF10 (Séries e Metas) e RF22 (Parada Segura)
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
import { hardwareManager } from '../hardware/hardwareManager';
import { ballMachineSimulator, ShotEvent } from '../hardware/ballMachineSimulator';
import { SessionTelemetryEvent } from '../../../packages/shared/src/contracts/sessions';

export interface ZoneAnalytics {
  attempts: Record<TargetId, number>;
  hits: Record<TargetId, number>;
  avgReactionMs: Record<TargetId, number>;
}

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
  zoneAnalytics: ZoneAnalytics;
  hasCompletedSession: boolean;
  isHardwareConnected: boolean;
  hardwareDeviceName: string | null;
  emergencyAlert: string | null;
  lastMachineShot: ShotEvent | null;
  currentSeries: number;
  totalSeries: number;
  goalsMet: boolean;
  telemetryLog: SessionTelemetryEvent[];
}

const EMPTY_ZONE_MAP = (): Record<TargetId, number> => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

export function useGameEngine(driver: ISerialDriver = hardwareManager) {
  const [selectedDrill, setSelectedDrill] = useState<DrillDefinition>(
    DEFAULT_DRILLS[1] || DEFAULT_DRILLS[0]
  );
  const [isKidsMode, setIsKidsMode] = useState<boolean>(false);
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
  const [hasCompletedSession, setHasCompletedSession] = useState<boolean>(false);

  const [emergencyAlert, setEmergencyAlert] = useState<string | null>(null);
  const [lastMachineShot, setLastMachineShot] = useState<ShotEvent | null>(null);
  const [currentSeries, setCurrentSeries] = useState<number>(1);
  const [telemetryLog, setTelemetryLog] = useState<SessionTelemetryEvent[]>([]);

  const [metrics, setMetrics] = useState<SessionMetrics>({
    score: 0,
    streak: 0,
    maxStreak: 0,
    hits: 0,
    misses: 0,
    wrongHits: 0,
    reactionTimes: [],
    averageReactionTimeMs: 0,
    hitsByTarget: EMPTY_ZONE_MAP(),
  });

  const [zoneAnalytics, setZoneAnalytics] = useState<ZoneAnalytics>({
    attempts: EMPTY_ZONE_MAP(),
    hits: EMPTY_ZONE_MAP(),
    avgReactionMs: EMPTY_ZONE_MAP(),
  });

  const zoneReactionListRef = useRef<Record<TargetId, number[]>>({
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  });

  const timerRef = useRef<any>(null);
  const stepStartTimeRef = useRef<number>(0);
  const stepDurationRef = useRef<number>(0);
  const pausedTimeRemainingRef = useRef<number>(0);
  const currentStepIndexRef = useRef<number>(0);
  const sessionStartTimeRef = useRef<number>(0);
  const telemetryCounterRef = useRef<number>(0);

  currentStepIndexRef.current = currentStepIndex;

  const totalSeries = selectedDrill.scoringRules?.seriesCount ?? 1;
  const targetScoreGoal = selectedDrill.scoringRules?.targetScoreGoal ?? 1000;
  const minAccuracyPercent = selectedDrill.scoringRules?.minAccuracyPercent ?? 60;

  const currentAttempts = metrics.hits + metrics.misses + metrics.wrongHits;
  const currentAccuracy = currentAttempts > 0 ? (metrics.hits / currentAttempts) * 100 : 0;
  const goalsMet = score >= targetScoreGoal && currentAccuracy >= minAccuracyPercent;

  // Registrar evento na linha do tempo de telemetria ISO 8601 (RF07, RF19)
  const appendTelemetry = useCallback((
    type: SessionTelemetryEvent['eventType'],
    details?: Partial<SessionTelemetryEvent>
  ) => {
    telemetryCounterRef.current += 1;
    const item: SessionTelemetryEvent = {
      eventIndex: telemetryCounterRef.current,
      eventType: type,
      stepNumber: currentStepIndexRef.current + 1,
      targetId: activeTarget,
      occurredAt: new Date().toISOString(),
      deviceTimestampMs: Date.now() - sessionStartTimeRef.current,
      ...details,
    };
    setTelemetryLog((prev) => [...prev.slice(-199), item]);
  }, [activeTarget]);

  // Listener de conexões e eventos de hardware
  useEffect(() => {
    const unsubStatus = driver.addStatusListener((connected, name) => {
      setIsHardwareConnected(connected);
      setHardwareDeviceName(name ?? null);

      // Tratamento de perda de conexão no meio da partida (RF22)
      if (!connected && (gameState === GameState.RUNNING_TARGET_ACTIVE || gameState === GameState.PAUSED)) {
        if (timerRef.current) clearInterval(timerRef.current);
        ballMachineSimulator.stopFeeding();
        setGameState(GameState.EMERGENCY_STOP);
        setEmergencyAlert('FALHA DE COMUNICAÇÃO: Dispositivo IoT desconectado durante a sessão ativa.');
        appendTelemetry('SENSOR_FAULT', {
          metadata: { reason: 'DESCONEXAO_FISICA_INADVERTIDA' },
        });
      }
    });

    const unsubEvents = driver.addEventListener((event: SerialEvent) => {
      handleSerialEvent(event);
    });

    const unsubShot = ballMachineSimulator.subscribe((shot) => {
      setLastMachineShot(shot);
      appendTelemetry('MACHINE_SHOT', {
        targetId: shot.targetId,
        metadata: shot.settings as any,
      });
    });

    return () => {
      unsubStatus();
      unsubEvents();
      unsubShot();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [driver, gameState, appendTelemetry]);

  const handleSerialEvent = useCallback(
    (event: SerialEvent) => {
      switch (event.evt) {
        case 'HIT':
          handleHitEvent(event.tgt, event.val, event.ts);
          break;

        case 'WRONG_HIT':
          handleWrongHitEvent(event.tgt, event.val, event.expected);
          break;

        case 'MISS':
          handleMissEvent(event.tgt);
          break;

        case 'ESTOP_ALERT':
          handleEmergencyStop(event.src);
          break;

        case 'BALL_SHOT':
          break;
      }
    },
    [gameState, activeTarget, stepRemainingMs, stepTotalMs, streak, isKidsMode, selectedDrill, score, maxStreak]
  );

  // Parada Segura (RF22)
  const triggerEmergencyStop = useCallback(async (customReason?: string) => {
    await driver.send('!EMG');
    ballMachineSimulator.stopFeeding();
    handleEmergencyStop(customReason || 'MANUAL_APP_BUTTON');
  }, [driver]);

  const handleEmergencyStop = (source: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    ballMachineSimulator.stopFeeding();
    setGameState(GameState.EMERGENCY_STOP);
    setEmergencyAlert(`PARADA DE SEGURANÇA ATIVADA (${source})`);
    setActiveTarget(null);
    appendTelemetry('ESTOP', {
      metadata: { source },
    });
  };

  const resetEmergencyStop = useCallback(async () => {
    await driver.send({ cmd: 'RESET' });
    setEmergencyAlert(null);
    setGameState(GameState.IDLE);
  }, [driver]);

  // Controles de Pausar e Retomar Sessão (RF06)
  const pauseSession = useCallback(async () => {
    if (gameState !== GameState.RUNNING_TARGET_ACTIVE) return;
    if (timerRef.current) clearInterval(timerRef.current);
    ballMachineSimulator.stopFeeding();

    const elapsed = Date.now() - stepStartTimeRef.current;
    const remaining = Math.max(0, stepDurationRef.current - elapsed);
    pausedTimeRemainingRef.current = remaining;

    setGameState(GameState.PAUSED);
    await driver.send({ cmd: 'PAUSE' });
    appendTelemetry('PAUSE', { reactionTimeMs: remaining });
  }, [gameState, driver, appendTelemetry]);

  const resumeSession = useCallback(async () => {
    if (gameState !== GameState.PAUSED) return;

    const remaining = pausedTimeRemainingRef.current > 0 ? pausedTimeRemainingRef.current : 1500;
    stepStartTimeRef.current = Date.now();
    stepDurationRef.current = remaining;

    setGameState(GameState.RUNNING_TARGET_ACTIVE);
    await driver.send({ cmd: 'RESUME' });
    appendTelemetry('RESUME');

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - stepStartTimeRef.current;
      const rem = Math.max(0, remaining - elapsed);

      setStepRemainingMs(rem);
      const fraction = rem / remaining;
      setLedCount(Math.ceil(fraction * 8));

      if (rem <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 50);
  }, [gameState, driver, appendTelemetry]);

  const abortSession = useCallback(async (reason: string = 'DESISTENCIA_USUARIO') => {
    if (timerRef.current) clearInterval(timerRef.current);
    ballMachineSimulator.stopFeeding();
    await driver.send({ cmd: 'RESET' });
    setGameState(GameState.IDLE);
    setActiveTarget(null);
    appendTelemetry('SESSION_END', { metadata: { status: 'ABORTED', reason } });
  }, [driver, appendTelemetry]);

  // Início da sessão com contagem regressiva 3, 2, 1
  const startSession = useCallback(async () => {
    if (!driver.isConnected) {
      await driver.connect();
    }

    sessionStartTimeRef.current = Date.now();
    telemetryCounterRef.current = 0;
    setTelemetryLog([]);

    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCurrentStepIndex(0);
    setCurrentSeries(1);
    setLastPointsAdded(0);
    setLastHitTarget(null);
    setLastHitResult(null);
    zoneReactionListRef.current = { 1: [], 2: [], 3: [], 4: [], 5: [] };

    setMetrics({
      score: 0,
      streak: 0,
      maxStreak: 0,
      hits: 0,
      misses: 0,
      wrongHits: 0,
      reactionTimes: [],
      averageReactionTimeMs: 0,
      hitsByTarget: EMPTY_ZONE_MAP(),
    });

    setZoneAnalytics({
      attempts: EMPTY_ZONE_MAP(),
      hits: EMPTY_ZONE_MAP(),
      avgReactionMs: EMPTY_ZONE_MAP(),
    });

    setGameState(GameState.COUNTDOWN);
    setCountdownValue(3);
    appendTelemetry('SESSION_START', { metadata: { drillId: selectedDrill.id, isKidsMode } });

    let count = 3;
    const countInterval = setInterval(() => {
      count -= 1;
      setCountdownValue(count);
      if (count <= 0) {
        clearInterval(countInterval);
        startStep(0);
      }
    }, 850);
  }, [driver, selectedDrill, isKidsMode, appendTelemetry]);

  // Inicia um step de alvo específico com máquina de bolas Spinshot (RF09)
  const startStep = useCallback(
    (stepIdx: number) => {
      if (stepIdx >= selectedDrill.steps.length) {
        if (currentSeries < totalSeries) {
          setCurrentSeries((prev) => prev + 1);
          startStep(0);
          return;
        }
        completeSession();
        return;
      }

      const step = selectedDrill.steps[stepIdx];
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

      // Aciona o simulador Spinshot
      ballMachineSimulator.executeShotForStep(step, isKidsMode);

      driver.send({
        cmd: 'START',
        tgt: step.targetId,
        time: effectiveDuration,
      });

      appendTelemetry('STEP_START', {
        targetId: step.targetId,
        stepNumber: stepIdx + 1,
      });

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - stepStartTimeRef.current;
        const remaining = Math.max(0, effectiveDuration - elapsed);

        setStepRemainingMs(remaining);

        const fraction = remaining / effectiveDuration;
        const leds = Math.ceil(fraction * 8);
        setLedCount(leds);

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 50);
    },
    [selectedDrill, isKidsMode, driver, currentSeries, totalSeries, appendTelemetry]
  );

  // Processa impacto com sucesso
  const handleHitEvent = (targetId: TargetId, adcFifo: number, _timestamp: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const reactionTime = Math.max(80, Date.now() - stepStartTimeRef.current);
    const remaining = Math.max(0, stepDurationRef.current - reactionTime);

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

    appendTelemetry('HIT', {
      targetId,
      adcValue: adcFifo,
      reactionTimeMs: reactionTime,
      pointsAwarded: scoreResult.pointsAdded,
    });

    const zoneReactions = [...(zoneReactionListRef.current[targetId] || []), reactionTime];
    zoneReactionListRef.current[targetId] = zoneReactions;
    const zoneAvg = Math.round(
      zoneReactions.reduce((a, b) => a + b, 0) / zoneReactions.length
    );

    setZoneAnalytics((prev) => ({
      attempts: { ...prev.attempts, [targetId]: (prev.attempts[targetId] || 0) + 1 },
      hits: { ...prev.hits, [targetId]: (prev.hits[targetId] || 0) + 1 },
      avgReactionMs: { ...prev.avgReactionMs, [targetId]: zoneAvg },
    }));

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

    setTimeout(() => {
      advanceNextStep();
    }, 520);
  };

  // Processa impacto em alvo incorreto
  const handleWrongHitEvent = (targetId: TargetId, adcFifo: number, expected: TargetId) => {
    const scoreResult = calculateHitScore({
      remainingMs: stepRemainingMs,
      totalMs: stepDurationRef.current,
      streak,
      adcFifoValue: adcFifo,
      isCorrectTarget: false,
      isKidsMode,
    });

    const updatedScore = Math.max(0, score + scoreResult.pointsAdded);
    setScore(updatedScore);
    setStreak(0);
    setLastPointsAdded(scoreResult.pointsAdded);
    setLastHitTarget(targetId);
    setLastHitResult('WRONG_HIT');

    appendTelemetry('WRONG_HIT', {
      targetId,
      expectedTargetId: expected || activeTarget,
      adcValue: adcFifo,
      pointsAwarded: scoreResult.pointsAdded,
    });

    if (activeTarget) {
      setZoneAnalytics((prev) => ({
        ...prev,
        attempts: {
          ...prev.attempts,
          [activeTarget]: (prev.attempts[activeTarget] || 0) + 1,
        },
      }));
    }

    setMetrics((prev) => ({
      ...prev,
      score: updatedScore,
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

    appendTelemetry('MISS', {
      targetId,
      pointsAwarded: 0,
    });

    setZoneAnalytics((prev) => ({
      ...prev,
      attempts: { ...prev.attempts, [targetId]: (prev.attempts[targetId] || 0) + 1 },
    }));

    setMetrics((prev) => ({
      ...prev,
      misses: prev.misses + 1,
      streak: 0,
    }));

    setTimeout(() => {
      advanceNextStep();
    }, 600);
  };

  const advanceNextStep = () => {
    const nextIdx = currentStepIndexRef.current + 1;
    if (nextIdx >= selectedDrill.steps.length) {
      if (currentSeries < totalSeries) {
        setCurrentSeries((prev) => prev + 1);
        startStep(0);
      } else {
        completeSession();
      }
    } else {
      startStep(nextIdx);
    }
  };

  const completeSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    ballMachineSimulator.stopFeeding();
    setGameState(GameState.COMPLETED);
    setHasCompletedSession(true);
    setActiveTarget(null);
    appendTelemetry('SESSION_END', { metadata: { status: 'COMPLETED', score } });
  };

  const tapTargetSimulated = useCallback((targetId: TargetId) => {
    if (hardwareManager.mode === 'MOCK') {
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
      zoneAnalytics,
      hasCompletedSession,
      isHardwareConnected,
      hardwareDeviceName,
      emergencyAlert,
      lastMachineShot,
      currentSeries,
      totalSeries,
      goalsMet,
      telemetryLog,
    },
    actions: {
      setSelectedDrill,
      setIsKidsMode,
      connectHardware: () => driver.connect(),
      disconnectHardware: () => driver.disconnect(),
      startSession,
      pauseSession,
      resumeSession,
      abortSession,
      triggerEmergencyStop,
      resetEmergencyStop,
      tapTargetSimulated,
    },
  };
}
