# Plano de Implementação das Próximas Fases — Smart Tennis Arena (FECAP 2026)

**Projeto Interdisciplinar:** Smart Tennis Arena — Treinos Gamificados de Tênis com IoT, Robótica, Sensores e Integração por API  
**Curso:** Ciência da Computação (6º Semestre) — FECAP  
**Data:** 04 de Novembro de 2026  
**Documento de Referência:** `PI_6CCOMP_2026_Smart_Tennis_Arena_FINAL.pdf`  
**Escopo Deste Documento:** Detalhamento arquitetural, funcional e de engenharia das **Fases 4, 5 e 6**.

---

## 1. Visão Geral das Próximas Fases

Após a conclusão com sucesso das **Fases 1, 2 e 3** (que estabeleceram a segurança/RBAC/LGPD, a modelagem relacional com API REST/OpenAPI, e a dinâmica completa da partida com simulador Spinshot, firmware atualizado e hardware HUD), o projeto avança para a consolidação analítica, ferramentas visuais de autoria e validação de aceitação ponta a ponta.

| Fase | Título | Requisitos Contemplados | Foco Principal |
| :---: | :--- | :--- | :--- |
| **Fase 4** | Operação Offline, Resumo Avançado e Histórico com Indicadores Analíticos | `RF12`, `RF13`, `RF21`, Seção 5 (Resiliência) | Sincronização offline idempotente, tela de resumo com metas/recomendações e dashboard analítico com gráficos de evolução. |
| **Fase 5** | Editor Visual de Treinos, Validador Pré-Publicação e Gestão Administrativa | `RF14`, `RF15`, `RF16`, `RF17`, `RF20` | Aba completa no app para Treinadores/Admins criarem, editarem e publicarem treinos com simulador prévio e metadados de marketplace. |
| **Fase 6** | Validação do Cenário Oficial de Aceitação, Medição de Latência e Testes E2E | Seção 5 (Desempenho), Seção 9 (Cenário Ponta a Ponta) | Bateria de testes automatizados integrados, aferição do SLO de latência (< 50ms) e checklist dos entregáveis finais da FECAP. |

---

## 2. Fase 4 — Operação Offline, Resumo Avançado e Histórico com Indicadores Analíticos

### 2.1 Objetivos da Fase
Permitir que o atleta realize sessões mesmo sem conexão ativa com a internet na quadra (operação em modo degradado seguro), garantindo que os resultados sejam enfileirados localmente e sincronizados de forma idempotente assim que a rede for restabelecida. Além disso, enriquecer a experiência pós-treino com análise de desempenho e histórico longitudinal com gráficos de progressão.

### 2.2 Requisitos Funcionais Contemplados
- **`RF21` — Operação Offline e Sincronização Posterior (Mobile/IoT):**
  - Armazenamento em cache persistente local (`AsyncStorage` / `localStorage`) dos treinos homologados recebidos da API;
  - Criação da fila de sincronização offline (`OfflineSyncQueue`) que armazena os payloads de sessões concluídas offline acompanhados de chave de idempotência (`idempotencyKey`);
  - Detector de conectividade de rede (`NetInfo` / `window.ononline`) que dispara automaticamente o esvaziamento da fila enviando para `POST /api/v1/sessions`;
  - Ativação formal dos estados da FSM Mealy: `GameState.SYNCING`, `EV_BEGIN_SYNC`, `EV_SYNC_SUCCESS` e `EV_SYNC_OFFLINE`.
- **`RF12` — Resultado Completo da Sessão (Mobile):**
  - Expansão do componente `SessionSummaryModal.tsx` para apresentar:
    1. **Metas atingidas:** Verificação clara se a pontuação-alvo e a precisão mínima do treino foram superadas;
    2. **Indicador de evolução:** Comparativo percentual de ganho de pontuação e tempo de reação em relação à última sessão do mesmo treino;
    3. **Linha do tempo de eventos:** Exibição cronológica dos impactos, erros e avisos registrados durante os disparos;
    4. **Recomendações técnicas automatizadas:** Algoritmo heurístico que sugere o próximo treino ou zona de foco (ex.: maior índice de erro no Alvo 2 / Backhand Fundo).
