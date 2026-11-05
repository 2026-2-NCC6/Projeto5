import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHitScore,
  getStreakMultiplier,
  getForceBonus,
} from '../src/rules/scoring.ts';
import {
  parseSerialFrame,
  serializeSerialCommand,
} from '../src/protocol/serial.ts';
import {
  isValidEmail,
  sanitizeOptionalText,
  validateRegistrationPayload,
  applyPrivacyPolicyToUser,
} from '../src/security/validation.ts';
import {
  DEFAULT_DRILLS,
  DrillCategory,
  DrillDifficulty,
  validateDrillDefinition,
} from '../src/contracts/drills.ts';
import { computeSessionAnalyticalIndicators } from '../src/contracts/sessions.ts';
import type { UserWithProfile } from '../src/contracts/user.ts';

test('RN03: Multiplicador de streak cresce até 1.5x aos 5 acertos', () => {
  assert.equal(getStreakMultiplier(0), 1.0);
  assert.equal(getStreakMultiplier(1), 1.1);
  assert.equal(getStreakMultiplier(3), 1.3);
  assert.equal(getStreakMultiplier(5), 1.5);
  assert.equal(getStreakMultiplier(10), 1.5); // Limite teto
});

test('RN03: Bônus de força ADC varia entre 0 e 20', () => {
  assert.equal(getForceBonus(0), 0);
  assert.equal(getForceBonus(512), 10);
  assert.equal(getForceBonus(1023), 19);
});

test('RN03: Cálculo de pontuação com tempo remanescente e combo', () => {
  const result1 = calculateHitScore({
    remainingMs: 2000,
    totalMs: 2000,
    streak: 0,
    adcFifoValue: 512,
    isCorrectTarget: true,
  });
  assert.equal(result1.pointsAdded, 210);
  assert.equal(result1.newStreak, 1);
  assert.equal(result1.forceBonus, 10);

  const resultWrongPro = calculateHitScore({
    remainingMs: 1500,
    totalMs: 2000,
    streak: 3,
    adcFifoValue: 512,
    isCorrectTarget: false,
    isKidsMode: false,
  });
  assert.equal(resultWrongPro.pointsAdded, -30);
  assert.equal(resultWrongPro.newStreak, 0);

  const resultWrongKids = calculateHitScore({
    remainingMs: 1500,
    totalMs: 2000,
    streak: 3,
    adcFifoValue: 512,
    isCorrectTarget: false,
    isKidsMode: true,
  });
  assert.equal(resultWrongKids.pointsAdded, 0);
  assert.equal(resultWrongKids.newStreak, 0);
});

test('Parser Serial: decodifica frame HIT com validação de campos', () => {
  const frame = '{"evt":"HIT","tgt":2,"val":780,"ts":14520}\n';
  const event = parseSerialFrame(frame);
  assert.ok(event);
  assert.equal(event.evt, 'HIT');
  if (event.evt === 'HIT') {
    assert.equal(event.tgt, 2);
    assert.equal(event.val, 780);
    assert.equal(event.ts, 14520);
  }
});

test('Parser Serial: decodifica frame WRONG_HIT com alvo esperado', () => {
  const frame = '{"evt":"WRONG_HIT","tgt":3,"val":620,"expected":1,"ts":14530}\n';
  const event = parseSerialFrame(frame);
  assert.ok(event);
  assert.equal(event.evt, 'WRONG_HIT');
  if (event.evt === 'WRONG_HIT') {
    assert.equal(event.tgt, 3);
    assert.equal(event.val, 620);
    assert.equal(event.expected, 1);
    assert.equal(event.ts, 14530);
  }
});

test('Parser Serial: decodifica frame MISS por timeout', () => {
  const frame = '{"evt":"MISS","tgt":4,"ts":18500}\n';
  const event = parseSerialFrame(frame);
  assert.ok(event);
  assert.equal(event.evt, 'MISS');
  if (event.evt === 'MISS') {
    assert.equal(event.tgt, 4);
    assert.equal(event.ts, 18500);
  }
});

test('Parser Serial: decodifica frame READY de inicialização do Arduino', () => {
  const frame = '{"evt":"READY","hw":"STA-UNO-R3","fw":"1.0.0","piezo":[250,250,250,250,250]}\n';
  const event = parseSerialFrame(frame);
  assert.ok(event);
  assert.equal(event.evt, 'READY');
  if (event.evt === 'READY') {
    assert.equal(event.hw, 'STA-UNO-R3');
    assert.equal(event.fw, '1.0.0');
    assert.deepEqual(event.piezo, [250, 250, 250, 250, 250]);
  }
});

test('Parser Serial: decodifica frame PONG de teste de latência', () => {
  const frame = '{"evt":"PONG","ts":12345}\n';
  const event = parseSerialFrame(frame);
  assert.ok(event);
  assert.equal(event.evt, 'PONG');
  if (event.evt === 'PONG') {
    assert.equal(event.ts, 12345);
  }
});

