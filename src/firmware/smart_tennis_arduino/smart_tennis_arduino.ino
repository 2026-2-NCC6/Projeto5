/**
 * ==============================================================================
 * FECAP - Projeto Interdisciplinar: Smart Tennis Arena (6º CCOMP)
 * Sistema de Treino Gamificado de Tênis — Módulo de Firmware Embarcado
 * ==============================================================================
 * Alinhado com:
 *  - Entrega 02: Sistemas Embarcados e Robótica (Controle de sensores e atuadores)
 *  - Entrega 02: Projeto Interdisciplinar (Integração IoT e Robótica)
 *  - Protocolo Serial Oficial: docs/spec/05-firmware-protocol.md
 *
 * Microcontrolador: Arduino Uno R3 (ATmega328P)
 * Comunicação: Serial UART via USB (115200 bps, 8N1)
 *
 * Entradas:
 *  - Sensores Piezoelétricos: A0 (Alvo 1), A1 (Alvo 2), A2 (Alvo 3), A3 (Alvo 4), A4 (Alvo 5)
 *  - Botão de Parada de Emergência Físico: D2 (com pull-up interno e interrupção INT0)
 *
 * Saídas:
 *  - Buzzer Piezoelétrico: D8 (PWM/Tone para feedback sonoro imediato)
 *  - LEDs Indicadores dos 5 Alvos: Pinos D3, D4, D5, D6, D7 (ou via 74HC595)
 *  - LED de Status / Pronto / Falha: D13 (LED onboard)
 * ==============================================================================
 */

#include <Arduino.h>

// ------------------------------------------------------------------------------
// Configurações de Hardware e Pinos
// ------------------------------------------------------------------------------
#define NUM_TARGETS 5

// Entradas Analógicas para os 5 Sensores Piezoelétricos
const uint8_t PIN_PIEZO[NUM_TARGETS] = {A0, A1, A2, A3, A4};

// Saídas Digitais para os LEDs de cada Alvo (1 a 5)
const uint8_t PIN_LEDS[NUM_TARGETS] = {3, 4, 5, 6, 7};

// Pinos opcionais para registrador de deslocamento 74HC595 (caso utilizado)
#define USE_74HC595 false // Mude para true se utilizar o CI 74HC595 na protoboard
const uint8_t PIN_74HC595_DATA  = 5;
const uint8_t PIN_74HC595_CLOCK = 6;
const uint8_t PIN_74HC595_LATCH = 7;

// Atuador Sonoro (Buzzer)
const uint8_t PIN_BUZZER = 8;

// Entrada Digital para Botão Físico de Emergência (com interrupção INT0)
const uint8_t PIN_ESTOP_BUTTON = 2;

// LED de status do sistema
const uint8_t PIN_STATUS_LED = 13;

// ------------------------------------------------------------------------------
// Constantes de Operação e Calibração dos Sensores
// ------------------------------------------------------------------------------
// Limiar padrão de leitura ADC (0 a 1023) para considerar impacto mecânico válido
// Ruídos de vibração externa abaixo deste valor são descartados (RF09)
uint16_t piezoThresholds[NUM_TARGETS] = {250, 250, 250, 250, 250};

// Tempo de lockout/debounce (em ms) após detecção de um impacto para evitar duplo registro
const unsigned long DEBOUNCE_LOCKOUT_MS = 250;

// ------------------------------------------------------------------------------
// Máquina de Estados Finita do Firmware
// ------------------------------------------------------------------------------
enum FirmwareState {
  STATE_BOOT,           // Inicialização e autoteste
  STATE_IDLE_READY,     // Conectado, aguardando início de rodada/treino
  STATE_TARGET_ACTIVE,  // Alvo específico iluminado e monitorando impacto
  STATE_EMERGENCY_STOP  // Parada de segurança acionada; saídas bloqueadas
};

volatile FirmwareState currentState = STATE_BOOT;

// Controle de tempo e alvo ativo
uint8_t currentActiveTarget = 0;        // 1 a 5 (0 = nenhum)
unsigned long targetStartTime = 0;       // Timestamp do acionamento do alvo
unsigned long targetDurationMs = 0;      // Janela de tempo configurada (ms)
unsigned long lastHitTime = 0;           // Para controle de debounce

