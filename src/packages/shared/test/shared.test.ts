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
  assert.equal(parseSerialFrame('{"evt":"HIT","tgt":99}'), null); // Target fora de 1..5
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
