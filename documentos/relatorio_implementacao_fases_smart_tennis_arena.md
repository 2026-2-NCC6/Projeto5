# Relatório de Implementação e Conformidade — Smart Tennis Arena (FECAP 2026)

**Projeto Interdisciplinar:** Smart Tennis Arena — Treinos Gamificados de Tênis com IoT, Robótica, Sensores e Integração por API  
**Curso:** Ciência da Computação (6º Semestre) — FECAP  
**Data:** 04 de Novembro de 2026  
**Status do Projeto:** Fases 1, 2 e 3 implementadas e validadas com sucesso  

---

## 1. Resumo Executivo das Fases Implementadas

O projeto foi alinhado diretamente com as diretrizes do edital oficial `PI_6CCOMP_2026_Smart_Tennis_Arena_FINAL.pdf`, cobrindo as exigências de arquitetura, segurança física e lógica, conformidade com a LGPD, integração embarcada, modelagem formal e observabilidade.

| Fase | Título | Requisitos Contemplados | Status |
| :--- | :--- | :--- | :---: |
| **Fase 1** | Segurança, RBAC, LGPD, Mobile e Docker | `RF01`, `RF02`, `RF23`, Seções 3, 5 e 6 | **Concluída** |
| **Fase 2** | Modelagem Relacional, API de Treinos/Sessões, Marketplace e OpenAPI | `RF16`, `RF17`, `RF18`, `RF19`, `RF20`, `RF22`, `RF23`, Seções 5 e 9 | **Concluída** |
| **Fase 3** | Execução de Jogo, Simulador Spinshot, Pareamento IoT e Gamificação | `RF03`, `RF04`, `RF05`, `RF06`, `RF07`, `RF08`, `RF09`, `RF10`, `RF11`, `RF22` | **Concluída** |

---

## 2. Detalhamento das Entregas por Fase

### Fase 1 — Segurança, RBAC, LGPD, Compatibilidade Mobile e Docker
- **Bloqueio de Escalonamento de Privilégios (OWASP A01 / RF01):** O auto-cadastro público passou a permitir estritamente o perfil `JOGADOR`. Contas de `ADMIN` e `TREINADOR` agora exigem autorização administrativa explícita via endpoint autenticado (`POST /api/v1/users`).
- **Logout Seguro e Auditoria (RF01, RF23):** Implementado endpoint `POST /api/v1/auth/logout` com lista negra em memória de tokens revogados e registro do evento `LOGOUT`.
- **Proteção Reforçada de Menores e LGPD (Seções 3 e 5):** Criação dos campos de responsável legal (`guardianName`), consentimento parental explícito (`guardianConsent`) e consentimento de telemetria (`telemetryConsent`) no banco de dados e contratos. Implementação da minimização de dados de menores em visualizações não-administrativas e modo de anonimização pública para demonstrações acadêmicas (`?anonymize=true`).
- **Direito de Exclusão (LGPD Art. 18):** Endpoint `DELETE /api/v1/auth/me` para eliminação da própria conta, preservando as contas institucionais de demonstração.
- **Hardening HTTP e Sanitização:** Aplicação de cabeçalhos OWASP (`X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`), rate limiting anti-força bruta (`25 req/15min`), CORS controlado por ambiente e sanitização XSS de inputs.
- **Compatibilidade Mobile:** Resolução automática de IP local da LAN (`EXPO_PUBLIC_API_URL`), fallback de vibração háptica (`Vibration`) no Android/iOS e migração de credenciais web para `sessionStorage`.
- **Docker & Deploy:** Build multi-stage sem root (`USER node`) corrigindo o empacotamento monorepo.

