# Plano Formal de Implementação — Fluxo Ponta a Ponta (E2E) Smart Tennis Arena

**Projeto:** Smart Tennis Arena (PI 6º CCOMP — FECAP 2026)  
**Escopo:** Especificação técnica de correções e complementos necessários no aplicativo, domínio compartilhado, backend e gateway IoT para garantir a execução integral e determinística do cenário funcional oficial.

---

## 1. Critério Oficial de Aceitação (Cenário Ponta a Ponta)

Conforme a Seção 9 do documento oficial do projeto (`documentos/PI_6CCOMP_2026_Smart_Tennis_Arena_FINAL.pdf`), o sistema será considerado funcional quando executar, sem falhas ou bloqueios, o seguinte fluxo contínuo:

1. Um autor cria e publica um treino no site (`RF01`, `RF14`, `RF15`, `RF16`, `RF20`);
2. O aplicativo obtém o treino publicado pela API (`RF03`, `RF18`, `RF21`);
3. O praticante conecta o dispositivo IoT e inicia a sessão (`RF04`, `RF05`, `RF06`);
4. Sensores e atuadores geram eventos e feedback em tempo real (`RF06`, `RF07`, `RF08`);
5. A máquina autorizada ou o simulador executa a sequência configurada (`RF09`);
6. O sistema calcula a pontuação, permite parada segura (`!EMG`), encerra a sessão e sincroniza os resultados para consulta no site (`RF10`, `RF12`, `RF13`, `RF17`, `RF19`, `RF21`, `RF22`, `RF23`).

---

## 2. Roteiro de Implementação por Prioridade

### Fase 1 (P0 — Bloqueadores Críticos de Execução e Segurança Física)

#### Passo 1.1 — Cancelamento de Timers na Parada Segura (`!EMG`), Pausa e Aborto (`RF06`, `RF22`)
- **Arquivo:** `src/mobile/src/fsm/useGameEngine.ts`
- **Problema atual:** Os `setTimeout(() => advanceNextStep(), 520)` em `handleHitEvent` e `setTimeout(() => advanceNextStep(), 600)` em `handleMissEvent` não são armazenados em `ref`, permitindo que uma transição de etapa dispare após `!EMG`, `PAUSE` ou `ABORT`, sobrescrevendo o estado `EMERGENCY_STOP`.
- **Implementação:**
  1. Criar `const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);`.
  2. Antes de agendar `advanceNextStep()` em `handleHitEvent` e `handleMissEvent`, limpar qualquer timer anterior em `transitionTimeoutRef.current`.
  3. Limpar `transitionTimeoutRef.current` dentro de `handleEmergencyStop`, `pauseSession`, `abortSession`, `startSession` e no `useEffect` de desmontagem.
  4. Garantir na entrada de `startStep` e `advanceNextStep` uma guarda explícita (`if (gameStateRef.current === GameState.EMERGENCY_STOP) return;`) usando um `gameStateRef` atualizado sincronamente.

#### Passo 1.2 — Suporte a `PAUSE`, `RESUME` e `FEED` no Simulador Serial (`RF06`, `RF09`)
- **Arquivo:** `src/mobile/src/hardware/mockSerialDriver.ts`
- **Problema atual:** `MockSerialDriver.send()` não trata os comandos `PAUSE`, `RESUME` e `FEED`. Ao pausar no modo `MOCK`, o `roundTimer` continua rodando, dispara `MISS` em segundo plano e trava o simulador ao retomar.
- **Implementação:**
  1. Adicionar propriedade `private pausedRemainingMs: number = 0;`.
  2. No `case 'PAUSE':`: cancelar `this.roundTimer` com `clearRoundTimer()`, calcular o tempo restante (`Math.max(0, this.roundDurationMs - (Date.now() - this.roundStartTime))`), armazenar em `this.pausedRemainingMs`, registrar log `RX` e emitir `{ evt: 'ACK', cmd: 'PAUSE', status: 'OK' }`.
  3. No `case 'RESUME':`: se `this.activeTarget` existir, reiniciar `this.roundTimer` com `this.pausedRemainingMs > 0 ? this.pausedRemainingMs : 1000`, atualizar `this.roundStartTime = Date.now()`, registrar log `RX` e emitir `{ evt: 'ACK', cmd: 'RESUME', status: 'OK' }`.
  4. No `case 'FEED':`: registrar o disparo simulado (`speed`, `spin`, `elev`, `angle`) no log `RX` e emitir `{ evt: 'ACK', cmd: 'FEED', status: 'DISPATCHED' }` (alinhado ao firmware `smart_tennis_arduino.ino`).

