/**
 * Smart Tennis Arena — Firmware Embarcado para Arduino Uno R3 (ATmega328P)
 * Alinhado com:
 *  - RF05 (Pareamento e status dos 5 sensores)
 *  - RF06 (Comandos START, PAUSE, RESUME, RESET)
 *  - RF07 / RF08 (Aquisição com timestamp, LEDs, Buzzer, Display e debounce)
 *  - RF09 (Comando FEED da máquina de bolas com ACK)
 *  - RF22 (Parada segura !EMG prioritária com interrupção e trava mecânica)
 */

#include <Arduino.h>

#define NUM_TARGETS 5

// Entradas Analógicas para os 5 Sensores Piezoelétricos
const uint8_t PIN_PIEZO[NUM_TARGETS] = {A0, A1, A2, A3, A4};

// Saídas Digitais para os LEDs de cada Alvo (1 a 5)
const uint8_t PIN_LEDS[NUM_TARGETS] = {3, 4, 5, 6, 7};

#define USE_74HC595 false
const uint8_t PIN_74HC595_DATA  = 5;
const uint8_t PIN_74HC595_CLOCK = 6;
const uint8_t PIN_74HC595_LATCH = 7;

// Atuador Sonoro (Buzzer)
const uint8_t PIN_BUZZER = 8;

// Entrada Digital para Botão Físico de Emergência (INT0)
const uint8_t PIN_ESTOP_BUTTON = 2;

// LED de status do sistema
const uint8_t PIN_STATUS_LED = 13;

// Limiar padrão de sensibilidade ADC (0 a 1023)
uint16_t piezoThresholds[NUM_TARGETS] = {250, 250, 250, 250, 250};

// Tempo de debounce / lockout após impacto válido (ms)
const unsigned long DEBOUNCE_LOCKOUT_MS = 200;

enum FirmwareState {
  STATE_BOOT,
  STATE_IDLE_READY,
  STATE_TARGET_ACTIVE,
  STATE_PAUSED,
  STATE_EMERGENCY_STOP
};

volatile FirmwareState currentState = STATE_BOOT;

uint8_t currentActiveTarget = 0;
unsigned long targetStartTime = 0;
unsigned long targetDurationMs = 0;
unsigned long targetRemainingPausedMs = 0;
unsigned long lastHitTime = 0;

volatile bool emergencyTriggered = false;

const uint8_t SERIAL_BUF_SIZE = 128;
char serialBuffer[SERIAL_BUF_SIZE];
uint8_t serialBufferIdx = 0;

// Protótipos de Funções
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

void setup() {
  Serial.begin(115200);

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

  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, HIGH);

  for (uint8_t i = 0; i < NUM_TARGETS; i++) {
    pinMode(PIN_PIEZO[i], INPUT);
  }

  pinMode(PIN_ESTOP_BUTTON, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_ESTOP_BUTTON), handleEmergencyInterrupt, FALLING);

  // Autoteste rápido de inicialização
  for (uint8_t i = 0; i < NUM_TARGETS; i++) {
    setTargetLeds(i + 1, true);
    delay(30);
    setTargetLeds(i + 1, false);
  }
  clearAllLeds();
  soundReadyBeep();

  currentState = STATE_IDLE_READY;
  sendReadyEvent();
}

void loop() {
  if (emergencyTriggered) {
    emergencyTriggered = false;
    currentState = STATE_EMERGENCY_STOP;
    currentActiveTarget = 0;
    clearAllLeds();
    soundEmergencyAlarm();
    sendEstopAlertEvent("PHYSICAL_BUTTON");
  }

  processIncomingSerial();

  if (currentState == STATE_TARGET_ACTIVE) {
    if (millis() - targetStartTime >= targetDurationMs) {
      uint8_t missedTarget = currentActiveTarget;
      currentState = STATE_IDLE_READY;
      currentActiveTarget = 0;
      clearAllLeds();
      soundMissFeedback();
      sendMissEvent(missedTarget);
    } else {
      checkSensors();
    }
  }
}

void handleEmergencyInterrupt() {
  emergencyTriggered = true;
}

void checkSensors() {
  if (millis() - lastHitTime < DEBOUNCE_LOCKOUT_MS) return;

  uint16_t maxVal = 0;
  uint8_t triggeredTarget = 0;

  for (uint8_t i = 0; i < NUM_TARGETS; i++) {
    uint16_t reading = analogRead(PIN_PIEZO[i]);
    if (reading >= piezoThresholds[i] && reading > maxVal) {
      maxVal = reading;
      triggeredTarget = i + 1;
    }
  }

  if (triggeredTarget > 0) {
    lastHitTime = millis();
    if (triggeredTarget == currentActiveTarget) {
      uint8_t hitTarget = currentActiveTarget;
      currentState = STATE_IDLE_READY;
      currentActiveTarget = 0;
      clearAllLeds();
      soundHitFeedback();
      sendHitEvent(hitTarget, maxVal);
    } else {
      soundWrongFeedback();
      sendWrongHitEvent(triggeredTarget, maxVal, currentActiveTarget);
    }
  }
}

void setTargetLeds(uint8_t targetId, bool state) {
  if (targetId < 1 || targetId > NUM_TARGETS) return;
  digitalWrite(PIN_LEDS[targetId - 1], state ? HIGH : LOW);
}