- **`RF13` — Histórico de Sessões e Indicadores Analíticos (Mobile/Site):**
  - Criação de uma nova aba ou tela dedicada de **Histórico & Analytics**:
    - Filtros dinâmicos por **período** (últimos 7 dias, 30 dias, personalizado) e por **treino**;
    - Indicadores consolidados: **Precisão global (%)**, **Consistência neuromuscular** (desvio-padrão dos tempos de reação em ms), **Volume total** (disparos e tempo acumulado em quadra) e **Melhor pontuação**;
    - Gráfico interativo de curva de progressão temporal (evolução das sessões) utilizando biblioteca leve e acessível compatível com React Native Web e Mobile.

### 2.3 Arquivos Previstos para Criação / Modificação
- `src/mobile/src/services/offlineSyncQueue.ts` *(Novo)*: Fila persistente com retry exponencial e chave de idempotência;
- `src/mobile/src/components/SessionSummaryModal.tsx` *(Modificação)*: Inclusão de abas de eventos, metas e recomendações;
- `src/mobile/src/components/AnalyticsView.tsx` *(Novo)*: Tela com filtros de data/treino, cartões de KPI e gráficos de progressão;
- `src/mobile/App.tsx` *(Modificação)*: Inclusão da aba de Analytics e indicador visual de status de sincronização (Online / Offline / Sincronizando).

---

## 3. Fase 5 — Editor Visual de Treinos, Validador Pré-Publicação e Gestão Administrativa

### 3.1 Objetivos da Fase
Implementar no aplicativo a interface visual de autoria para os perfis que possuem permissão (`TREINADOR` e `ADMIN`), permitindo construir novos protocolos de treino do zero, configurar a máquina lançadora de bolas Spinshot, validar regras formalmente antes da publicação e gerenciar todo o ciclo de vida dos treinos e do ecossistema.

### 3.2 Requisitos Funcionais Contemplados
- **`RF14` — Editor de Treinos (Site / App Web):**
  - Criação da aba/modal **Editor de Treinos**, acessível exclusivamente quando autenticado como Treinador ou Administrador;
  - Formulário intuitivo estruturado:
    - **Dados Gerais:** Título, descrição técnica/pedagógica, objetivo, categoria esportiva, nível de dificuldade (1 a 5) e faixa etária recomendada;
    - **Público e Adaptação:** Seletor de público (`Adulto` ou `Kids`); quando selecionado Modo Kids, impõe automaticamente os limites de velocidade segura (máx 65 km/h) e penalidade zero;
    - **Sequência de Exercícios (Passo a Passo):** Interface visual da quadra para selecionar o alvo de cada disparo (1 a 5), definir a janela de tempo dos sensores (800ms a 15000ms), velocidade da bola (km/h), efeito/spin (Topspin, Backspin ou Flat), ângulo de lançamento e intervalo de alimentação;
    - **Regras de Pontuação:** Pontos base, bônus temporal, penalidade por erro, meta de pontuação e número de séries;
    - **Instruções Pré-Sessão:** Posicionamento em quadra, equipamentos exigidos e avisos de segurança física.
- **`RF15` — Simulação e Validação Pré-Publicação (Site / App):**
  - Botão de **Simulação Prévia**: executa virtualmente no navegador a sequência de disparos programada com a máquina Spinshot virtual e os LEDs acendendo na quadra, permitindo ao autor testar o ritmo do exercício antes de salvar;
  - Integração com o validador determinístico `POST /api/v1/drills/validate`, apontando alertas e inconsistências (ex.: janela de tempo muito curta, velocidades fora dos limites físicos da Spinshot).
- **`RF16` — Versionamento e Publicação de Treinos (Site / API):**
  - Gerenciamento de status do ciclo de vida: `Rascunho (DRAFT)`, `Em Revisão (IN_REVIEW)`, `Publicado (PUBLISHED)` e `Arquivado (ARCHIVED)`;
  - Histórico de versões com numeração semântica (`v1.0.0`, `v1.0.1`), changelog obrigatório em alterações e gravação de snapshots imutáveis no banco de dados;
  - Disparo de evento de publicação para a Plataforma Mãe SmartTennis via `recordDrillPublicationOnMotherPlatform`.
- **`RF17` — Gestão Administrativa Completa (Site / App):**
  - Expansão do painel administrativo para:
    - Gerenciamento de treinos criados (editar, mudar status ou arquivar/remover);
    - Gerenciamento de categorias de treinos;
    - Gerenciamento de controladores IoT pareados (status, reinicialização e atualização de limiares piezo);
    - Consulta e ajuste dos parâmetros gerais do sistema (`system_settings`).