#### Passo 1.3 — Fallback de Timeout na FSM e Execução no Modo `REMOTE_GATEWAY` (`RF05`, `RF06`)
- **Arquivos:** `src/mobile/src/fsm/useGameEngine.ts`, `src/backend/src/services/hardwareGateway.ts`
- **Problema atual:** Quando o cronômetro da etapa em `useGameEngine` chega a `0 ms`, ele não dispara `handleMissEvent`, dependendo 100% do driver serial. No modo `REMOTE_GATEWAY` sem Arduino físico acoplado ao Host, o treino congela no passo 1 e `tapTargetSimulated` fica bloqueado fora do modo `MOCK`.
- **Implementação:**
  1. Em `useGameEngine.ts`, adicionar um timer de segurança (`missFallbackTimerRef`) com folga de `+150 ms` sobre `effectiveDuration` caso nenhum evento `HIT`/`MISS` chegue do hardware ou da ponte dentro da janela esperada (cancelado em `handleHitEvent`, `handleMissEvent`, `pauseSession`, `abortSession` e `handleEmergencyStop`).
  2. Em `tapTargetSimulated(targetId)`, permitir simulação de toque também quando `hardwareManager.mode === 'REMOTE_GATEWAY'` caso o gateway esteja sem Arduino físico conectado (enviando ou processando o impacto simulado de teste).
  3. Opcionalmente, conectar o `hostGatewayBridge` também quando o Host PC estiver operando em modo `MOCK`, permitindo demonstração completa PC ↔ Celular mesmo sem placa Arduino conectada na USB.

#### Passo 1.4 — Correção do Controle de Múltiplas Séries (`RF10`)
- **Arquivo:** `src/mobile/src/fsm/useGameEngine.ts`
- **Problema atual:** `advanceNextStep` lê `currentSeries` de uma closure potencialmente desatualizada capturada por `handleSerialEvent`.
- **Implementação:**
  1. Criar `const currentSeriesRef = useRef<number>(1);` e sincronizar `currentSeriesRef.current = currentSeries;`.
  2. Em `advanceNextStep` e `startStep`, usar `currentSeriesRef.current < totalSeries` para decidir entre avançar para `currentSeriesRef.current + 1` (atualizando a ref e o estado) ou chamar `completeSession()`.

#### Passo 1.5 — Suporte aos Eventos `TAP` e `POLL` no Parser Serial (`RF05`, `RF07`)
- **Arquivos:** `src/packages/shared/src/protocol/serial.ts`, `src/mobile/src/hardware/mockSerialDriver.ts`, `src/mobile/src/components/HardwareModal.tsx`
- **Problema atual:** O firmware `smart_tennis_arduino.ino` envia `{"evt":"TAP",...}` e `{"evt":"POLL","raw":[...]}`, mas `parseSerialFrame` os descarta como desconhecidos. Além disso, `HardwareModal.tsx` só atualiza `piezoSensors` via log `RX` de `READY`, o que não é emitido no `MockSerialDriver`.
- **Implementação:**
  1. Adicionar interfaces `TapEvent` (`evt: 'TAP'`, `tgt`, `val`, `ts`) e `PollEvent` (`evt: 'POLL'`, `raw: number[]`) à união `SerialEvent` e aos casos de `parseSerialFrame` em `serial.ts`.
  2. Em `MockSerialDriver.connect()`, registrar `this.notifyLog('RX', JSON.stringify(readyEvent))` para manter paridade com o `WebSerialDriver`.
  3. Em `HardwareModal.tsx`, escutar também eventos `READY` e `POLL` via `hardwareManager.addEventListener` para atualizar os cards de calibração e diagnóstico dos 5 piezos em tempo real.

---

### Fase 2 (P1 — Regras de Negócio, Catálogo, Editor e Sincronização)

#### Passo 2.1 — Pontuação Parametrizada por Treino (`RF10`, `RF14`)
- **Arquivos:** `src/packages/shared/src/rules/scoring.ts`, `src/mobile/src/fsm/useGameEngine.ts`
- **Problema atual:** `calculateHitScore` usa constantes fixas (`P_BASE = 100`, `WRONG_TARGET_PENALTY = -30`, multiplicador máximo `1.5x`), ignorando `selectedDrill.scoringRules`.
- **Implementação:**
  1. Estender `ScoreCalculationParams` em `scoring.ts` com campo opcional `rules?: Partial<DrillScoringRules>`.
  2. Aplicar `rules.basePoints ?? 100`, `rules.timeBonusWeight ?? 1`, `rules.maxStreakMultiplier ?? 1.5`, `rules.wrongTargetPenalty ?? -30` e `rules.kidsWrongTargetPenalty ?? 0`.
  3. Em `useGameEngine.ts`, passar `rules: selectedDrill.scoringRules` nas chamadas a `calculateHitScore` em `handleHitEvent` e `handleWrongHitEvent`.