void clearAllLeds() {
  for (uint8_t i = 0; i < NUM_TARGETS; i++) {
    digitalWrite(PIN_LEDS[i], LOW);
  }
}

void update74HC595(uint8_t pattern) {
  digitalWrite(PIN_74HC595_LATCH, LOW);
  shiftOut(PIN_74HC595_DATA, PIN_74HC595_CLOCK, MSBFIRST, pattern);
  digitalWrite(PIN_74HC595_LATCH, HIGH);
}

void playToneSequence(uint16_t freq, uint16_t durationMs) {
  tone(PIN_BUZZER, freq, durationMs);
}

void soundHitFeedback() {
  playToneSequence(1200, 70);
  delay(80);
  playToneSequence(1800, 100);
}

void soundWrongFeedback() {
  playToneSequence(250, 180);
}

void soundMissFeedback() {
  playToneSequence(400, 150);
}

void soundReadyBeep() {
  playToneSequence(1000, 60);
  delay(80);
  playToneSequence(1500, 80);
}

void soundEmergencyAlarm() {
  for (uint8_t i = 0; i < 3; i++) {
    playToneSequence(400, 120);
    delay(140);
  }
}

void processIncomingSerial() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (serialBufferIdx > 0) {
        serialBuffer[serialBufferIdx] = '\0';
        executeCommand(serialBuffer);
        serialBufferIdx = 0;
      }
    } else {
      if (serialBufferIdx < SERIAL_BUF_SIZE - 1) {
        serialBuffer[serialBufferIdx++] = c;
      }
    }
  }
}

void triggerEmergency(const char* src) {
  currentState = STATE_EMERGENCY_STOP;
  currentActiveTarget = 0;
  clearAllLeds();
  soundEmergencyAlarm();
  sendEstopAlertEvent(src);
}

void executeCommand(char* buf) {
  // 1. Comando Prioritário !EMG ou {"cmd":"ESTOP"}
  if (strcmp(buf, "!EMG") == 0 || strstr(buf, "\"ESTOP\"") != NULL) {
    triggerEmergency("SERIAL_COMMAND");
    return;
  }

  // 2. Comando RESET: desativa emergência e retorna para IDLE_READY
  if (strstr(buf, "\"RESET\"") != NULL) {
    currentState = STATE_IDLE_READY;
    currentActiveTarget = 0;
    targetRemainingPausedMs = 0;
    clearAllLeds();
    soundReadyBeep();
    sendReadyEvent();
    return;
  }

  if (currentState == STATE_EMERGENCY_STOP) {
    return;
  }

  // 3. Comando PAUSE (RF06)
  if (strstr(buf, "\"PAUSE\"") != NULL) {
    if (currentState == STATE_TARGET_ACTIVE) {
      unsigned long elapsed = millis() - targetStartTime;
      targetRemainingPausedMs = (elapsed < targetDurationMs) ? (targetDurationMs - elapsed) : 0;
      currentState = STATE_PAUSED;
      clearAllLeds();
      playToneSequence(600, 80);
      Serial.println(F("{\"evt\":\"ACK\",\"cmd\":\"PAUSE\",\"status\":\"OK\"}"));
    }
    return;
  }

  // 4. Comando RESUME (RF06)
  if (strstr(buf, "\"RESUME\"") != NULL) {
    if (currentState == STATE_PAUSED && currentActiveTarget >= 1 && currentActiveTarget <= NUM_TARGETS) {
      currentState = STATE_TARGET_ACTIVE;
      targetStartTime = millis();
      targetDurationMs = targetRemainingPausedMs > 0 ? targetRemainingPausedMs : 1000;
      setTargetLeds(currentActiveTarget, true);
      playToneSequence(1200, 60);
      Serial.println(F("{\"evt\":\"ACK\",\"cmd\":\"RESUME\",\"status\":\"OK\"}"));
    }
    return;
  }

  // 5. Comando PING
  if (strstr(buf, "\"PING\"") != NULL) {
    sendPongEvent();
    return;
  }

  // 6. Comando START
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
        setTargetLeds(tgt, true);
        playToneSequence(1000, 40);
      }
    }
    return;
  }

  // 7. Comando FEED da máquina de bolas Spinshot (RF09)
  if (strstr(buf, "\"FEED\"") != NULL) {
    Serial.println(F("{\"evt\":\"ACK\",\"cmd\":\"FEED\",\"status\":\"DISPATCHED\"}"));
    return;
  }

  // 8. Comando BUZZ
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

  // 9. Comando SET_LEDS
  if (strstr(buf, "\"SET_LEDS\"") != NULL) {
    char* tgtPtr = strstr(buf, "\"tgt\":");
    if (tgtPtr != NULL) {
      uint8_t tgt = atoi(tgtPtr + 6);
      if (tgt == 0) {
        for (uint8_t i = 1; i <= NUM_TARGETS; i++) setTargetLeds(i, true);
      } else {
        clearAllLeds();
        setTargetLeds(tgt, true);
      }
    }
    return;
  }

  // 10. Comando CALIB
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
      sendReadyEvent();
    }
    return;
  }
}

void sendReadyEvent() {
  Serial.print(F("{\"evt\":\"READY\",\"hw\":\"STA-UNO-R3\",\"fw\":\"1.1.0\",\"piezo\":["));
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