// Flag volátil para interrupção de emergência
volatile bool emergencyTriggered = false;

// Buffer de recepção serial
const uint8_t SERIAL_BUF_SIZE = 128;
char serialBuffer[SERIAL_BUF_SIZE];
uint8_t serialBufferIdx = 0;

// ------------------------------------------------------------------------------
// Protótipos de Funções
// ------------------------------------------------------------------------------
void handleEmergencyInterrupt();
void checkSensors();
void setTargetLeds(uint8_t targetId, bool state);
void clearAllLeds();
void playToneSequence(uint16_t freq, uint16_t durationMs);
void soundHitFeedback();
void soundWrongFeedback();
void soundMissFeedback();
void soundEmergencyAlarm();
void soundReadyBeep();
void processIncomingSerial();
void executeCommand(char* jsonStr);
void sendReadyEvent();
void sendHitEvent(uint8_t target, uint16_t val);
void sendWrongHitEvent(uint8_t target, uint16_t val, uint8_t expected);
void sendMissEvent(uint8_t target);
void sendEstopAlertEvent(const char* src);
void sendPongEvent();
void update74HC595(uint8_t pattern);

// ==============================================================================
// SETUP: Inicialização de Hardware e Periféricos
// ==============================================================================
void setup() {
  // Inicialização da porta serial a 115200 bps
  Serial.begin(115200);

  // Configuração dos Pinos dos LEDs
  if (USE_74HC595) {
    pinMode(PIN_74HC595_DATA, OUTPUT);
    pinMode(PIN_74HC595_CLOCK, OUTPUT);
    pinMode(PIN_74HC595_LATCH, OUTPUT);
    update74HC595(0x00);
  } else {
    for (uint8_t i = 0; i < NUM_TARGETS; i++) {
      pinMode(PIN_LEDS[i], OUTPUT);
      digitalWrite(PIN_LEDS[i], LOW);
    }
  }

  // Configuração do Buzzer e LED de Status
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, HIGH);

  // Configuração dos Pinos dos Piezos (Entradas Analógicas)
  for (uint8_t i = 0; i < NUM_TARGETS; i++) {
    pinMode(PIN_PIEZO[i], INPUT);
  }

  // Botão Físico de Emergência com interrupção externa (borda de descida)
  pinMode(PIN_ESTOP_BUTTON, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_ESTOP_BUTTON), handleEmergencyInterrupt, FALLING);

  // Autoteste rápido: pisca LEDs e emite bipe
  for (uint8_t i = 0; i < NUM_TARGETS; i++) {
    setTargetLeds(i + 1, true);
    delay(40);
    setTargetLeds(i + 1, false);
  }
  clearAllLeds();
  soundReadyBeep();

  currentState = STATE_IDLE_READY;

  // Envia evento oficial de inicialização para o aplicativo
  sendReadyEvent();
}

// ==============================================================================
// LOOP: Ciclo Principal de Execução em Tempo Real (Não Bloqueante)
// ==============================================================================
void loop() {
  // 1. Verificação prioritária de emergência física disparada via interrupção
  if (emergencyTriggered) {
    emergencyTriggered = false;
    triggerEmergency("PHYSICAL_BUTTON");
  }

  // 2. Processa comandos recebidos via USB Serial
  processIncomingSerial();

  // 3. Gerenciamento da Máquina de Estados
  switch (currentState) {
    case STATE_IDLE_READY:
      // Em repouso: aguardando comando do aplicativo (START, PING, etc.)
      digitalWrite(PIN_STATUS_LED, HIGH);
      break;

    case STATE_TARGET_ACTIVE: {
      digitalWrite(PIN_STATUS_LED, (millis() / 250) % 2); // Pisca rápido durante rodada

      // Verifica estouro de tempo (MISS)
      if (millis() - targetStartTime >= targetDurationMs) {
        clearAllLeds();
        soundMissFeedback();
        sendMissEvent(currentActiveTarget);

        currentActiveTarget = 0;
        currentState = STATE_IDLE_READY;
        break;
      }

      // Lê sensores piezo para verificar impacto mecânico
      checkSensors();
      break;
    }

    case STATE_EMERGENCY_STOP:
      // Estado de parada segura: saídas desligadas e LED de status piscando lento de alerta
      clearAllLeds();
      digitalWrite(PIN_STATUS_LED, (millis() / 500) % 2);
      break;

    default:
      currentState = STATE_IDLE_READY;
      break;
  }
}