### Fase 2 — Modelagem Relacional, APIs REST, Marketplace e OpenAPI
- **Modelagem Relacional Completa no MySQL (`db.ts`):** Criação das tabelas `categories`, `iot_devices`, `drills`, `drill_versions`, `training_sessions`, `session_events`, `safety_incidents`, `system_settings` e `mother_platform_sync_logs`.
- **Catálogo, Versionamento e Validador Pré-Publicação (`RF14`, `RF15`, `RF16`, `RF18`, `RF20`):** Validação formal determinística de limites Spinshot e regras Kids; histórico imutável de versões (`snapshot_json`) com changelog e metadados de marketplace.
- **Sessões Idempotentes e Telemetria (`RF12`, `RF13`, `RF19`, `RF21`):** Submissão de sessões protegida por `idempotencyKey` exclusivo; persistência de eventos de sensores (`session_events`) sujeita ao consentimento explícito LGPD do titular/responsável.
- **Parada Segura e Incidentes (`RF22`, `RF23`):** Registro imediato de `!EMG`, desconexões e falhas de sensores na tabela `safety_incidents` com auditoria crítica.
- **Documentação OpenAPI 3.0.3 e Explorador Interativo:** Disponibilização de `GET /api/v1/docs` (UI independente sem dependência de CDNs externas) e `GET /api/v1/openapi.json`.
- **Observabilidade Estruturada:** Injeção de `X-Correlation-Id` integrando Mobile, IoT e Backend API com logs JSON e métricas de latência (`avg`, `p95`, `max`).

### Fase 3 — Execução da Sessão, Simulador Spinshot, Pareamento IoT e Gamificação
- **Catálogo Dinâmico Conectado à API (`RF03`, `RF18`):** O componente `DrillCatalogCard.tsx` agora busca os treinos homologados via HTTP com filtros de busca textual, dificuldade e categoria, mantendo fallback gracioso offline.
- **Preparação e Checklist Pré-Sessão (`RF04`, Seção 5):** Novo modal `SessionPrepModal.tsx` exigindo confirmação de área de quadra desobstruída, equipamentos adequados e verificação de botão `!EMG` antes do disparo.
- **Controles de Pausar, Retomar e Abortar (`RF06`):** Implementação na FSM Mealy (`useGameEngine.ts`) e no Firmware (`smart_tennis_arduino.ino`) dos comandos `{"cmd":"PAUSE"}` e `{"cmd":"RESUME"}`, congelando o cronômetro do alvo ativo.
- **Simulador Oficial Spinshot Plus-2 (`RF09`):** Módulo `ballMachineSimulator.ts` calculando velocidade da bola (km/h), rotação (Topspin/Backspin/Flat), ângulo horizontal, elevação e tempo estimado de voo da bola, com limitação de segurança em 65 km/h para treinos infantis.
- **Pareamento Autorizado com Token IoT (`RF05`):** Validação criptográfica do token na API (`POST /api/v1/devices/pair`) e painel de diagnóstico dos 5 sensores piezoelétricos (`piezo1..piezo5`) no `HardwareModal.tsx`.
- **Tratamento de Desconexão Inadvertida e Registro de Motivo (`RF22`):** Interrupção imediata da partida em caso de desconexão física do cabo USB durante a sessão e modal interativo no `EmergencyStopButton.tsx` para reportar o motivo da parada à API.
- **HUD Integrado com Metas e Indicadores de Séries (`RF06`, `RF08`, `RF10`):** Componente `HardwareSensorHUD.tsx` exibindo status do hardware, metas alcançadas em tempo real e parâmetros do disparo da máquina.

---

## 3. Registro dos Prompts e Arquivos Gerados/Modificados

Abaixo está o registro formal de prompts do usuário que orientaram o desenvolvimento incremental do projeto, em conformidade com as diretrizes institucionais de uso responsável de IA da FECAP:

### Prompt 1
> *"analise todo o código atual do aplicativo desenvolvido neste projeto e verifique se ele cumpre todos os requisitos relatados no [PI_6CCOMP_2026_Smart_Tennis_Arena_FINAL.pdf]. Caso ele não cumpra, liste todos os requisitos que faltam ser implemenados"*

- **Arquivos Gerados/Consultados:**
  - `documentos/PI_6CCOMP_2026_Smart_Tennis_Arena_FINAL.pdf` (leitura integral de requisitos, regras de negócio e critérios de aceitação);
  - `.gemini/antigravity/brain/.../analise_requisitos_smart_tennis_arena.md` (relatório completo de conformidade requisito a requisito).

---

### Prompt 2
> *"Divida esses requisitos implementados parcialmente e os faltantes em fases de implementação e traga o plano aqui"*

- **Arquivos Gerados/Planejados:**
  - Estruturação do plano mestre de 6 fases progressivas de engenharia de software e hardware.

---

### Prompt 3
> *"siga a fases planejadas e inicie a implementação da fase 1, cuidando para não afetar e alterar mecânicas essenciais do projeto"*