#### Passo 2.2 — Envio de Comandos de Atuadores e Máquina Lançadora (`RF08`, `RF09`)
- **Arquivo:** `src/mobile/src/fsm/useGameEngine.ts`
- **Problema atual:** `startStep` não envia o comando `{ cmd: 'FEED', ... }` ao driver serial nem respeita `step.feedIntervalMs`; tampouco envia comandos `DISPLAY`, `BUZZ` ou `SET_LEDS`.
- **Implementação:**
  1. Em `startStep`, após `ballMachineSimulator.executeShotForStep(step, isKidsMode)`, enviar `{ cmd: 'FEED', speed, spin, elev, angle }` via `driver.send(...)`.
  2. Atualizar o display de 7 segmentos (`{ cmd: 'DISPLAY', val: ... }`) no início da sessão, acertos, pausa e fim de sessão.
  3. Utilizar `step.feedIntervalMs ?? 550` como atraso de transição entre passos em `handleHitEvent` e `handleMissEvent`.

#### Passo 2.3 — Sincronização Completa de Sessão, LGPD e Recibo da Plataforma Mãe (`RF12`, `RF19`, `RF22`)
- **Arquivos:** `src/mobile/src/fsm/useGameEngine.ts`, `src/mobile/src/components/SessionSummaryModal.tsx`, `src/mobile/App.tsx`
- **Problema atual:** `syncSessionResult` não envia `stopReason` nem `telemetryLog`, fixa `telemetryAuthorized` como `!isKidsMode` ignorando o perfil `RF02` e descarta `motherPlatformReceipt`, `evolutionDeltaScore` e `recommendations` retornados por `POST /api/v1/sessions`.
- **Implementação:**
  1. Passar o perfil/consentimento do usuário (`user?.profile`) para `useGameEngine` e calcular `telemetryAuthorized` respeitando `user?.profile?.telemetryConsent` e `guardianConsent` (para `KIDS`).
  2. Armazenar o motivo da parada (`stopReasonRef`) quando `handleEmergencyStop` ou `abortSession` forem acionados e incluí-lo no payload de `api.submitSession`, junto com `events: telemetryLog`.
  3. Retornar de `api.submitSession` o objeto completo da resposta (`motherPlatformReceipt`, `evolutionDeltaScore`, `recommendations`) e salvá-lo no estado do `useGameEngine` para exibição no `SessionSummaryView`.

#### Passo 2.4 — Filtros Completos e Isolamento de Rascunhos no Catálogo (`RF03`, `RF16`, `RF18`)
- **Arquivos:** `src/mobile/App.tsx`, `src/mobile/src/components/DrillCatalogCard.tsx`
- **Problema atual:** `App.tsx` e `DrillCatalogCard.tsx` listam todos os treinos (inclusive `DRAFT` e `REVIEW`) na Arena e não oferecem filtros de dificuldade, duração máxima e sensores requeridos.
- **Implementação:**
  1. Filtrar o catálogo da Arena para exibir somente treinos com `status === 'PUBLISHED'` (mantendo `DRAFT`/`REVIEW` visíveis apenas no Editor para `TREINADOR`/`ADMIN`).
  2. Adicionar chips/seletores na barra de filtros do `DrillCatalogCard.tsx` para:
     - **Dificuldade** (`1` a `5`);
     - **Duração máxima** (ex.: `<= 20s`, `<= 40s`, `Todas`);
     - **Sensores requeridos** (`PIEZO_TARGETS`, `LED_RING`, `BUZZER`, `BALL_MACHINE_SIM`).

