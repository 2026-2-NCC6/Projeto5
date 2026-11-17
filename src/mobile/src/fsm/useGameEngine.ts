/**
 * Smart Tennis Arena — Game Engine & Mealy FSM Integrada
 * Alinhado com: RF06 (Iniciar, Pausar, Retomar, Encerrar), RF07/08 (Sensores e Atuadores),
 * RF09 (Máquina/Simulador Spinshot), RF10 (Pontuação, Séries e Metas), RF11 (Kids/Pro),
 * RF19 (Envio de Resultados), RF21 (Operação Offline) e RF22 (Parada Segura)
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
  PlayerProfile,
} from '../../../packages/shared/src/contracts/user';
import {
  MotherPlatformSyncReceipt,
  SessionTelemetryEvent,
} from '../../../packages/shared/src/contracts/sessions';
import { calculateHitScore } from '../../../packages/shared/src/rules/scoring';
import { ISerialDriver } from '../hardware/serialInterface';
import { mockSerialDriver } from '../hardware/mockSerialDriver';
import { remoteGatewayDriver } from '../hardware/remoteGatewayDriver';
import { hardwareManager } from '../hardware/hardwareManager';
import { ballMachineSimulator, ShotEvent } from '../hardware/ballMachineSimulator';
import { api } from '../services/api';

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
  motherPlatformReceipt: MotherPlatformSyncReceipt | null;
  evolutionDeltaScore: number | null;
  apiRecommendations: string[];
  telemetryAuthorized: boolean;
}

const EMPTY_ZONE_MAP = (): Record<TargetId, number> => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

export function useGameEngine(
  driver: ISerialDriver = hardwareManager,
  athleteName: string = 'Praticante Convidado',
  userProfile?: PlayerProfile | null
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
  const [sessionEvents, setSessionEvents] = useState<SessionEventLogItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<SessionSyncStatus>('IDLE');
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(
    () => api.getOfflinePendingSessions().length
  );
  const [lastMachineShot, setLastMachineShot] = useState<ShotEvent | null>(null);
  const [currentSeries, setCurrentSeries] = useState<number>(1);
  const [telemetryLog, setTelemetryLog] = useState<SessionTelemetryEvent[]>([]);
  const [motherPlatformReceipt, setMotherPlatformReceipt] =
    useState<MotherPlatformSyncReceipt | null>(null);
  const [evolutionDeltaScore, setEvolutionDeltaScore] = useState<number | null>(null);
  const [apiRecommendations, setApiRecommendations] = useState<string[]>([]);

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

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepStartTimeRef = useRef<number>(0);
  const stepDurationRef = useRef<number>(0);
  const pausedTimeRemainingRef = useRef<number>(0);
  const currentStepIndexRef = useRef<number>(0);
  const currentSeriesRef = useRef<number>(1);
  const gameStateRef = useRef<GameState>(GameState.IDLE);
  const activeTargetRef = useRef<TargetId | null>(null);
  const handleMissEventRef = useRef<(targetId: TargetId) => void>(() => {});
  const advanceNextStepRef = useRef<() => void>(() => {});
  const sessionStartIsoRef = useRef<string>(new Date().toISOString());
  const sessionStartTimeRef = useRef<number>(0);
  const telemetryCounterRef = useRef<number>(0);
  const sessionEventsRef = useRef<SessionEventLogItem[]>([]);
  const telemetryLogRef = useRef<SessionTelemetryEvent[]>([]);
  const stopReasonRef = useRef<string | null>(null);
  const metricsRef = useRef<SessionMetrics>(metrics);
  const zoneAnalyticsRef = useRef<ZoneAnalytics>(zoneAnalytics);

  currentStepIndexRef.current = currentStepIndex;
  currentSeriesRef.current = currentSeries;
  gameStateRef.current = gameState;
  activeTargetRef.current = activeTarget;
  metricsRef.current = metrics;
  zoneAnalyticsRef.current = zoneAnalytics;

  const updateGameState = useCallback((next: GameState) => {
    gameStateRef.current = next;
    setGameState(next);
  }, []);

  const clearAllEngineTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    if (missFallbackTimerRef.current) {
      clearTimeout(missFallbackTimerRef.current);
      missFallbackTimerRef.current = null;
    }
  }, []);

  const totalSeries = selectedDrill.scoringRules?.seriesCount ?? 1;
  const targetScoreGoal = selectedDrill.scoringRules?.targetScoreGoal ?? 1000;
  const minAccuracyPercent = selectedDrill.scoringRules?.minAccuracyPercent ?? 60;

  const isMinor = isKidsMode || userProfile?.ageGroup === 'KIDS';
  const telemetryAuthorized = isMinor
    ? Boolean(userProfile?.telemetryConsent && userProfile?.guardianConsent)
    : userProfile?.telemetryConsent !== undefined
      ? Boolean(userProfile.telemetryConsent)
      : true;

  const currentAttempts = metrics.hits + metrics.misses + metrics.wrongHits;
  const currentAccuracy = currentAttempts > 0 ? (metrics.hits / currentAttempts) * 100 : 0;
  const goalsMet = score >= targetScoreGoal && currentAccuracy >= minAccuracyPercent;

  // Auto-conecta o simulador virtual ao abrir o app para UX imediata
  useEffect(() => {
    if (hardwareManager.mode === 'MOCK' && !driver.isConnected) {
      driver.connect().catch(() => {});
    }
    api
      .flushOfflineSessions()
      .then(({ remainingCount }) => {
        setOfflinePendingCount(remainingCount);
      })
      .catch(() => {});
  }, [driver]);

  // Registrar evento na linha do tempo de telemetria ISO 8601 (RF07, RF19)
  const appendTelemetry = useCallback(
    (type: SessionTelemetryEvent['eventType'], details?: Partial<SessionTelemetryEvent>) => {
      telemetryCounterRef.current += 1;
      const item: SessionTelemetryEvent = {
        eventIndex: telemetryCounterRef.current,
        eventType: type,
        stepNumber: currentStepIndexRef.current + 1,
        targetId: activeTargetRef.current,
        occurredAt: new Date().toISOString(),
        deviceTimestampMs: Date.now() - sessionStartTimeRef.current,
        ...details,
      };
      const nextTelemetry = [...telemetryLogRef.current.slice(-199), item];
      telemetryLogRef.current = nextTelemetry;
      setTelemetryLog(nextTelemetry);
    },
    []
  );

  // Sincroniza sessão concluída/interrompida com a API ou fila offline (RF19, RF21)
  const syncSessionResult = useCallback(
    async (
      completionStatus: SessionCompletionStatus,
      finalMetrics: SessionMetrics,
      finalZones: ZoneAnalytics,
      eventsList: SessionEventLogItem[]
    ) => {
      const totalAtt =
        finalMetrics.hits + finalMetrics.misses + finalMetrics.wrongHits;
      const accuracyPct =
        totalAtt > 0
          ? Math.round((finalMetrics.hits / totalAtt) * 100)
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

      const submitRes = await api.submitSession({
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
        events: telemetryLogRef.current,
        stopReason: stopReasonRef.current,
        goalsMet:
          finalMetrics.score >= targetScoreGoal && accuracyPct >= minAccuracyPercent,
        telemetryAuthorized,
        startedAt: sessionStartIsoRef.current,
        completedAt: nowIso,
      });

      setSyncStatus(submitRes.syncState);
      setMotherPlatformReceipt(submitRes.motherPlatformReceipt);
      setEvolutionDeltaScore(submitRes.evolutionDeltaScore);
      setApiRecommendations(submitRes.recommendations);
      setOfflinePendingCount(api.getOfflinePendingSessions().length);
    },
    [
      athleteName,
      selectedDrill,
      isKidsMode,
      telemetryAuthorized,
      targetScoreGoal,
      minAccuracyPercent,
    ]
  );

  const retryOfflineSync = useCallback(async () => {
    setSyncStatus('SYNCING');
    const { remainingCount } = await api.flushOfflineSessions();
    setOfflinePendingCount(remainingCount);
    setSyncStatus(remainingCount === 0 ? 'SYNCED' : 'OFFLINE_QUEUED');
  }, []);

  // Listener de conexões e eventos de hardware
  useEffect(() => {
    const unsubStatus = driver.addStatusListener((connected, name) => {
      setIsHardwareConnected(connected);
      setHardwareDeviceName(name ?? null);

      if (!connected && (gameState === GameState.RUNNING_TARGET_ACTIVE || gameState === GameState.PAUSED)) {
        clearAllEngineTimers();
        ballMachineSimulator.stopFeeding();
        updateGameState(GameState.EMERGENCY_STOP);
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
    appendTelemetry,
  ]);

  // Limpa timers ao desmontar
  useEffect(() => {
    return () => {
      clearAllEngineTimers();
    };
  }, [clearAllEngineTimers]);

  const handleSerialEvent = useCallback(
    (event: SerialEvent) => {
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
  const triggerEmergencyStop = useCallback(
    async (customReason?: string) => {
      await driver.send('!EMG');
      ballMachineSimulator.stopFeeding();
      handleEmergencyStop(customReason || 'MANUAL_APP_BUTTON');
    },
    [driver, gameState, activeTarget, currentBallSpeedKmh, currentSpinType, selectedDrill, athleteName]
  );

  const handleEmergencyStop = (source: string) => {
    clearAllEngineTimers();
    ballMachineSimulator.stopFeeding();
    stopReasonRef.current = `Parada de emergência acionada (${source})`;

    const wasRunning =
      gameStateRef.current === GameState.RUNNING_TARGET_ACTIVE ||
      gameStateRef.current === GameState.PAUSED ||
      gameStateRef.current === GameState.COUNTDOWN;

    updateGameState(GameState.EMERGENCY_STOP);
    setEmergencyAlert(`PARADA DE SEGURANÇA ATIVADA (${source})`);
    activeTargetRef.current = null;
    setActiveTarget(null);
    appendTelemetry('ESTOP', {
      metadata: { source },
    });

    api.logCriticalEvent(
      'EMERGENCY_STOP_EMG',
      `Parada segura acionada via ${source} durante treino "${selectedDrill.title}"`,
      athleteName
    );

    api
      .reportSafetyIncident({
        incidentType: 'EMERGENCY_STOP',
        source,
        reason: `Parada de emergência acionada durante treino ${selectedDrill.title}`,
        deviceCode:
          hardwareManager.mode === 'WEB_SERIAL'
            ? 'STA-UNO-R3-01'
            : hardwareManager.mode === 'REMOTE_GATEWAY'
              ? 'STA-WIFI-BRIDGE-01'
              : 'STA-SIM-VIRTUAL-01',
      })
      .catch(() => {});

    if (wasRunning) {
      const estopEvt: SessionEventLogItem = {
        stepNumber: currentStepIndexRef.current + 1,
        targetId: activeTargetRef.current || activeTarget || 1,
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
  };

  const resetEmergencyStop = useCallback(async () => {
    clearAllEngineTimers();
    await driver.send({ cmd: 'RESET' });
    setEmergencyAlert(null);
    updateGameState(GameState.IDLE);
  }, [driver, clearAllEngineTimers, updateGameState]);

  // Controles de Pausar e Retomar Sessão (RF06)
  const pauseSession = useCallback(async () => {
    if (gameStateRef.current !== GameState.RUNNING_TARGET_ACTIVE) return;
    clearAllEngineTimers();
    ballMachineSimulator.stopFeeding();

    const elapsed = Date.now() - stepStartTimeRef.current;
    const remaining = Math.max(0, stepDurationRef.current - elapsed);
    pausedTimeRemainingRef.current = remaining;

    updateGameState(GameState.PAUSED);
    await driver.send({ cmd: 'PAUSE' });
    await driver.send({ cmd: 'DISPLAY', val: 'PAUS' });
    appendTelemetry('PAUSE', { reactionTimeMs: remaining });
  }, [driver, appendTelemetry, clearAllEngineTimers, updateGameState]);

  const resumeSession = useCallback(async () => {
    if (gameStateRef.current !== GameState.PAUSED) return;
    clearAllEngineTimers();

    const remaining =
      pausedTimeRemainingRef.current > 0
        ? pausedTimeRemainingRef.current
        : Math.max(600, stepRemainingMs || 1500);
    stepStartTimeRef.current = Date.now();
    stepDurationRef.current = remaining;

    updateGameState(GameState.RUNNING_TARGET_ACTIVE);
    await driver.send({ cmd: 'RESUME' });
    await driver.send({
      cmd: 'DISPLAY',
      val: String(Math.min(9999, metricsRef.current.score)).padStart(4, '0'),
    });
    appendTelemetry('RESUME');

    const activeStepIdx = currentStepIndexRef.current;
    const expectedTgt = activeTargetRef.current;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - stepStartTimeRef.current;
      const rem = Math.max(0, remaining - elapsed);

      setStepRemainingMs(rem);
      const fraction = stepTotalMs > 0 ? rem / stepTotalMs : rem / remaining;
      setLedCount(Math.ceil(fraction * 8));

      if (rem <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 50);

    missFallbackTimerRef.current = setTimeout(() => {
      if (
        gameStateRef.current === GameState.RUNNING_TARGET_ACTIVE &&
        currentStepIndexRef.current === activeStepIdx &&
        expectedTgt
      ) {
        handleMissEventRef.current(expectedTgt);
      }
    }, remaining + 180);
  }, [stepRemainingMs, stepTotalMs, driver, appendTelemetry, clearAllEngineTimers, updateGameState]);

  // Encerrar / Abortar sessão manualmente (RF06)
  const abortSession = useCallback(
    async (reason: string = 'DESISTENCIA_USUARIO') => {
      clearAllEngineTimers();
      ballMachineSimulator.stopFeeding();
      stopReasonRef.current = reason;

      await driver.send({ cmd: 'RESET' });
      activeTargetRef.current = null;
      setActiveTarget(null);
      setHasCompletedSession(true);
      updateGameState(GameState.COMPLETED);
      appendTelemetry('SESSION_END', { metadata: { status: 'ABORTED', reason } });

      syncSessionResult(
        'ABORTED',
        metricsRef.current,
        zoneAnalyticsRef.current,
        sessionEventsRef.current
      );
    },
    [driver, appendTelemetry, syncSessionResult, clearAllEngineTimers, updateGameState]
  );

  // Início da sessão com contagem regressiva 3, 2, 1
  const startSession = useCallback(async () => {
    if (!driver.isConnected) {
      await driver.connect();
    }

    clearAllEngineTimers();

    sessionStartTimeRef.current = Date.now();
    telemetryCounterRef.current = 0;
    telemetryLogRef.current = [];
    setTelemetryLog([]);
    stopReasonRef.current = null;
    setMotherPlatformReceipt(null);
    setEvolutionDeltaScore(null);
    setApiRecommendations([]);

    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    currentStepIndexRef.current = 0;
    setCurrentStepIndex(0);
    currentSeriesRef.current = 1;
    setCurrentSeries(1);
    setLastPointsAdded(0);
    setLastHitTarget(null);
    setLastHitResult(null);
    setSyncStatus('IDLE');
    sessionStartIsoRef.current = new Date().toISOString();
    sessionEventsRef.current = [];
    setSessionEvents([]);
    zoneReactionListRef.current = { 1: [], 2: [], 3: [], 4: [], 5: [] };

    await driver.send({ cmd: 'DISPLAY', val: '0000' });

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

    updateGameState(GameState.COUNTDOWN);
    setCountdownValue(3);
    appendTelemetry('SESSION_START', { metadata: { drillId: selectedDrill.id, isKidsMode } });

    let count = 3;
    countdownIntervalRef.current = setInterval(() => {
      if (gameStateRef.current === GameState.EMERGENCY_STOP) {
        clearAllEngineTimers();
        return;
      }
      count -= 1;
      setCountdownValue(count);
      if (count <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        startStep(0);
      }
    }, 850);
  }, [driver, selectedDrill, isKidsMode, appendTelemetry, clearAllEngineTimers, updateGameState]);

  // Inicia um step de alvo específico com máquina de bolas Spinshot (RF09)
  const startStep = useCallback(
    (stepIdx: number) => {
      if (gameStateRef.current === GameState.EMERGENCY_STOP) {
        return;
      }

      if (stepIdx >= selectedDrill.steps.length) {
        if (currentSeriesRef.current < totalSeries) {
          const nextSeries = currentSeriesRef.current + 1;
          currentSeriesRef.current = nextSeries;
          setCurrentSeries(nextSeries);
          startStep(0);
          return;
        }
        completeSession();
        return;
      }

      clearAllEngineTimers();

      const step = selectedDrill.steps[stepIdx];
      const effectiveDuration = isKidsMode
        ? Math.round(step.durationMs * 1.5)
        : step.durationMs;

      const speedKmh = step.ballSpeedKmh || (isKidsMode ? 45 : 90);
      const spin = step.spinType || 'FLAT';

      currentStepIndexRef.current = stepIdx;
      setCurrentStepIndex(stepIdx);
      activeTargetRef.current = step.targetId;
      setActiveTarget(step.targetId);
      setStepTotalMs(effectiveDuration);
      setStepRemainingMs(effectiveDuration);
      setCurrentBallSpeedKmh(speedKmh);
      setCurrentSpinType(spin);
      setLedCount(8);
      updateGameState(GameState.RUNNING_TARGET_ACTIVE);

      stepStartTimeRef.current = Date.now();
      stepDurationRef.current = effectiveDuration;

      // Aciona o simulador Spinshot e envia comando FEED ao driver IoT (RF08, RF09)
      const shot = ballMachineSimulator.executeShotForStep(step, isKidsMode);

      driver.send({
        cmd: 'FEED',
        speed: shot.settings.ballSpeedKmh,
        spin: shot.settings.spin,
        elev: shot.settings.elevationDeg,
        angle: shot.settings.horizontalAngleDeg,
      });

      driver.send({
        cmd: 'START',
        tgt: step.targetId,
        time: effectiveDuration,
      });

      appendTelemetry('STEP_START', {
        targetId: step.targetId,
        stepNumber: stepIdx + 1,
      });

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - stepStartTimeRef.current;
        const remaining = Math.max(0, effectiveDuration - elapsed);

        setStepRemainingMs(remaining);

        const fraction = remaining / effectiveDuration;
        const leds = Math.ceil(fraction * 8);
        setLedCount(leds);

        if (remaining <= 0 && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }, 50);

      missFallbackTimerRef.current = setTimeout(() => {
        if (
          gameStateRef.current === GameState.RUNNING_TARGET_ACTIVE &&
          currentStepIndexRef.current === stepIdx
        ) {
          handleMissEventRef.current(step.targetId);
        }
      }, effectiveDuration + 180);
    },
    [selectedDrill, isKidsMode, driver, totalSeries, appendTelemetry, clearAllEngineTimers, updateGameState]
  );

  // Processa impacto com sucesso
  const handleHitEvent = (targetId: TargetId, adcFifo: number, _timestamp: number) => {
    if (gameStateRef.current !== GameState.RUNNING_TARGET_ACTIVE) return;
    clearAllEngineTimers();

    const reactionTime = Math.max(80, Date.now() - stepStartTimeRef.current);
    const remaining = Math.max(0, stepDurationRef.current - reactionTime);

    const scoreResult = calculateHitScore({
      remainingMs: remaining,
      totalMs: stepDurationRef.current,
      streak,
      adcFifoValue: adcFifo,
      isCorrectTarget: true,
      isKidsMode,
      rules: selectedDrill.scoringRules,
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
    updateGameState(GameState.TARGET_HIT);

    driver.send({
      cmd: 'DISPLAY',
      val: String(Math.min(9999, newScore)).padStart(4, '0'),
    });

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

    const currentStep = selectedDrill.steps[currentStepIndexRef.current];
    const transitionDelayMs = Math.max(
      250,
      Math.min(2500, currentStep?.feedIntervalMs ?? 550)
    );

    transitionTimeoutRef.current = setTimeout(() => {
      transitionTimeoutRef.current = null;
      if (
        gameStateRef.current !== GameState.EMERGENCY_STOP &&
        gameStateRef.current !== GameState.PAUSED &&
        gameStateRef.current !== GameState.IDLE
      ) {
        advanceNextStepRef.current();
      }
    }, transitionDelayMs);
  };

  // Processa impacto em alvo incorreto
  const handleWrongHitEvent = (targetId: TargetId, adcFifo: number, expected: TargetId) => {
    if (gameStateRef.current !== GameState.RUNNING_TARGET_ACTIVE) return;

    const scoreResult = calculateHitScore({
      remainingMs: stepRemainingMs,
      totalMs: stepDurationRef.current,
      streak,
      adcFifoValue: adcFifo,
      isCorrectTarget: false,
      isKidsMode,
      rules: selectedDrill.scoringRules,
    });

    const updatedScore = Math.max(0, score + scoreResult.pointsAdded);
    setScore(updatedScore);
    setStreak(0);
    setLastPointsAdded(scoreResult.pointsAdded);
    setLastHitTarget(targetId);
    setLastHitResult('WRONG_HIT');

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

    appendTelemetry('WRONG_HIT', {
      targetId,
      expectedTargetId: expected || activeTarget,
      adcValue: adcFifo,
      pointsAwarded: scoreResult.pointsAdded,
    });

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
    if (gameStateRef.current !== GameState.RUNNING_TARGET_ACTIVE) return;
    clearAllEngineTimers();

    setStreak(0);
    setLastPointsAdded(0);
    setLastHitTarget(targetId);
    setLastHitResult('MISS');
    updateGameState(GameState.TARGET_MISS_TIMEOUT);

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

    appendTelemetry('MISS', {
      targetId,
      pointsAwarded: 0,
    });

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

    const currentStep = selectedDrill.steps[currentStepIndexRef.current];
    const transitionDelayMs = Math.max(
      250,
      Math.min(2500, currentStep?.feedIntervalMs ?? 550)
    );

    transitionTimeoutRef.current = setTimeout(() => {
      transitionTimeoutRef.current = null;
      if (
        gameStateRef.current !== GameState.EMERGENCY_STOP &&
        gameStateRef.current !== GameState.PAUSED &&
        gameStateRef.current !== GameState.IDLE
      ) {
        advanceNextStepRef.current();
      }
    }, transitionDelayMs);
  };

  const advanceNextStep = () => {
    if (
      gameStateRef.current === GameState.EMERGENCY_STOP ||
      gameStateRef.current === GameState.PAUSED
    ) {
      return;
    }

    const nextIdx = currentStepIndexRef.current + 1;
    if (nextIdx >= selectedDrill.steps.length) {
      if (currentSeriesRef.current < totalSeries) {
        const nextSeries = currentSeriesRef.current + 1;
        currentSeriesRef.current = nextSeries;
        setCurrentSeries(nextSeries);
        startStep(0);
      } else {
        completeSession();
      }
    } else {
      startStep(nextIdx);
    }
  };

  const completeSession = () => {
    clearAllEngineTimers();
    ballMachineSimulator.stopFeeding();
    stopReasonRef.current = null;
    updateGameState(GameState.COMPLETED);
    setHasCompletedSession(true);
    activeTargetRef.current = null;
    setActiveTarget(null);
    driver.send({
      cmd: 'DISPLAY',
      val: String(Math.min(9999, metricsRef.current.score)).padStart(4, '0'),
    });
    appendTelemetry('SESSION_END', { metadata: { status: 'COMPLETED', score: metricsRef.current.score } });

    syncSessionResult(
      'COMPLETED',
      metricsRef.current,
      zoneAnalyticsRef.current,
      sessionEventsRef.current
    );
  };

  handleMissEventRef.current = handleMissEvent;
  advanceNextStepRef.current = advanceNextStep;

  const tapTargetSimulated = useCallback((targetId: TargetId) => {
    if (hardwareManager.mode === 'MOCK') {
      mockSerialDriver.simulateHit(targetId);
    } else if (
      hardwareManager.mode === 'REMOTE_GATEWAY' &&
      gameStateRef.current === GameState.RUNNING_TARGET_ACTIVE
    ) {
      remoteGatewayDriver.simulateHit(targetId, activeTargetRef.current);
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
      motherPlatformReceipt,
      evolutionDeltaScore,
      apiRecommendations,
      telemetryAuthorized,
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