- **Arquivos Criados/Modificados:**
  - `src/packages/shared/src/contracts/user.ts` (contratos de usuário, perfis e LGPD);
  - `src/packages/shared/src/security/validation.ts` (validação de privilégios RBAC, sanitização XSS e anonimização LGPD);
  - `src/packages/shared/src/index.ts` (exportação central de segurança);
  - `src/backend/.env.example` (variáveis de segurança, JWT e CORS);
  - `src/backend/src/config.ts` (resolução segura de segredos e rate limits);
  - `src/backend/src/middlewares/security.ts` (cabeçalhos OWASP, rate limiter e revogação de tokens);
  - `src/backend/src/middlewares/auth.ts` (verificação de tokens revogados no logout);
  - `src/backend/src/db.ts` (migrações automáticas de colunas LGPD e sementes);
  - `src/backend/src/controllers/authController.ts` (bloqueio de escalonamento, logout e exclusão LGPD);
  - `src/backend/src/controllers/userController.ts` (criação administrativa e anonimização de menores);
  - `src/backend/src/routes/authRoutes.ts` e `src/backend/src/routes/userRoutes.ts`;
  - `src/backend/src/server.ts` (rotas versionadas e limites de payload);
  - `src/backend/tsconfig.json` e `src/backend/package.json` (correção de rootDir e entrypoint compilado);
  - `src/backend/Dockerfile` e `src/backend/docker-compose.yml` (build multi-stage sem root);
  - `src/mobile/.env.example` (configuração de rede LAN Expo);
  - `src/mobile/src/services/api.ts` (resolução dinâmica de IP e token em sessionStorage);
  - `src/mobile/src/context/AccessibilityContext.tsx` (feedback háptico nativo com Vibration);
  - `src/mobile/src/context/AuthContext.tsx` (integração de logout e exclusão de conta);
  - `src/mobile/src/components/AuthModal.tsx` e `src/mobile/src/components/UserManagementModal.tsx` (campos de perfil RF02 e trava de privilégios);
  - `src/packages/shared/test/shared.test.ts` (ampliação de testes unitários para 15 testes).

---

### Prompt 4
> *"rode o aplicativo localmente"*

- **Ações e Arquivos Afetados:**
  - `src/backend/.env` (criação do ambiente de desenvolvimento local);
  - Inicialização do banco MySQL via script `start-mysql.bat`;
  - Instalação limpa de dependências no backend e mobile;
  - Execução dos servidores locais em background (`http://localhost:3001` e `http://localhost:8081`).

---

### Prompt 5
> *"Certo, aparentemente está tudo certo, comece a implementação da fase 2. Caso precise confirmar algum dado, pergunte"*

- **Arquivos Criados/Modificados:**
  - `src/packages/shared/src/contracts/drills.ts` (contratos de treinos, regras de pontuação, Spinshot e validador);
  - `src/packages/shared/src/contracts/sessions.ts` (contratos de telemetria, sessões e indicadores analíticos);
  - `src/packages/shared/src/contracts/admin.ts` (contratos de categorias, dispositivos IoT e incidentes);
  - `src/packages/shared/src/index.ts` (reexportação unificada de contratos);
  - `src/backend/src/config.ts` (parâmetros da Plataforma Mãe e token padrão IoT);
  - `src/backend/src/db.ts` (criação de 9 tabelas relacionais e sementes completas);
  - `src/backend/src/middlewares/auth.ts` (autenticação opcional para catálogo público);
  - `src/backend/src/middlewares/observability.ts` (middleware de Correlation ID e logs JSON);
  - `src/backend/src/services/motherPlatformService.ts` (adaptador e mock da Plataforma Mãe SmartTennis);
  - `src/backend/src/controllers/drillController.ts` e `src/backend/src/routes/drillRoutes.ts`;
  - `src/backend/src/controllers/sessionController.ts` e `src/backend/src/routes/sessionRoutes.ts`;
  - `src/backend/src/controllers/incidentController.ts` e `src/backend/src/routes/incidentRoutes.ts`;
  - `src/backend/src/controllers/adminController.ts` e `src/backend/src/routes/adminRoutes.ts`;
  - `src/backend/src/routes/motherPlatformRoutes.ts`;
  - `src/backend/src/docs/openapi.ts` (especificação OpenAPI 3.0.3 e interface HTML sem CDN);
  - `documentos/openapi-smart-tennis-arena.json` (especificação exportada em arquivo estático);
  - `src/mobile/src/services/api.ts` (métodos tipados para todos os novos endpoints);
  - `src/packages/shared/test/shared.test.ts` (expansão para 17 testes unitários automatizados).