#### Passo 2.5 — Editor de Treinos Completo, Versões Imutáveis e Proteção RBAC (`RF01`, `RF14`, `RF15`, `RF16`)
- **Arquivos:** `src/mobile/src/components/DrillEditorModal.tsx`, `src/backend/src/routes/drillRoutes.ts`
- **Problema atual:** Qualquer usuário não autenticado ou `JOGADOR` pode criar/publicar treinos na API; não há edição de `scoringRules` nem parâmetros avançados da máquina; e `api.getDrillVersions` não é exibido.
- **Implementação:**
  1. Em `drillRoutes.ts`, proteger `POST /drills`, `PUT /drills/:id`, `POST /drills/:id/status` e `PATCH /drills/:id/status` com `authenticateToken` e `requireRole('TREINADOR', 'ADMIN')`.
  2. Em `DrillEditorModal.tsx`, bloquear/ocultar ações de publicação quando o usuário logado não for `TREINADOR` ou `ADMIN`, exibindo aviso de RBAC.
  3. Adicionar seção de edição para `scoringRules` (`basePoints`, `seriesCount`, `targetScoreGoal`, `minAccuracyPercent`, `wrongTargetPenalty`) e campos por etapa (`elevationDeg`, `horizontalAngleDeg`, `feedIntervalMs`, `oscillationMode`).
  4. Carregar e renderizar o histórico oficial de versões via `api.getDrillVersions(editingId)` na coluna direita do Editor.

---

### Fase 3 (P2 — Gestão Administrativa Completa e Persistência Offline Nativa)

#### Passo 3.1 — Painel Administrativo Unificado (`RF17`, `RF23`)
- **Arquivo:** `src/mobile/src/components/UserManagementModal.tsx`
- **Problema atual:** A aba **5. Gestão** exibe apenas Usuários e Logs de Auditoria, embora `api.ts` e `adminController.ts` já implementem todos os endpoints administrativos.
- **Implementação:**
  1. Adicionar sub-abas/seções dentro de `ManagementView` (visíveis conforme RBAC `ADMIN`/`TREINADOR`):
     - **Usuários & Perfis (`RF02`/`RF17`)** (já existente);
     - **Dispositivos IoT (`RF05`/`RF17`)**: listar via `api.listDevices()`, cadastrar via `api.registerDevice()`, calibrar thresholds e alternar status via `api.updateDevice()`;
     - **Categorias & Parâmetros (`RF17`)**: gerenciar via `api.listCategories()`, `createCategory()`, `listSystemSettings()` e `updateSystemSetting()`;
     - **Incidentes `!EMG` & Plataforma Mãe (`RF19`/`RF22`)**: listar e resolver via `api.listSafetyIncidents()` / `resolveSafetyIncident()` e consultar recibos via `api.getMotherPlatformSyncLogs()`.

#### Passo 3.2 — Persistência Offline Real em Dispositivos Mobile Android/iOS (`RF01`, `RF21`)
- **Arquivos:** `src/mobile/package.json`, `src/mobile/src/services/api.ts`
- **Problema atual:** `StorageHelper` depende de `window.localStorage`/`sessionStorage`, usando apenas `Map` em memória no React Native nativo.
- **Implementação:**
  1. Instalar `@react-native-async-storage/async-storage` em `src/mobile`.
  2. Atualizar `StorageHelper` para persistir e hidratar assincronamente `DRILLS_CACHE_KEY`, `OFFLINE_SESSIONS_KEY`, `SESSIONS_HISTORY_CACHE_KEY` e o token de sessão no `AsyncStorage` quando `Platform.OS !== 'web'`, garantindo operação offline real entre reinicializações do app no celular.

---

## 3. Critério de Verificação Ponta a Ponta após Implementação

Após aplicar as Fases 1 a 3, validar o cenário completo executando:
1. Login como **Treinador** → criar treino na aba **3. Editor**, configurar `scoringRules` e sequência Spinshot, executar simulação (`RF15`) e publicar (`PUBLISHED` v1.0.0);
2. Login como **Atleta** → atualizar catálogo na aba **1. Arena**, filtrar o treino publicado, conferir o modal de preparação (`RF04`) e confirmar checklist;
3. Conectar dispositivo IoT na aba **4. Hardware** (`MOCK` ou `WEB_SERIAL` / `REMOTE_GATEWAY`) e validar pareamento (`RF05`);
4. Iniciar sessão → testar **Pausar/Retomar** (`RF06`), registrar acertos/erros nos alvos (`RF07`–`RF10`) e validar **Parada Segura (`!EMG`)** (`RF22`) verificando que nenhum comando/passo avança após a trava até o **Reset** explícito;
5. Concluir uma sessão completa (online e offline), verificar o **Recibo da Plataforma Mãe** e recomendações na aba **2. Resumo** (`RF12`, `RF19`, `RF21`) e confirmar a persistência da sessão, incidente e auditoria no banco MySQL via aba **5. Gestão** (`RF13`, `RF17`, `RF23`).
