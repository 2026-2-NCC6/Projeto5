/**
<<<<<<< HEAD
 * Smart Tennis Arena — Game Engine & Mealy FSM
 * Alinhado com: RF06 (Iniciar, Pausar, Retomar, Encerrar), RF09 (Máquina/Simulador),
 * RF10 (Pontuação), RF11 (Kids/Pro), RF19 (Envio de Resultados), RF21 (Operação Offline), RF22 (Parada Segura)
=======
 * Smart Tennis Arena — Game Engine & Mealy FSM Aprimorada
 * Implementa RF06 (Pausar/Retomar/Encerrar), RF07/08, RF09 (Spinshot), RF10 (Séries e Metas) e RF22 (Parada Segura)
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
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
import {
  SessionEventLogItem,
  SessionCompletionStatus,
} from '../../../packages/shared/src/contracts/user';
import { calculateHitScore } from '../../../packages/shared/src/rules/scoring';
import { ISerialDriver } from '../hardware/serialInterface';
import { mockSerialDriver } from '../hardware/mockSerialDriver';
import { hardwareManager } from '../hardware/hardwareManager';
<<<<<<< HEAD
import { api } from '../services/api';
=======
import { ballMachineSimulator, ShotEvent } from '../hardware/ballMachineSimulator';
import { SessionTelemetryEvent } from '../../../packages/shared/src/contracts/sessions';
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

export interface ZoneAnalytics {
  attempts: Record<TargetId, number>;
  hits: Record<TargetId, number>;
  avgReactionMs: Record<TargetId, number>;
}

export type SessionSyncStatus = 'IDLE' | 'SYNCING' | 'SYNCED' | 'OFFLINE_QUEUED';

export interface GameEngineState {
  gameState: GameState;
  selectedDrill: DrillDefinition;
  isKidsMode: boolean;
  currentStepIndex: number;
  activeTarget: TargetId | null;
  stepRemainingMs: number;
  stepTotalMs: number;
  currentBallSpeedKmh: number;
  currentSpinType: 'FLAT' | 'TOPSPIN' | 'BACKSPIN';
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
  sessionEvents: SessionEventLogItem[];
  hasCompletedSession: boolean;
  syncStatus: SessionSyncStatus;
  offlinePendingCount: number;
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

export function useGameEngine(
  driver: ISerialDriver = hardwareManager,
  athleteName: string = 'Praticante Convidado'
) {
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
  const [currentBallSpeedKmh, setCurrentBallSpeedKmh] = useState<number>(85);
  const [currentSpinType, setCurrentSpinType] = useState<'FLAT' | 'TOPSPIN' | 'BACKSPIN'>('FLAT');
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
<<<<<<< HEAD
  const [sessionEvents, setSessionEvents] = useState<SessionEventLogItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<SessionSyncStatus>('IDLE');
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(
    () => api.getOfflinePendingSessions().length
  );
=======
  const [lastMachineShot, setLastMachineShot] = useState<ShotEvent | null>(null);
  const [currentSeries, setCurrentSeries] = useState<number>(1);
  const [telemetryLog, setTelemetryLog] = useState<SessionTelemetryEvent[]>([]);
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

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

<<<<<<< HEAD
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
=======
  const timerRef = useRef<any>(null);
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
  const stepStartTimeRef = useRef<number>(0);
  const stepDurationRef = useRef<number>(0);
  const pausedTimeRemainingRef = useRef<number>(0);
  const currentStepIndexRef = useRef<number>(0);
<<<<<<< HEAD
  const sessionStartIsoRef = useRef<string>(new Date().toISOString());
  const sessionEventsRef = useRef<SessionEventLogItem[]>([]);
  const metricsRef = useRef<SessionMetrics>(metrics);
  const zoneAnalyticsRef = useRef<ZoneAnalytics>(zoneAnalytics);
=======
  const sessionStartTimeRef = useRef<number>(0);
  const telemetryCounterRef = useRef<number>(0);
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

  currentStepIndexRef.current = currentStepIndex;
  metricsRef.current = metrics;
  zoneAnalyticsRef.current = zoneAnalytics;

<<<<<<< HEAD
  // Auto-conecta o simulador virtual ao abrir o app para UX imediata
  useEffect(() => {
    if (hardwareManager.mode === 'MOCK' && !driver.isConnected) {
      driver.connect().catch(() => {});
    }
    // Tenta descarregar fila offline ao iniciar
    api.flushOfflineSessions().then(({ remainingCount }) => {
      setOfflinePendingCount(remainingCount);
    }).catch(() => {});
  }, [driver]);
=======
  const totalSeries = selectedDrill.scoringRules?.seriesCount ?? 1;
  const targetScoreGoal = selectedDrill.scoringRules?.targetScoreGoal ?? 1000;
  const minAccuracyPercent = selectedDrill.scoringRules?.minAccuracyPercent ?? 60;
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

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
<<<<<<< HEAD
    };
  }, [
    driver,
    gameState,
    activeTarget,
    stepRemainingMs,
    stepTotalMs,
    streak,
    isKidsMode,
    selectedDrill,
    score,
    maxStreak,
  ]);

  // Limpa timers ao desmontar
  useEffect(() => {
    return () => {
=======
      unsubShot();
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [driver, gameState, appendTelemetry]);

<<<<<<< HEAD
  const connectHardware = useCallback(async () => {
    setGameState(GameState.CONNECTING);
    await driver.connect();
  }, [driver]);

  const disconnectHardware = useCallback(async () => {
    await driver.disconnect();
    setGameState(GameState.IDLE);
  }, [driver]);

  // Sincroniza sessão concluída/interrompida com a API ou fila offline (RF19, RF21)
  const syncSessionResult = useCallback(
    async (
      completionStatus: SessionCompletionStatus,
      finalMetrics: SessionMetrics,
      finalZones: ZoneAnalytics,
      eventsList: SessionEventLogItem[]
    ) => {
      const totalAttempts =
        finalMetrics.hits + finalMetrics.misses + finalMetrics.wrongHits;
      const accuracyPct =
        totalAttempts > 0
          ? Math.round((finalMetrics.hits / totalAttempts) * 100)
          : 0;
      const nowIso = new Date().toISOString();
      const durationSec = Math.max(
        1,
        Math.round(
          (new Date(nowIso).getTime() -
            new Date(sessionStartIsoRef.current).getTime()) /
            1000
        )
      );

      setSyncStatus('SYNCING');
      const sessionUuid = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const { syncState } = await api.submitSession({
        sessionUuid,
        athleteName,
        drillId: selectedDrill.id,
        drillTitle: selectedDrill.title,
        drillVersion: selectedDrill.version || '1.0.0',
        isKidsMode,
        status: completionStatus,
        score: finalMetrics.score,
        maxStreak: finalMetrics.maxStreak,
        hits: finalMetrics.hits,
        misses: finalMetrics.misses,
        wrongHits: finalMetrics.wrongHits,
        accuracyPct,
        averageReactionTimeMs: finalMetrics.averageReactionTimeMs || 0,
        durationSec,
        hardwareMode: hardwareManager.mode,
        zoneAnalytics: finalZones,
        eventsTelemetry: eventsList,
        telemetryAuthorized: !isKidsMode, // Coleta mínima LGPD automática para crianças
        startedAt: sessionStartIsoRef.current,
        completedAt: nowIso,
      });

      setSyncStatus(syncState);
      setOfflinePendingCount(api.getOfflinePendingSessions().length);
    },
    [athleteName, selectedDrill, isKidsMode]
  );

  const retryOfflineSync = useCallback(async () => {
    setSyncStatus('SYNCING');
    const { remainingCount } = await api.flushOfflineSessions();
    setOfflinePendingCount(remainingCount);
    setSyncStatus(remainingCount === 0 ? 'SYNCED' : 'OFFLINE_QUEUED');
  }, []);

  // Manipulação dos eventos seriais recebidos do hardware/simulador
=======
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
  const handleSerialEvent = useCallback(
    (event: SerialEvent) => {
      // Se a sessão estiver PAUSADA, ignora leituras de alvo até retomar (RF06)
      if (
        gameState === GameState.PAUSED &&
        (event.evt === 'HIT' || event.evt === 'WRONG_HIT' || event.evt === 'MISS')
      ) {
        return;
      }

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
    [
      gameState,
      activeTarget,
      stepRemainingMs,
      stepTotalMs,
      streak,
      isKidsMode,
      selectedDrill,
      score,
      maxStreak,
    ]
  );

  // Parada Segura (RF22)
  const triggerEmergencyStop = useCallback(async (customReason?: string) => {
    await driver.send('!EMG');
    ballMachineSimulator.stopFeeding();
    handleEmergencyStop(customReason || 'MANUAL_APP_BUTTON');
  }, [driver]);

  const handleEmergencyStop = (source: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
<<<<<<< HEAD
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    const wasRunning =
      gameState === GameState.RUNNING_TARGET_ACTIVE ||
      gameState === GameState.PAUSED ||
      gameState === GameState.COUNTDOWN;

    setGameState(GameState.EMERGENCY_STOP);
    setEmergencyAlert(`PARADA DE SEGURANÇA ATIVADA (${source})`);
    setActiveTarget(null);

    api.logCriticalEvent(
      'EMERGENCY_STOP_EMG',
      `Parada segura acionada via ${source} durante treino "${selectedDrill.title}"`,
      athleteName
    );

    if (wasRunning) {
      const estopEvt: SessionEventLogItem = {
        stepNumber: currentStepIndexRef.current + 1,
        targetId: activeTarget || 1,
        result: 'ESTOP',
        pointsDelta: 0,
        ballSpeedKmh: currentBallSpeedKmh,
        spinType: currentSpinType,
        timestamp: new Date().toISOString(),
      };
      const updatedEvents = [...sessionEventsRef.current, estopEvt];
      sessionEventsRef.current = updatedEvents;
      setSessionEvents(updatedEvents);

      syncSessionResult(
        'EMERGENCY_STOP',
        metricsRef.current,
        zoneAnalyticsRef.current,
        updatedEvents
      );
    }
=======
    ballMachineSimulator.stopFeeding();
    setGameState(GameState.EMERGENCY_STOP);
    setEmergencyAlert(`PARADA DE SEGURANÇA ATIVADA (${source})`);
    setActiveTarget(null);
    appendTelemetry('ESTOP', {
      metadata: { source },
    });
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
  };

  const resetEmergencyStop = useCallback(async () => {
    await driver.send({ cmd: 'RESET' });
    setEmergencyAlert(null);
    setGameState(GameState.IDLE);
  }, [driver]);

<<<<<<< HEAD
  // Pausar sessão em andamento (RF06)
  const pauseSession = useCallback(async () => {
    if (gameState !== GameState.RUNNING_TARGET_ACTIVE) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setGameState(GameState.PAUSED);
    await driver.send({ cmd: 'DISPLAY', val: 'PAUS' });
    await driver.send({ cmd: 'SET_LEDS', tgt: 0, mask: 0 });
  }, [gameState, driver]);

  // Retomar sessão pausada (RF06)
  const resumeSession = useCallback(async () => {
    if (gameState !== GameState.PAUSED || !activeTarget) return;

    const remainingToResume = Math.max(600, stepRemainingMs);
    setGameState(GameState.RUNNING_TARGET_ACTIVE);
    stepStartTimeRef.current = Date.now();
    stepDurationRef.current = remainingToResume;

    await driver.send({
      cmd: 'START',
      tgt: activeTarget,
      time: remainingToResume,
    });
=======
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
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - stepStartTimeRef.current;
<<<<<<< HEAD
      const remaining = Math.max(0, remainingToResume - elapsed);
      setStepRemainingMs(remaining);

      const fraction = stepTotalMs > 0 ? remaining / stepTotalMs : 0;
      setLedCount(Math.ceil(fraction * 8));

      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
      }
    }, 50);
  }, [gameState, activeTarget, stepRemainingMs, stepTotalMs, driver]);

  // Encerrar / Abortar sessão manualmente (RF06)
  const abortSession = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    await driver.send({ cmd: 'RESET' });
    setActiveTarget(null);
    setHasCompletedSession(true);
    setGameState(GameState.COMPLETED);

    syncSessionResult(
      'ABORTED',
      metricsRef.current,
      zoneAnalyticsRef.current,
      sessionEventsRef.current
    );
  }, [driver, syncSessionResult]);
=======
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
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

  // Início da sessão com contagem regressiva 3, 2, 1
  const startSession = useCallback(async () => {
    if (!driver.isConnected) {
      await driver.connect();
    }

<<<<<<< HEAD
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
=======
    sessionStartTimeRef.current = Date.now();
    telemetryCounterRef.current = 0;
    setTelemetryLog([]);
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCurrentStepIndex(0);
    setCurrentSeries(1);
    setLastPointsAdded(0);
    setLastHitTarget(null);
    setLastHitResult(null);
    setSyncStatus('IDLE');
    sessionStartIsoRef.current = new Date().toISOString();
    sessionEventsRef.current = [];
    setSessionEvents([]);
    zoneReactionListRef.current = { 1: [], 2: [], 3: [], 4: [], 5: [] };

    const freshMetrics: SessionMetrics = {
      score: 0,
      streak: 0,
      maxStreak: 0,
      hits: 0,
      misses: 0,
      wrongHits: 0,
      reactionTimes: [],
      averageReactionTimeMs: 0,
      hitsByTarget: EMPTY_ZONE_MAP(),
    };
    const freshZones: ZoneAnalytics = {
      attempts: EMPTY_ZONE_MAP(),
      hits: EMPTY_ZONE_MAP(),
      avgReactionMs: EMPTY_ZONE_MAP(),
    };

    setMetrics(freshMetrics);
    metricsRef.current = freshMetrics;
    setZoneAnalytics(freshZones);
    zoneAnalyticsRef.current = freshZones;

    setGameState(GameState.COUNTDOWN);
    setCountdownValue(3);
    appendTelemetry('SESSION_START', { metadata: { drillId: selectedDrill.id, isKidsMode } });

    let count = 3;
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      setCountdownValue(count);
      if (count <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        startStep(0);
      }
    }, 850);
  }, [driver, selectedDrill, isKidsMode, appendTelemetry]);

<<<<<<< HEAD
  // Inicia um step de alvo específico + comando de máquina/simulador (RF09)
=======
  // Inicia um step de alvo específico com máquina de bolas Spinshot (RF09)
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
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

      const speedKmh = step.ballSpeedKmh || (isKidsMode ? 45 : 90);
      const spin = step.spinType || 'FLAT';

      setCurrentStepIndex(stepIdx);
      setActiveTarget(step.targetId);
      setStepTotalMs(effectiveDuration);
      setStepRemainingMs(effectiveDuration);
      setCurrentBallSpeedKmh(speedKmh);
      setCurrentSpinType(spin);
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

<<<<<<< HEAD
    const hitLogItem: SessionEventLogItem = {
      stepNumber: currentStepIndexRef.current + 1,
      targetId,
      result: 'HIT',
      reactionTimeMs: reactionTime,
      adcForce: adcFifo,
      pointsDelta: scoreResult.pointsAdded,
      ballSpeedKmh: currentBallSpeedKmh,
      spinType: currentSpinType,
      timestamp: new Date().toISOString(),
    };
    const nextEvents = [...sessionEventsRef.current, hitLogItem];
    sessionEventsRef.current = nextEvents;
    setSessionEvents(nextEvents);
=======
    appendTelemetry('HIT', {
      targetId,
      adcValue: adcFifo,
      reactionTimeMs: reactionTime,
      pointsAwarded: scoreResult.pointsAdded,
    });
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

    const zoneReactions = [...(zoneReactionListRef.current[targetId] || []), reactionTime];
    zoneReactionListRef.current[targetId] = zoneReactions;
    const zoneAvg = Math.round(
      zoneReactions.reduce((a, b) => a + b, 0) / zoneReactions.length
    );

    const updatedZones: ZoneAnalytics = {
      attempts: {
        ...zoneAnalyticsRef.current.attempts,
        [targetId]: (zoneAnalyticsRef.current.attempts[targetId] || 0) + 1,
      },
      hits: {
        ...zoneAnalyticsRef.current.hits,
        [targetId]: (zoneAnalyticsRef.current.hits[targetId] || 0) + 1,
      },
      avgReactionMs: {
        ...zoneAnalyticsRef.current.avgReactionMs,
        [targetId]: zoneAvg,
      },
    };
    zoneAnalyticsRef.current = updatedZones;
    setZoneAnalytics(updatedZones);

    const prev = metricsRef.current;
    const hits = prev.hits + 1;
    const reactionTimes = [...prev.reactionTimes, reactionTime];
    const avgReaction = Math.round(
      reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
    );
    const hitsByTarget = {
      ...prev.hitsByTarget,
      [targetId]: (prev.hitsByTarget[targetId] || 0) + 1,
    };
    const updatedMetrics: SessionMetrics = {
      ...prev,
      score: newScore,
      streak: newStreak,
      maxStreak: newMaxStreak,
      hits,
      reactionTimes,
      averageReactionTimeMs: avgReaction,
      hitsByTarget,
    };
    metricsRef.current = updatedMetrics;
    setMetrics(updatedMetrics);

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

<<<<<<< HEAD
    const wrongLogItem: SessionEventLogItem = {
      stepNumber: currentStepIndexRef.current + 1,
      targetId,
      result: 'WRONG_HIT',
      adcForce: adcFifo,
      pointsDelta: scoreResult.pointsAdded,
      ballSpeedKmh: currentBallSpeedKmh,
      spinType: currentSpinType,
      timestamp: new Date().toISOString(),
    };
    const nextEvents = [...sessionEventsRef.current, wrongLogItem];
    sessionEventsRef.current = nextEvents;
    setSessionEvents(nextEvents);
=======
    appendTelemetry('WRONG_HIT', {
      targetId,
      expectedTargetId: expected || activeTarget,
      adcValue: adcFifo,
      pointsAwarded: scoreResult.pointsAdded,
    });
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

    if (activeTarget) {
      const updatedZones: ZoneAnalytics = {
        ...zoneAnalyticsRef.current,
        attempts: {
          ...zoneAnalyticsRef.current.attempts,
          [activeTarget]: (zoneAnalyticsRef.current.attempts[activeTarget] || 0) + 1,
        },
      };
      zoneAnalyticsRef.current = updatedZones;
      setZoneAnalytics(updatedZones);
    }

    const updatedMetrics: SessionMetrics = {
      ...metricsRef.current,
      score: updatedScore,
      wrongHits: metricsRef.current.wrongHits + 1,
      streak: 0,
    };
    metricsRef.current = updatedMetrics;
    setMetrics(updatedMetrics);
  };

  // Processa tempo esgotado sem acerto
  const handleMissEvent = (targetId: TargetId) => {
    if (timerRef.current) clearInterval(timerRef.current);

    setStreak(0);
    setLastPointsAdded(0);
    setLastHitTarget(targetId);
    setLastHitResult('MISS');
    setGameState(GameState.TARGET_MISS_TIMEOUT);

<<<<<<< HEAD
    const missLogItem: SessionEventLogItem = {
      stepNumber: currentStepIndexRef.current + 1,
      targetId,
      result: 'MISS',
      pointsDelta: 0,
      ballSpeedKmh: currentBallSpeedKmh,
      spinType: currentSpinType,
      timestamp: new Date().toISOString(),
    };
    const nextEvents = [...sessionEventsRef.current, missLogItem];
    sessionEventsRef.current = nextEvents;
    setSessionEvents(nextEvents);
=======
    appendTelemetry('MISS', {
      targetId,
      pointsAwarded: 0,
    });

    setZoneAnalytics((prev) => ({
      ...prev,
      attempts: { ...prev.attempts, [targetId]: (prev.attempts[targetId] || 0) + 1 },
    }));
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

    const updatedZones: ZoneAnalytics = {
      ...zoneAnalyticsRef.current,
      attempts: {
        ...zoneAnalyticsRef.current.attempts,
        [targetId]: (zoneAnalyticsRef.current.attempts[targetId] || 0) + 1,
      },
    };
    zoneAnalyticsRef.current = updatedZones;
    setZoneAnalytics(updatedZones);

    const updatedMetrics: SessionMetrics = {
      ...metricsRef.current,
      misses: metricsRef.current.misses + 1,
      streak: 0,
    };
    metricsRef.current = updatedMetrics;
    setMetrics(updatedMetrics);

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
<<<<<<< HEAD

    syncSessionResult(
      'COMPLETED',
      metricsRef.current,
      zoneAnalyticsRef.current,
      sessionEventsRef.current
    );
=======
    appendTelemetry('SESSION_END', { metadata: { status: 'COMPLETED', score } });
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
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
      currentBallSpeedKmh,
      currentSpinType,
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
      sessionEvents,
      hasCompletedSession,
      syncStatus,
      offlinePendingCount,
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
      retryOfflineSync,
    },
  };
}