---

### Prompt 6
> *"Como eu crio novos treinos pelo aplicativo?"*

- **Ações:**
  - Esclarecimento técnico sobre o fluxo via API/Swagger já ativo na Fase 2 e o planejamento da interface visual do Editor na Fase 5.

---

### Prompt 7 e 8
> *"não é necessário ter uma aba no aplicativo que permite a criação, edição e remoção de treinos para os perfis que tem essa permissão?"*  
> *"essa aba será implementada em alguma fase futura que já foi planejada?"*

- **Ações:**
  - Alinhamento da confirmação de que os requisitos RF14 e RF16 pertencem à Fase 5 do cronograma.

---

### Prompt 9
> *"explique um pouco mais o que será implementado na fase 3 (próxima). eu já consigo rodar o jogo real (hardware iot) via comandos dados no app/web e consigo o inverso - receber informações do hardware e apresentar elas na interface visual (app/web)? como funcionará na prática a utilização do aplicativo com o hardware arudino. eu preciso conectar o usb do arduino no notebook, selecionar a porta serial na aba 3 e o que mais?"*

- **Ações:**
  - Explicação prática e detalhada da arquitetura de comunicação serial física, protocolo de dados bidirecional e passos de operação em bancada.

---

### Prompt 10
> *"Certo, prossiga para a implementação da fase 3. Continue se certificando de não alterar estruturas e funções essenciais do aplicativo e aplicar código limpo e seguro. ao final da implementação, gere um relatório de tudo que foi aplicado e implementado até aqui, contendo os prompts que foram utilizados para gerar os códigos e os arquivos gerados por esses prompts. salve esse relatório na raiz da pasta documentos, em formato .md"*

- **Arquivos Criados/Modificados:**
  - `src/packages/shared/src/protocol/serial.ts` (adição dos comandos PAUSE, RESUME, FEED e eventos BALL_SHOT, ACK);
  - `src/firmware/smart_tennis_arduino/smart_tennis_arduino.ino` (suporte a PAUSE, RESUME, FEED e autoteste);
  - `src/mobile/src/hardware/ballMachineSimulator.ts` (simulador Spinshot Plus-2 com limites físicos e modo kids);
  - `src/mobile/src/fsm/useGameEngine.ts` (suporte a pausa/retomada, abortar, séries, metas e telemetria ISO 8601);
  - `src/mobile/src/components/SessionPrepModal.tsx` (modal de checklist pré-sessão e segurança RF04);
  - `src/mobile/src/components/DrillCatalogCard.tsx` (catálogo dinâmico conectado à API com busca e filtros RF03);
  - `src/mobile/src/components/EmergencyStopButton.tsx` (registro do motivo do incidente com salvamento na API RF22);
  - `src/mobile/src/components/HardwareSensorHUD.tsx` (HUD em tempo real com parâmetros Spinshot e metas RF06/RF09);
  - `src/mobile/src/components/TargetBoard.tsx` (controles integrados de Pausar, Retomar, Abortar e Parada Segura);
  - `src/mobile/src/components/HardwareModal.tsx` (diagnóstico individual dos 5 piezos e pareamento via token RF05);
  - `src/mobile/App.tsx` (integração dos componentes na aba principal da Arena);
  - `documentos/relatorio_implementacao_fases_smart_tennis_arena.md` (este relatório oficial).

---

## 4. Resultados de Verificação e Validação

1. **Testes Unitários Automatizados (`npm test`):**
   - 17 testes executados e **100% aprovados** sem regressão em regras de pontuação (`RN03`), enquadramento serial, segurança RBAC/OWASP, consentimento parental LGPD, validação formal de treinos e cálculo analítico de precisão e consistência.
2. **Checagem de Tipos TypeScript (`tsc --noEmit`):**
   - Backend API e Aplicativo Mobile compilaram com **zero erros** de tipagem.
3. **Serviços Ativos em Execução:**
   - Backend API: `http://localhost:3001` (Health: `UP`, Banco MySQL: `CONNECTED`).
   - Aplicativo Web: `http://localhost:8081` (200 OK com hot-reloading ativo).
   - Documentação OpenAPI: `http://localhost:3001/api/v1/docs` funcional.