// ==============================================================================
// INTERRUPÇÃO: Botão Físico de Emergência (Segurança Operacional RF22)
// ==============================================================================
void handleEmergencyInterrupt() {
  emergencyTriggered = true;
}

void triggerEmergency(const char* source) {
  currentState = STATE_EMERGENCY_STOP;
  currentActiveTarget = 0;
  clearAllLeds();
  soundEmergencyAlarm();
  sendEstopAlertEvent(source);
}

// ==============================================================================
// AQUISIÇÃO E PROCESSAMENTO DOS SENSORES PIEZOELÉTRICOS
// ==============================================================================
void checkSensors() {
  unsigned long now = millis();
  if (now - lastHitTime < DEBOUNCE_LOCKOUT_MS) {
    return; // Período de descarte de repiques de vibração
  }

  uint8_t hitTarget = 0;
  uint16_t highestAdc = 0;

  // Realiza varredura rápida de todos os 5 alvos
  for (uint8_t i = 0; i < NUM_TARGETS; i++) {
    uint16_t val = analogRead(PIN_PIEZO[i]);
    if (val >= piezoThresholds[i] && val > highestAdc) {
      highestAdc = val;
      hitTarget = i + 1; // Alvos indexados de 1 a 5
    }
  }

  if (hitTarget > 0) {
    lastHitTime = now;

    if (hitTarget == currentActiveTarget) {
      // ACERTO VÁLIDO NO ALVO ATIVO! (HIT)
      clearAllLeds();
      soundHitFeedback();
      sendHitEvent(hitTarget, highestAdc);

      currentActiveTarget = 0;
      currentState = STATE_IDLE_READY;
    } else {
      // IMPACTO NO ALVO INCORRETO (WRONG_HIT)
      soundWrongFeedback();
      sendWrongHitEvent(hitTarget, highestAdc, currentActiveTarget);
    }
  }
}

// ==============================================================================
// CONTROLE DE ATUADORES VISUAIS (LEDs) E SONOROS (BUZZER)
// ==============================================================================
void setTargetLeds(uint8_t targetId, bool state) {
  if (targetId < 1 || targetId > NUM_TARGETS) return;

  if (USE_74HC595) {
    static uint8_t currentPattern = 0;
    if (state) {
      currentPattern |= (1 << (targetId - 1));
    } else {
      currentPattern &= ~(1 << (targetId - 1));
    }
    update74HC595(currentPattern);
  } else {
    digitalWrite(PIN_LEDS[targetId - 1], state ? HIGH : LOW);
  }
}

void clearAllLeds() {
  if (USE_74HC595) {
    update74HC595(0x00);
  } else {
    for (uint8_t i = 0; i < NUM_TARGETS; i++) {
      digitalWrite(PIN_LEDS[i], LOW);
    }
  }
}

void update74HC595(uint8_t pattern) {
  digitalWrite(PIN_74HC595_LATCH, LOW);
  shiftOut(PIN_74HC595_DATA, PIN_74HC595_CLOCK, MSBFIRST, pattern);
  digitalWrite(PIN_74HC595_LATCH, HIGH);
}

// Feedback Sonoro
void playToneSequence(uint16_t freq, uint16_t durationMs) {
  tone(PIN_BUZZER, freq, durationMs);
}

void soundHitFeedback() {
  playToneSequence(1800, 90); // Tom agudo alegre de acerto
}

void soundWrongFeedback() {
  playToneSequence(320, 140); // Tom grave de advertência
}

void soundMissFeedback() {
  playToneSequence(440, 100);
}