- **`RF20` — Metadados de Marketplace (Site / API):**
  - Aba de metadados comerciais no editor: descrição para catálogo, modelo de remuneração futuro (gratuito, avulso, assinatura, rev-share), licença de uso e compatibilidade de hardware/máquinas, sem cobrança financeira obrigatória no MVP.

### 3.3 Arquivos Previstos para Criação / Modificação
- `src/mobile/src/components/DrillEditorModal.tsx` *(Novo)*: Componente com formulário de etapas, construtor de sequência na quadra e seletor Spinshot;
- `src/mobile/src/components/DrillSimulatorModal.tsx` *(Novo)*: Simulador pré-publicação com preview animado da trajetória e alvos;
- `src/mobile/src/components/AdminManagementTabs.tsx` *(Novo)*: Abas administrativas completas (Treinos, Dispositivos IoT, Categorias e Configurações);
- `src/mobile/App.tsx` *(Modificação)*: Adição do botão `+ Criar Treino` e menu administrativo para Treinadores e Admins.

---

## 4. Fase 6 — Validação do Cenário Oficial de Aceitação, Medição de Latência e Testes E2E

### 4.1 Objetivos da Fase
Garantir o cumprimento estrito dos critérios de aceitação formal exigidos pela FECAP (Seções 5, 6 e 9 do edital), executando o cenário oficial de ponta a ponta sem qualquer interrupção, aferindo os índices de latência em eventos críticos e consolidando os relatórios acadêmicos finais de entrega.

### 4.2 Requisitos e Critérios Contemplados
- **Validação do Cenário Obrigatório de Aceitação Ponta a Ponta (Seção 9, pág. 6):**
  1. *Autor cria e publica um treino no site:* Treinador acessa o Editor, monta o treino e publica com validação formal;
  2. *Aplicativo obtém o treino pela API:* O app consome o novo treino via `GET /api/v1/drills` e renderiza no catálogo;
  3. *Praticante conecta o dispositivo IoT e inicia a sessão:* Autenticação via token de pareamento e confirmação no checklist pré-sessão;
  4. *Sensores e atuadores geram eventos e feedback:* Piezos transmitem `HIT`/`WRONG_HIT`/`MISS`, LEDs e buzzer respondem imediatamente;
  5. *Máquina autorizada ou simulador executa a sequência:* O simulador Spinshot dispara as bolas com velocidade, spin e ângulos sincronizados;
  6. *Sistema calcula pontuação, permite parada segura e encerra a sessão:* Pontuação gamificada calculada, teste do botão `!EMG` com registro de motivo e encerramento com sucesso;
  7. *Sincroniza resultados para consulta no site:* Dados transmitidos via `POST /api/v1/sessions` com persistência de telemetria LGPD e recibo na Plataforma Mãe.
- **Aferição do SLO de Desempenho e Latência Crítica (Seção 5):**
  - Medição do tempo decorrido entre o impacto no sensor piezoelétrico (`A0..A4`), o processamento pelo firmware, a transmissão serial e a renderização no aplicativo visual (Meta de latência: **< 50ms** para eventos locais críticos);
  - Medição da latência de propagação do comando prioritário de emergência (`!EMG`).
- **Suíte de Testes Automatizados Expandida (Unitários, Integração e FSM):**
  - Testes automatizados das transições da FSM Mealy (`useGameEngine`);
  - Testes de integração das rotas do backend com banco de dados MySQL;
  - Teste de consistência de idempotência e tolerância a falhas na fila offline.
- **Consolidação de Entregáveis FECAP:**
  - Validação dos contêineres Docker (`docker compose up`);
  - Relatório final de conformidade para a Semana FECAP de Tecnologia com evidências fotográficas, diagramas de arquitetura e roteiro de demonstração/pitch de 4 minutos.

---

## 5. Matriz de Rastreabilidade Completa dos Requisitos (RF01 a RF23)

A tabela a seguir apresenta o mapa definitivo de atendimento a todos os 23 Requisitos Funcionais do edital:

| ID | Funcionalidade | Fase de Implementação | Componentes Técnicos Principais |
| :---: | :--- | :---: | :--- |
| **RF01** | Autenticação e perfis | **Fase 1** *(Concluída)* | `authController.ts`, `authRoutes.ts`, `AuthModal.tsx`, JWT com revogação e RBAC |
| **RF02** | Perfil do praticante | **Fase 1** *(Concluída)* | `player_profiles`, `AuthModal.tsx`, campos de metas, restrições e consentimentos LGPD |
| **RF03** | Catálogo de treinos | **Fase 3** *(Concluída)* | `DrillCatalogCard.tsx`, busca textual, filtros por categoria, dificuldade e público |
| **RF04** | Detalhes e preparação | **Fase 3** *(Concluída)* | `SessionPrepModal.tsx`, checklist de área segura e regras de pontuação |
| **RF05** | Pareamento de dispositivo | **Fase 3** *(Concluída)* | `HardwareModal.tsx`, `pairDevice`, diagnóstico dos 5 piezos, chave/token protegido |
| **RF06** | Execução da sessão | **Fase 3** *(Concluída)* | `useGameEngine.ts`, `TargetBoard.tsx`, botões Pausar, Retomar, Abortar e Metas HUD |
| **RF07** | Aquisição de sensores | **Fase 3** *(Concluída)* | `smart_tennis_arduino.ino`, leitura analógica ADC, debounce e timestamps ISO 8601 |
| **RF08** | Controle de atuadores | **Fase 3** *(Concluída)* | `smart_tennis_arduino.ino`, LEDs dos alvos, buzzer PWM e feedback luminoso/sonoro |
| **RF09** | Comandos da máquina / simulador | **Fase 3** *(Concluída)* | `ballMachineSimulator.ts`, parâmetros Spinshot (velocidade, spin, elevação, voo) |
| **RF10** | Pontuação gamificada | **Fase 3** *(Concluída)* | `scoring.ts`, bônus temporal, bônus ADC, séries, metas e streak combo |
| **RF11** | Modos por público (Kids/Adulto) | **Fase 3** *(Concluída)* | Teto de 65 km/h, penalidade zero Kids, estrelas e narrativa lúdica no app |
| **RF12** | Resultado da sessão | **Fase 4** *(Próxima)* | `SessionSummaryModal.tsx`, metas atingidas, evolução delta e recomendações |
| **RF13** | Histórico e indicadores | **Fase 4** *(Próxima)* | `AnalyticsView.tsx`, filtros por período/treino, gráficos de progressão temporal |
| **RF14** | Editor de treinos | **Fase 5** | `DrillEditorModal.tsx`, formulário visual de sequências, alvos e máquina |
| **RF15** | Simulação e validação | **Fase 5** | `DrillSimulatorModal.tsx`, teste prévio animado e validação determinística de regras |
| **RF16** | Versionamento e publicação | **Fase 5** | `drill_versions`, status DRAFT/PUBLISHED, changelog e compatibilidade |
| **RF17** | Gestão administrativa | **Fase 5** | `AdminManagementTabs.tsx`, CRUD de treinos, categorias, dispositivos e parâmetros |
| **RF18** | Consumo de treinos | **Fase 2** *(Concluída)* | `GET /api/v1/drills`, documentação OpenAPI 3.0.3 e cliente HTTP mobile |
| **RF19** | Envio de resultados | **Fase 2** *(Concluída)* | `POST /api/v1/sessions`, telemetria LGPD e mock da Plataforma Mãe SmartTennis |
| **RF20** | Metadados de marketplace | **Fase 2 & 5** | Modelos relacionais criados na Fase 2; interface visual de autoria na Fase 5 |
| **RF21** | Operação offline | **Fase 4** *(Próxima)* | `offlineSyncQueue.ts`, cache de treinos e sincronização automática com idempotência |
| **RF22** | Parada segura | **Fase 3** *(Concluída)* | `!EMG`, trava física no Arduino, tratamento de desconexão e registro de motivo |
| **RF23** | Auditoria e logs | **Fase 1, 2 & 3** *(Concluída)* | `audit_logs` enriquecida, Correlation ID ponta a ponta e logs de incidentes |

---

## 6. Próximo Passo Recomendado

Com a aprovação deste planejamento, o próximo passo é **iniciar a implementação da Fase 4**, construindo a **Fila de Sincronização Offline (`RF21`)**, o **Resumo Avançado com Metas e Recomendações (`RF12`)** e a **Tela de Histórico com Indicadores Analíticos e Gráficos (`RF13`)**.

