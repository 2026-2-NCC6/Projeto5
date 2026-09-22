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
  // Acerto no início da janela (100% do tempo) com streak 0 e força média (512)
  const result1 = calculateHitScore({
    remainingMs: 2000,
    totalMs: 2000,
    streak: 0,
    adcFifoValue: 512,
    isCorrectTarget: true,
  });
  // P = (100 * (1 + 1) * 1.0) + 10 = 210
  assert.equal(result1.pointsAdded, 210);
  assert.equal(result1.newStreak, 1);
  assert.equal(result1.forceBonus, 10);

  // Acerto no alvo incorreto em Modo Pro: -30 pts e zera streak
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

  // Acerto no alvo incorreto em Modo Kids (RN09): 0 pts e sem penalidade
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

test('Parser Serial: decodifica comando de emergência prioritário !EMG', () => {
  const event = parseSerialFrame('!EMG\n');
  assert.ok(event);
  assert.equal(event.evt, 'ESTOP_ALERT');
  assert.equal(event.src, 'RAW_EMG');
});

test('Serializador: gera quadros JSON com delimitador newline', () => {
  const cmdStr = serializeSerialCommand({ cmd: 'START', tgt: 1, time: 3000 });
  assert.equal(cmdStr, '{"cmd":"START","tgt":1,"time":3000}\n');

  const emgStr = serializeSerialCommand('!EMG');
  assert.equal(emgStr, '!EMG\n');
});