test('Parser Serial: decodifica comando de emergência prioritário !EMG e ESTOP_ALERT', () => {
  const eventEmg = parseSerialFrame('!EMG\n');
  assert.ok(eventEmg);
  assert.equal(eventEmg.evt, 'ESTOP_ALERT');
  assert.equal(eventEmg.src, 'RAW_EMG');

  const eventAlert = parseSerialFrame('{"evt":"ESTOP_ALERT","src":"PHYSICAL_BUTTON","ts":9999}\n');
  assert.ok(eventAlert);
  assert.equal(eventAlert.evt, 'ESTOP_ALERT');
  if (eventAlert.evt === 'ESTOP_ALERT') {
    assert.equal(eventAlert.src, 'PHYSICAL_BUTTON');
    assert.equal(eventAlert.ts, 9999);
  }
});

test('Parser Serial: descarta frames corrompidos, vazios ou inválidos', () => {
  assert.equal(parseSerialFrame(''), null);
  assert.equal(parseSerialFrame('    \n'), null);
  assert.equal(parseSerialFrame('corrupted_string_without_json'), null);
  assert.equal(parseSerialFrame('{"evt":"UNKNOWN"}'), null);
  assert.equal(parseSerialFrame('{"evt":"HIT","tgt":99}'), null);
});

test('Serializador: gera quadros JSON com delimitador newline para todos os comandos', () => {
  const startCmd = serializeSerialCommand({ cmd: 'START', tgt: 1, time: 3000 });
  assert.equal(startCmd, '{"cmd":"START","tgt":1,"time":3000}\n');

  const buzzCmd = serializeSerialCommand({ cmd: 'BUZZ', freq: 1500, dur: 200 });
  assert.equal(buzzCmd, '{"cmd":"BUZZ","freq":1500,"dur":200}\n');

  const ledsCmd = serializeSerialCommand({ cmd: 'SET_LEDS', tgt: 2, mask: 255 });
  assert.equal(ledsCmd, '{"cmd":"SET_LEDS","tgt":2,"mask":255}\n');

  const pingCmd = serializeSerialCommand({ cmd: 'PING' });
  assert.equal(pingCmd, '{"cmd":"PING"}\n');

  const resetCmd = serializeSerialCommand({ cmd: 'RESET' });
  assert.equal(resetCmd, '{"cmd":"RESET"}\n');

  const calibCmd = serializeSerialCommand({ cmd: 'CALIB', thresh: [200, 200, 250, 250, 300] });
  assert.equal(calibCmd, '{"cmd":"CALIB","thresh":[200,200,250,250,300]}\n');

  const emgCmd = serializeSerialCommand('!EMG');
  assert.equal(emgCmd, '!EMG\n');
});

test('RF01 / OWASP A01: Auto-cadastro bloqueia escalonamento de privilégio para ADMIN e TREINADOR', () => {
  const playerOk = validateRegistrationPayload({
    name: 'Atleta Teste',
    email: 'atleta@smarttennis.com',
    password: 'password123',
    role: 'JOGADOR',
    ageGroup: 'ADULTO',
    skillLevel: 'INICIANTE',
  });
  assert.equal(playerOk.valid, true);

  const adminAttempt = validateRegistrationPayload({
    name: 'Invasor',
    email: 'hacker@smarttennis.com',
    password: 'password123',
    role: 'ADMIN',
  });
  assert.equal(adminAttempt.valid, false);
  assert.equal(adminAttempt.privilegeEscalationAttempt, true);

  const coachAttempt = validateRegistrationPayload({
    name: 'Treinador Não Autorizado',
    email: 'coach2@smarttennis.com',
    password: 'password123',
    role: 'TREINADOR',
  });
  assert.equal(coachAttempt.valid, false);
  assert.equal(coachAttempt.privilegeEscalationAttempt, true);

  const adminAuthorized = validateRegistrationPayload(
    {
      name: 'Novo Treinador Oficial',
      email: 'oficial@smarttennis.com',
      password: 'password123',
      role: 'TREINADOR',
    },
    { allowPrivilegedRoles: true }
  );
  assert.equal(adminAuthorized.valid, true);
});

test('LGPD Art. 14 (Seções 3 e 5): Perfil infantil (KIDS) exige responsável legal e consentimento explícito', () => {
  const kidsWithoutConsent = validateRegistrationPayload({
    name: 'Pedro Kids',
    email: 'pedro@smarttennis.com',
    password: 'password123',
    ageGroup: 'KIDS',
  });
  assert.equal(kidsWithoutConsent.valid, false);

  const kidsWithoutGuardianName = validateRegistrationPayload({
    name: 'Pedro Kids',
    email: 'pedro@smarttennis.com',
    password: 'password123',
    ageGroup: 'KIDS',
    guardianConsent: true,
    guardianName: '  ',
  });
  assert.equal(kidsWithoutGuardianName.valid, false);

  const kidsAuthorized = validateRegistrationPayload({
    name: 'Pedro Kids',
    email: 'pedro@smarttennis.com',
    password: 'password123',
    ageGroup: 'KIDS',
    guardianConsent: true,
    guardianName: 'Mariana Silva (Mãe)',
  });
  assert.equal(kidsAuthorized.valid, true);
});