void soundReadyBeep() {
  playToneSequence(1200, 60);
  delay(80);
  playToneSequence(1600, 100);
}

void soundEmergencyAlarm() {
  // Beep rápido e intermitente de alerta
  for (int i = 0; i < 3; i++) {
    tone(PIN_BUZZER, 2200, 60);
    delay(80);
  }
}

// ==============================================================================
// PROTOCOLO SERIAL: PROCESSAMENTO DE LINHAS E COMANDOS JSON (DOWNLINK)
// ==============================================================================
void processIncomingSerial() {
  while (Serial.available() > 0) {
    char c = Serial.read();

    // Tratamento prioritário de emergência em tempo real (!EMG)
    if (c == '!' && serialBufferIdx == 0) {
      serialBuffer[serialBufferIdx++] = '!';
      continue;
    }
    if (serialBufferIdx == 1 && serialBuffer[0] == '!' && c == 'E') {
      serialBuffer[serialBufferIdx++] = 'E';
      continue;
    }
    if (serialBufferIdx == 2 && serialBuffer[0] == '!' && serialBuffer[1] == 'E' && c == 'M') {
      serialBuffer[serialBufferIdx++] = 'M';
      continue;
    }
    if (serialBufferIdx == 3 && serialBuffer[0] == '!' && serialBuffer[1] == 'E' && serialBuffer[2] == 'M' && c == 'G') {
      // !EMG detectado incondicionalmente!
      triggerEmergency("SERIAL_PRIORITY_EMG");
      serialBufferIdx = 0;
      continue;
    }

    if (c == '\n' || c == '\r') {
      if (serialBufferIdx > 0) {
        serialBuffer[serialBufferIdx] = '\0';
        executeCommand(serialBuffer);
        serialBufferIdx = 0;
      }
    } else {
      if (serialBufferIdx < SERIAL_BUF_SIZE - 1) {
        serialBuffer[serialBufferIdx++] = c;
      } else {
        // Overflow do buffer: descarta linha corrompida
        serialBufferIdx = 0;
      }
    }
  }
}

/**
 * Parser simplificado e resiliente de comandos JSON sem dependência de bibliotecas externas
 */