test('RF02 / OWASP XSS: Higienização de campos opcionais remove scripts e permite limpeza explícita (null)', () => {
  assert.equal(isValidEmail('valido@dominio.com.br'), true);
  assert.equal(isValidEmail('email-invalido'), false);

  assert.equal(sanitizeOptionalText(undefined), undefined);
  assert.equal(sanitizeOptionalText('   '), null);
  assert.equal(
    sanitizeOptionalText('Tendinite no ombro <script>alert(1)</script> direito'),
    'Tendinite no ombro alert(1) direito'
  );
});

test('LGPD: Minimização de exposição de dados de menores para não-ADMIN e anonimização em modo demonstração', () => {
  const minorUser: UserWithProfile = {
    id: 4,
    name: 'Theo Carvalho',
    email: 'kids@smarttennis.com',
    role: 'JOGADOR',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    profile: {
      id: 4,
      userId: 4,
      skillLevel: 'INICIANTE',
      ageGroup: 'KIDS',
      preferences: 'Drills curtos',
      physicalRestrictions: 'Asma leve em esforço intenso',
      guardianName: 'Mariana Carvalho',
      guardianConsent: true,
      telemetryConsent: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  };

  const coachView = applyPrivacyPolicyToUser(minorUser, { id: 2, role: 'TREINADOR' });
  assert.equal(coachView.name, 'Theo C. (Menor Protegido)');
  assert.equal(coachView.email, 'ki***@smarttennis.com');
  assert.equal(coachView.profile?.physicalRestrictions, '[Acesso restrito — Proteção LGPD Menores]');
  assert.equal(coachView.profile?.guardianName, '[Responsável verificado]');

  const adminFullView = applyPrivacyPolicyToUser(minorUser, { id: 1, role: 'ADMIN' }, { anonymizeDemo: false });
  assert.equal(adminFullView.email, 'kids@smarttennis.com');
  assert.equal(adminFullView.profile?.physicalRestrictions, 'Asma leve em esforço intenso');

  const demoView = applyPrivacyPolicyToUser(minorUser, { id: 1, role: 'ADMIN' }, { anonymizeDemo: true });
  assert.equal(demoView.name, 'Theo C. (Menor Protegido)');
  assert.equal(demoView.email, 'ki***@smarttennis.com');
  assert.equal(demoView.profile?.physicalRestrictions, '[Oculto no modo demonstração]');
});

test('RF15 / RF16: Todos os DEFAULT_DRILLS passam na validação formal e limites Spinshot / Kids são impostos', () => {
  for (const drill of DEFAULT_DRILLS) {
    const res = validateDrillDefinition(drill);
    assert.equal(res.valid, true, `Treino ${drill.id} falhou na validação: ${res.errors.join('; ')}`);
    assert.ok(res.computedDurationSec >= 10);
  }

  // Bloqueio de velocidade insegura (> 65 km/h) em treino infantil (Modo Kids)
  const unsafeKids = validateDrillDefinition({
    title: 'Treino Infantil Inseguro',
    description: 'Teste de bloqueio de segurança física para crianças.',
    category: DrillCategory.KIDS_FUN,
    difficulty: DrillDifficulty.BEGINNER,
    isKidsAdapted: true,
    steps: [{ stepNumber: 1, targetId: 1, durationMs: 3000, ballSpeedKmh: 95 }],
  });
  assert.equal(unsafeKids.valid, false);
  assert.ok(unsafeKids.errors.some((e) => e.includes('65 km/h')));

  // Bloqueio de janela fora do intervalo da FSM (< 800ms)
  const invalidWindow = validateDrillDefinition({
    title: 'Janela Impossível',
    description: 'Teste de validação de janela de sensor IoT.',
    category: DrillCategory.REACTION,
    difficulty: DrillDifficulty.PRO,
    isKidsAdapted: false,
    steps: [{ stepNumber: 1, targetId: 2, durationMs: 300 }],
  });
  assert.equal(invalidWindow.valid, false);
});

test('RF13 / RF19: Cálculo determinístico de precisão (%) e consistência (desvio-padrão ms)', () => {
  const ind = computeSessionAnalyticalIndicators({
    score: 1200,
    streak: 4,
    maxStreak: 4,
    hits: 6,
    misses: 2,
    wrongHits: 0,
    reactionTimes: [1000, 1200, 800, 1000],
    averageReactionTimeMs: 1000,
    hitsByTarget: { 1: 2, 2: 1, 3: 1, 4: 1, 5: 1 },
  });

  assert.equal(ind.totalAttempts, 8);
  assert.equal(ind.accuracyPct, 75);
  // Média = 1000; variância = ((0 + 40000 + 40000 + 0) / 4) = 20000; sqrt(20000) ≈ 141ms
  assert.equal(ind.consistencyMs, 141);
});