void executeCommand(char* buf) {
  // 1. Comando Prioritário !EMG ou {"cmd":"ESTOP"}
  if (strcmp(buf, "!EMG") == 0 || strstr(buf, "\"ESTOP\"") != NULL) {
    triggerEmergency("SERIAL_COMMAND");
    return;
  }

  // 2. Comando RESET
  if (strstr(buf, "\"RESET\"") != NULL) {
    currentState = STATE_IDLE_READY;
    currentActiveTarget = 0;
    clearAllLeds();
    soundReadyBeep();
    sendReadyEvent();
    return;
  }

  // Se estiver em estado de emergência e o comando não for RESET, rejeita
  if (currentState == STATE_EMERGENCY_STOP) {
    return;
  }

  // 3. Comando PING
  if (strstr(buf, "\"PING\"") != NULL) {
    sendPongEvent();
    return;
  }

  // 4. Comando START: Inicia rodada para um alvo com timeout
  // Formato: {"cmd":"START","tgt":1,"time":4000}
  if (strstr(buf, "\"START\"") != NULL) {
    char* tgtPtr = strstr(buf, "\"tgt\":");
    char* timePtr = strstr(buf, "\"time\":");

    if (tgtPtr != NULL && timePtr != NULL) {
      uint8_t tgt = atoi(tgtPtr + 6);
      unsigned long duration = strtoul(timePtr + 7, NULL, 10);

      if (tgt >= 1 && tgt <= NUM_TARGETS && duration > 0) {
        clearAllLeds();
        currentActiveTarget = tgt;
        targetDurationMs = duration;
        targetStartTime = millis();
        currentState = STATE_TARGET_ACTIVE;

        // Ilumina o alvo ativado
        setTargetLeds(tgt, true);
        playToneSequence(1000, 50); // Beep curto de início do alvo
      }
    }
    return;
  }

  // 5. Comando BUZZ: Teste manual de buzzer
  // Formato: {"cmd":"BUZZ","freq":1000,"dur":200}
  if (strstr(buf, "\"BUZZ\"") != NULL) {
    char* freqPtr = strstr(buf, "\"freq\":");
    char* durPtr = strstr(buf, "\"dur\":");
    if (freqPtr != NULL && durPtr != NULL) {
      uint16_t freq = atoi(freqPtr + 7);
      uint16_t dur = atoi(durPtr + 6);
      playToneSequence(freq, dur);
    }
    return;
  }

  // 6. Comando SET_LEDS: Teste manual de LEDs
  // Formato: {"cmd":"SET_LEDS","tgt":1,"mask":255}
  if (strstr(buf, "\"SET_LEDS\"") != NULL) {
    char* tgtPtr = strstr(buf, "\"tgt\":");
    if (tgtPtr != NULL) {
      uint8_t tgt = atoi(tgtPtr + 6);
      if (tgt == 0) {
        // Liga todos os LEDs
        for (uint8_t i = 1; i <= NUM_TARGETS; i++) setTargetLeds(i, true);
      } else {
        clearAllLeds();
        setTargetLeds(tgt, true);
      }
    }
    return;
  }

  // 7. Comando CALIB: Ajusta limiares de sensibilidade dos 5 sensores
  // Formato: {"cmd":"CALIB","thresh":[250,250,250,250,250]}
  if (strstr(buf, "\"CALIB\"") != NULL) {
    char* arrPtr = strstr(buf, "[");
    if (arrPtr != NULL) {
      arrPtr++;
      for (uint8_t i = 0; i < NUM_TARGETS; i++) {
        piezoThresholds[i] = atoi(arrPtr);
        char* comma = strchr(arrPtr, ',');
        if (comma) arrPtr = comma + 1;
        else break;
      }
      playToneSequence(1500, 40);
    }
    return;
  }
}

// ==============================================================================
// TRANSMISSÃO DE EVENTOS JSON (UPLINK: ARDUINO -> HOST/APLICATIVO)
// ==============================================================================
void sendReadyEvent() {
  Serial.print(F("{\"evt\":\"READY\",\"hw\":\"STA-UNO-R3\",\"fw\":\"1.0.0\",\"piezo\":["));
  for (uint8_t i = 0; i < NUM_TARGETS; i++) {
    Serial.print(piezoThresholds[i]);
    if (i < NUM_TARGETS - 1) Serial.print(F(","));
  }
  Serial.println(F("]}"));
}

void sendHitEvent(uint8_t target, uint16_t val) {
  Serial.print(F("{\"evt\":\"HIT\",\"tgt\":"));
  Serial.print(target);
  Serial.print(F(",\"val\":"));
  Serial.print(val);
  Serial.print(F(",\"ts\":"));
  Serial.print(millis());
  Serial.println(F("}"));
}

void sendWrongHitEvent(uint8_t target, uint16_t val, uint8_t expected) {
  Serial.print(F("{\"evt\":\"WRONG_HIT\",\"tgt\":"));
  Serial.print(target);
  Serial.print(F(",\"val\":"));
  Serial.print(val);
  Serial.print(F(",\"expected\":"));
  Serial.print(expected);
  Serial.print(F(",\"ts\":"));
  Serial.print(millis());
  Serial.println(F("}"));
}

void sendMissEvent(uint8_t target) {
  Serial.print(F("{\"evt\":\"MISS\",\"tgt\":"));
  Serial.print(target);
  Serial.print(F(",\"ts\":"));
  Serial.print(millis());
  Serial.println(F("}"));
}

void sendEstopAlertEvent(const char* src) {
  Serial.print(F("{\"evt\":\"ESTOP_ALERT\",\"src\":\""));
  Serial.print(src);
  Serial.print(F("\",\"ts\":"));
  Serial.print(millis());
  Serial.println(F("}"));
}

void sendPongEvent() {
  Serial.print(F("{\"evt\":\"PONG\",\"ts\":"));
  Serial.print(millis());
  Serial.println(F("}"));
}
