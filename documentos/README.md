# Entregas do PI

### **DECLARAÇÃO DE USO DE INTELIGÊNCIA ARTIFICIAL**

## Entrega 1

<br><br>

### Sistemas Embarcados e Robótica

| **Aluno(s) Responsável(veis)** | Lucas Oliveira da Silva, Matheus Rossaneze, Pedro Schaurich Maia e Phelipe Antonio de Souza [Grupo 5 — LMPP](cite: 3, 14, 15) |
| :--- | :--- |
| **Ferramenta utilizada** | Google Gemini e Claude [Anthropic](cite: 3, 13, 14, 15) |
| **Versão/modelo** | Gemini 3.8 Flash / Gemini 4 Argon e Claude Sonnet / Opus[cite: 3, 13, 15] |
| **Disciplina / Trabalho** | Sistemas Embarcados e Robótica — Entrega 1 [Planejamento Físico, Prototipação no Tinkercad e Documentação Técnica do Circuito](cite: 3, 13, 14) |
| **Finalidade de uso** | Apoio na organização visual e técnica do painel principal de MDF (90 × 90 cm) com 5 zonas de impacto (4 cantos e 1 centro) isoladas mecanicamente com EVA e fixação adesiva para mitigação de *crosstalk*[cite: 3, 4, 14]; revisão do esquema elétrico para simulação no Tinkercad Circuits [Arduino Uno R3, 5 sensores piezoelétricos nas portas A0–A4 protegidos por diodos Zener de 5,1V e resistores de 1 MΩ, registradores 74HC595 em cascata nos pinos D11–D13 com capacitores de desacoplamento de 100 nF e adaptação para resistores individuais de 220Ω](cite: 3, 4, 13, 14); conferência do aterramento comum [GND](cite: 3, 4); e estruturação das seções do relatório técnico para registro das medições realizadas pela equipe[cite: 14]. |
| ***Prompts* principais utilizados** | 1) `"Auxilie na organização da representação física no Tinkercad Circuits do projeto 'Acerte o Alvo', contemplando a placa de MDF, os 5 alvos, LEDs, sensores piezoelétricos, Arduino Uno, protoboard, registradores 74HC595, resistores, barramento GND comum e fixação adesiva com isolamento mecânico."`[cite: 3, 4, 14]<br>2) `"Substitua a rede de resistores SIP de 330Ω por resistores individuais de 220Ω no esquema de ligação e atualize a lista de materiais considerando o acionamento sequencial dos indicadores."`[cite: 13]<br>3) `"Organize o detalhamento textual das conexões elétricas entre o Arduino Uno, os registradores 74HC595 (DATA em D11, LATCH em D12, CLOCK em D13 e capacitores de 100 nF) e os cinco sensores piezoelétricos (A0 a A4 com resistores de 1 MΩ e diodos Zener)."`[cite: 14]<br>4) `"Estruture o esqueleto do relatório técnico da Entrega 1 (objetivo, lista de componentes, esquema funcional, descrição das conexões e tabelas para preenchimento dos testes e medições de tensão, corrente e resistência realizados na simulação e bancada)."`[cite: 14] |
| **Trechos ou entregas afetadas** | Documento `Entrega 1 - Planejamento Físico - ACERTE O ALVO` (`.docx` / `.pdf`), lista de materiais, diagrama de fiação no Tinkercad Circuits e estrutura do relatório técnico de testes e medições em `documentos/`[cite: 3, 4, 13, 14, 26]. |

### Redes de Computadores e Cibersegurança

| **Aluno(s) Responsável(veis)** | Pedro Schaurich Maia [com revisão da equipe Grupo 5 — LMPP: Lucas Oliveira da Silva, Matheus Rossaneze e Phelipe Antonio de Souza](cite: 3, 4, 15) |
| :--- | :--- |
| **Ferramenta utilizada** | Google Gemini [em apoio às ferramentas Snyk CLI, Cppcheck e npm audit](cite: 4, 15) |
| **Versão/modelo** | Gemini 3.8 Flash / Gemini 4 Argon[cite: 15] |
| **Disciplina / Trabalho** | Redes de Computadores e Cibersegurança — Entrega 1 [Auditoria SAST/SCA e Relatório de Vulnerabilidades — NI1](cite: 4) |
| **Finalidade de uso** | Orientação para execução e interpretação das varreduras estáticas de código (SAST via `snyk code test` e `Cppcheck` para C/C++) e de composição de dependências (SCA via `snyk test` e `npm audit`)[cite: 4]; apoio na tabulação da Matriz de Vulnerabilidades (pacotes transitivos `braces@3.0.3`, `deepmerge@4.3.1`, `node-forge`, `uuid` e risco arquitetural de *Buffer Overflow* / injeção de comandos na comunicação Serial USB cabeada entre o Arduino e o servidor local)[cite: 4]; elaboração de notas explicativas sobre os logs de terminal e revisão de clareza técnica do texto redigido pelo grupo[cite: 4]. |
| ***Prompts* principais utilizados** | 1) `"Oriente a execução do Snyk Code e do npm audit no repositório do projeto, considerando uma arquitetura em que o Arduino comunica-se via cabo USB Serial com o computador host onde rodam o servidor e a aplicação cliente."`[cite: 4]<br>2) `"Adicione uma explicação técnica concisa antes de cada bloco de log do terminal detalhando o comando executado e o significado do resultado obtido na auditoria."`[cite: 4]<br>3) `"Revise a fluidez textual e a padronização técnica do rascunho do Relatório de Vulnerabilidades, garantindo o cumprimento dos objetivos de identificação e documentação de riscos do projeto."`[cite: 4] |
| **Trechos ou entregas afetadas** | Documento `Entrega 1 - Redes e Cibersegurança Relatório de Vulnerabilidades Grupo 5` em `documentos/` (descrição da topologia serial cabeada, explicação técnica dos logs de varredura SAST/SCA, Matriz de Vulnerabilidades e diretrizes de validação de buffer e interrupção `SAFE_STOP`)[cite: 4, 26]. |

### Teoria da Computação e Linguagens Formais

| **Aluno(s) Responsável(veis)** | Lucas Oliveira da Silva, Matheus Rossaneze, Pedro Schaurich Maia e Phelipe Antonio de Souza [Grupo 5 — LMPP](cite: 1, 3, 4, 5) |
| :--- | :--- |
| **Ferramenta utilizada** | Google Gemini / NotebookLM[cite: 1, 4, 5, 6] |
| **Versão/modelo** | Gemini 3.8 Flash / Gemini 4 Argon[cite: 6, 15] |
| **Disciplina / Trabalho** | Teoria da Computação e Linguagens Formais — Entrega 1 [Modelagem Formal com Autômato Finito Determinístico, Expressão Regular e Gramática Regular — NI1](cite: 1, 4, 5) |
| **Finalidade de uso** | Verificação de consistência dos rascunhos da máquina de estados elaborados pela equipe frente ao fluxo do sistema no repositório `2026-2-NCC6/Projeto5` [autenticação, menu standby, ativação de alvo, detecção de impacto/timeout e encerramento](cite: 1, 5); validação do diagrama `Maquina_de_Estado_PI.PNG`[cite: 1]; formatação da tabela de transição ($\delta$)[cite: 1]; validação teórica da quíntupla formal com múltiplos estados finais de aceitação ($q_0$ e $q_7$)[cite: 1]; e revisão da notação da linguagem do sistema, Expressão Regular e Gramática Regular[cite: 1, 5]. |
| ***Prompts* principais utilizados** | 1) `"Analise os rascunhos de máquina de estados elaborados pelo grupo e o diagrama Maquina_de_Estado_PI.PNG, verificando a aderência aos conceitos de Autômato Finito Determinístico (AFD) e ao fluxo do sistema."`[cite: 1, 5]<br>2) `"Estruture a tabela de transição de estados (δ) correspondente ao diagrama validado para inclusão no relatório."`[cite: 1]<br>3) `"Verifique a validade formal de definir simultaneamente q0 e q7 como estados finais de aceitação e atualize a notação da quíntupla do autômato."`[cite: 1]<br>4) `"Auxilie na formalização matemática da linguagem reconhecida pelo sistema, da expressão regular equivalente e da gramática regular associada."`[cite: 1, 5] |
| **Trechos ou entregas afetadas** | Relatório da Entrega 1 de Teoria da Computação e Linguagens Formais em `documentos/`: validação do diagrama `Maquina_de_Estado_PI.PNG`, quíntupla formal do AFD com conjunto de aceitação $\{q_0, q_7\}$, tabela de transição ($\delta$), definição formal da linguagem, Expressão Regular e Gramática Regular[cite: 1, 5, 26]. |

### Inovação e Empreendedorismo

| **Aluno(s) Responsável(veis)** | Lucas Oliveira da Silva, Matheus Rossaneze, Pedro Schaurich Maia e Phelipe Antonio de Souza [Grupo 5 — LMPP](cite: 3, 13, 14) |
| :--- | :--- |
| **Ferramenta utilizada** | Claude [Anthropic](cite: 13) |
| **Versão/modelo** | Claude Sonnet / Opus[cite: 13, 15] |
| **Disciplina / Trabalho** | Inovação e Empreendedorismo — Entrega 1 [Análise da Oportunidade, Público-Alvo, TAM e Cenário Concorrencial — NI1](cite: 13, 14) |
| **Finalidade de uso** | Apoio na sistematização de dados secundários do setor esportivo, estruturação do mapa de empatia e perfil do público-alvo (persona), revisão metodológica do racional de cálculo do Mercado Total Endereçável (TAM) em reais e organização comparativa do cenário concorrencial[cite: 13]. |
| ***Prompts* principais utilizados** | 1) `"Auxilie na estruturação da análise de oportunidade do projeto Alvo Inteligente Gamificado para a disciplina de Inovação e Empreendedorismo, organizando o perfil empático do público-alvo, a memória de cálculo explícita do TAM em reais com base em fontes secundárias de mercado e a matriz comparativa de concorrentes diretos e indiretos."`[cite: 13] |
| **Trechos ou entregas afetadas** | Documento de Análise da Oportunidade da Entrega 1 de Inovação e Empreendedorismo e fundamentação mercadológica consolidada em `documentos/Apresentacao_FECAP_CCOMP6_LMPP.pdf` [persona, cálculo do TAM e análise de concorrência](cite: 9, 13, 26). |

### Projeto Interdisciplinar — Internet das Coisas e Robótica

| **Aluno(s) Responsável(veis)** | Lucas Oliveira da Silva, Matheus Rossaneze, Pedro Schaurich Maia e Phelipe Antonio de Souza [Grupo 5 — LMPP](cite: 3, 13, 14, 15) |
| :--- | :--- |
| **Ferramenta utilizada** | Claude (Anthropic / Claude Code) e Google Gemini[cite: 3, 13, 14, 15] |
| **Versão/modelo** | Anthropic Claude e Gemini 3.8 Flash / Gemini 4 Argon[cite: 13, 15] |
| **Disciplina / Trabalho** | Projeto Interdisciplinar — Internet das Coisas e Robótica — Entrega 1 [Concepção Integrada do Sistema, Escopo, Mapeamento de Hardware e Arquitetura Inicial — NI1](cite: 3, 13, 14, 15) |
| **Finalidade de uso** | Apoio na consolidação da proposta técnica interdisciplinar do sistema "Smart Tennis Arena / Acerte o Alvo" conforme o edital `documentos/PI_6CCOMP_2026_Smart_Tennis_Arena_FINAL.pdf`, integrando escopo, lista de materiais e orçamento, tabela de pinagem do Arduino Uno R3, roteiro de montagem física em MDF e especificação inicial da comunicação entre hardware embarcado, protocolo serial JSON/`!EMG` e aplicação cliente[cite: 3, 13, 14, 15]. |
| ***Prompts* principais utilizados** | 1) `"Auxilie na organização do documento de concepção do Projeto Integrador (alvo eletrônico gamificado com Arduino Uno, sensores piezoelétricos e LEDs), estruturando as seções de visão geral, lista de materiais, mapeamento de pinos e passo a passo de montagem física."`[cite: 13]<br>2) `"Organize a especificação técnica das vistas frontal, traseira e lateral da estrutura em MDF (90 × 90 cm) contendo cinco zonas de impacto, sensores piezoelétricos, Arduino Uno, protoboard, registradores 74HC595, buzzer e fiação."`[cite: 14] |
| **Trechos ou entregas afetadas** | Documentos `Entrega 1 - Planejamento Físico - ACERTE O ALVO`, `README.md` (raiz do repositório), tabelas de materiais/pinagem e documentação da arquitetura base do monorepo (`commits d10ba3b9` e `da1a7e57`)[cite: 3, 13, 14, 15, 26]. |

## Entrega 2

<br><br>

### Sistemas Embarcados e Robótica

| **Aluno(s) Responsável(veis)** | Pedro Schaurich Maia e Lucas Oliveira da Silva [com apoio da equipe Grupo 5 — LMPP: Matheus Rossaneze e Phelipe Antonio de Souza](cite: 3, 7, 14, 15) |
| :--- | :--- |
| **Ferramenta utilizada** | Google Antigravity [Google Gemini](cite: 5, 7, 8, 15) |
| **Versão/modelo** | Gemini 4 Argon (Medium) e Gemini 3.8 Flash [Medium](cite: 15) |
| **Disciplina / Trabalho** | Sistemas Embarcados e Robótica — Entrega 2 (Testes de Bancada, Diagnóstico de Hardware, Leitura de Piezos por Variação $\Delta$ e Evolução Física — NI2)[cite: 5, 7, 8] |
| **Finalidade de uso** | Apoio na depuração prática de bancada e documentação da evolução de hardware: diagnóstico de estados iniciais nos registradores 74HC595 via telemetria no Monitor Serial e transição arquitetural para ligação direta/foco nos 5 sensores piezoelétricos (`A0` a `A4`)[cite: 5, 7, 10]; resolução de erros de comunicação serial/upload nas portas `COM13` e `COM14`[cite: 7, 8]; ajuste do algoritmo de leitura analógica de impactos em MDF por variação brusca ($\Delta$, `DELTA_MINIMO = 20`) e filtro de *debounce* (`TEMPO_DEBOUNCE = 120`)[cite: 8, 14]; e documentação do guia técnico de firmware[cite: 15]. |
| ***Prompts* principais utilizados** | 1) `"Gere um sketch de diagnóstico para Arduino Uno que execute o teste individual sequencial dos 5 indicadores luminosos e do buzzer passivo no pino D9, registrando o estado de cada etapa no Monitor Serial para validação de bancada."` [05/11/2026](cite: 7)<br>2) `"Analise a causa de acionamento estático na inicialização de registradores 74HC595 e proponha ajustes de código e aterramento/inicialização de pinos para garantir controle determinístico via software."` [05/11/2026](cite: 7)<br>3) `"Diagnostique o erro de upload 'cannot open port \\.\COM13 / COM14' na Arduino IDE e revise a declaração do vetor de portas analógicas const int PIEZO[5] = { A0, A1, A2, A3, A4 } com cálculo de variação delta e debounce."` [05/11/2026](cite: 7, 8)<br>4) `"Refine a lógica de leitura das cinco entradas analógicas (A0 a A4) para detecção de vibrações transmitidas em placa de MDF de 3 mm, detalhando os parâmetros calibráveis de limiar (threshold) e tempo de debounce para evitar falsos positivos."`[cite: 8, 14] |
| **Trechos ou entregas afetadas** | Documento `NI2 - Relatório de Evolução do Projeto Integrado`, guia técnico `src/firmware/smart_tennis_arduino/README.md`, registros de testes de bancada e firmware `src/firmware/smart_tennis_arduino/smart_tennis_arduino.ino`[cite: 5, 7, 8, 15]. |

### Redes de Computadores e Cibersegurança

| **Aluno(s) Responsável(veis)** | Pedro Schaurich Maia [com revisão da equipe Grupo 5 — LMPP: Lucas Oliveira da Silva, Matheus Rossaneze e Phelipe Antonio de Souza](cite: 3, 5, 6, 15) |
| :--- | :--- |
| **Ferramenta utilizada** | Google Antigravity / Google Gemini [em apoio à plataforma Aikido Security](cite: 5, 6, 15) |
| **Versão/modelo** | Gemini 4 Argon [Medium](cite: 15) |
| **Disciplina / Trabalho** | Redes de Computadores e Cibersegurança — Entrega 2 [Plano de Gerenciamento de Riscos e Plano de Respostas aos Riscos via Aikido Security — NI2](cite: 5, 6) |
| **Finalidade de uso** | Apoio na estruturação do `Plano de Gerenciamento de Riscos` e do `Plano de Respostas aos Riscos` segundo os modelos oficiais da disciplina, consolidando os achados reais do scan **Aikido Security** sobre o repositório `2026-2-NCC6/Projeto5`[cite: 5, 6]: `SAST-001` (Alto, Score 85 — ausência de `helmet` e CORS irrestrito em `src/backend/src/server.ts`), `SCA-001` (Médio, Score 69 — vulnerabilidades `AIKIDO-2026-10707` e `AIKIDO-2026-10706` em `zod` v3.25.76 em `src/mobile/package-lock.json`), `IAC-001` (Médio, Score 65 — container Docker `node:22-alpine` executando como `root` em `src/backend/Dockerfile`), `SCA-002` (Baixo, Score 37 — risco de DoS em `raw-body` v2.5.2 mitigado com `express.json({ limit: '100kb' })`) e `SCA-003` (Baixo, Score 24 — `yargs` v17.7.2 tratado com aceitação ativa por ser dependência exclusiva de build/CLI)[cite: 6]. |
| ***Prompts* principais utilizados** | 1) `"Estruture o Plano de Gerenciamento de Riscos e o Plano de Respostas aos Riscos seguindo a formatação dos templates oficiais da disciplina, preenchendo-os com os dados técnicos coletados no scan da ferramenta Aikido Security e referenciando os arquivos correspondentes da arquitetura no GitHub (Backend, Mobile e Dockerfile)."` [04/11/2026](cite: 5, 6)<br>2) `"Implemente as mitigações da Fase 1 de segurança no código-fonte: cabeçalhos OWASP, rate limiting no login, revogação de JWT no logout, proteção LGPD para menores de idade e execução não-privilegiada (USER node) no Dockerfile."` [04/11/2026](cite: 6, 15) |
| **Trechos ou entregas afetadas** | Documentos `Plano de Gerenciamento de Riscos Smart Tennis Arena` e `Plano de Respostas aos Riscos Smart Tennis Arena` em `documentos/`, `documentos/relatorio_implementacao_fases_smart_tennis_arena.md` e controles de segurança em `src/backend/src/middlewares/security.ts`, `src/backend/src/server.ts`, `src/backend/Dockerfile` e `src/packages/shared/src/security/validation.ts`[cite: 5, 6, 15]. |

### Teoria da Computação e Linguagens Formais

| **Aluno(s) Responsável(veis)** | Lucas Oliveira da Silva, Matheus Rossaneze, Pedro Schaurich Maia e Phelipe Antonio de Souza [Grupo 5 — LMPP](cite: 1, 2, 3, 6) |
| :--- | :--- |
| **Ferramenta utilizada** | Google Gemini / NotebookLM[cite: 1, 2, 6] |
| **Versão/modelo** | Gemini 4 Argon / NotebookLM[cite: 6, 15] |
| **Disciplina / Trabalho** | Teoria da Computação e Linguagens Formais — Entrega 2 [Regras de Funcionamento, Pré e Pós-Condições, Modelo Computacional e Análise de Decidibilidade — NI2](cite: 1, 2, 6) |
| **Finalidade de uso** | Apoio na correlação teórica entre o código-fonte do repositório `2026-2-NCC6/Projeto5`, a modelagem da Entrega 1 e as notas de aula no Gemini/NotebookLM[cite: 1, 2, 6]; revisão da Máquina de Estados ($q_0$ a $q_7$) e catálogo de eventos (`solicitar_login`, `senha_correta`, `iniciar_partida`, `impacto_piezo`, `tempo_alvo_expirado`, `tempo_jogo == 0`)[cite: 6]; organização formal das regras de funcionamento com pré e pós-condições divididas em propriedades de *Safety* (`RF-01` Exclusão Mútua de Partida, `RF-02` Integridade da Pontuação, `RF-03` Sincronismo de Alvo e Hardware) e *Liveness* (`RF-04` Parada Determinística por Tempo, `RF-05` Recuperação e Tolerância a Erros)[cite: 1, 2, 6]; justificativa do modelo computacional na Hierarquia de Chomsky (AFD / Máquina de Mealy) e análise de decidibilidade ($\delta: Q \times \Sigma \rightarrow Q$)[cite: 1, 2, 6]. |
| ***Prompts* principais utilizados** | 1) `"Com base na modelagem formal da Entrega 1 e na implementação atual do repositório no GitHub, auxilie na estruturação dos tópicos da Entrega 2 de Teoria da Computação: regras de funcionamento do sistema com pré e pós-condições (propriedades de Safety e Liveness), justificativa da escolha do modelo computacional (Autômato Finito Determinístico / Máquina de Mealy frente a Autômato com Pilha e Máquina de Turing) e análise de decidibilidade das transições determinísticas."` [04/11/2026](cite: 1, 2, 6)<br>*Nota de transparência constante no rodapé do documento entregue:* `"Neste documento foi utilizado IA para buscar orientações de como estruturar alguns tópicos e relacionar o projeto no Git Hub à um notebook do Gemini."`[cite: 6] |
| **Trechos ou entregas afetadas** | Documento `Entrega 2 Teoria da Computação e Linguagens Formais - Grupo 5.docx` em `documentos/` (Máquina de Estados $q_0$ a $q_7$, catálogo de eventos, regras `RF-01` a `RF-05` com pré/pós-condições, enquadramento na Hierarquia de Chomsky e análise de decidibilidade)[cite: 1, 2, 6, 26]. |

### Inovação e Empreendedorismo

| **Aluno(s) Responsável(veis)** | Lucas Oliveira da Silva, Matheus Rossaneze, Pedro Schaurich Maia e Phelipe Antonio de Souza [Grupo 5 — LMPP](cite: 3, 9, 10, 14) |
| :--- | :--- |
| **Ferramenta utilizada** | Google Gemini[cite: 9, 10, 15] |
| **Versão/modelo** | Gemini 4 Argon [Medium](cite: 15) |
| **Disciplina / Trabalho** | Inovação e Empreendedorismo — Entrega 2 [Apresentação Executiva, RBV/VRIO, 5 Forças de Porter, Business Model Canvas Enxuto e Roadmap — NI2](cite: 9, 10) |
| **Finalidade de uso** | Apoio na estruturação executiva dos 8 slides finais conectando a arquitetura técnica do projeto aos modelos estratégicos da disciplina: Visão Baseada em Recursos (RBV / VRIO — Barney, 1991) distinguindo recursos tangíveis (Arduino, piezos, Docker) e intangíveis (`useGameEngine`, protocolo serial, `auditController`)[cite: 9, 10]; análise competitiva pelas 5 Forças de Porter (2008) e Cadeia de Valor [1985](cite: 10); construção do Business Model Canvas Enxuto (Osterwalder & Pigneur, 2010) sob modelo híbrido HaaS + SaaS[cite: 9, 10]; e organização do Roadmap de Evolução em curto, médio (migração para ESP32 via BLE/ESP-NOW) e longo prazo [Beach Tennis, Padel e análise preditiva](cite: 9, 10). |
| ***Prompts* principais utilizados** | 1) `"Auxilie na estruturação do roteiro da apresentação executiva de 8 slides articulando a análise RBV/VRIO, as 5 Forças de Porter e a Cadeia de Valor com os componentes reais implementados no projeto."`[cite: 9, 10]<br>2) `"Organize os tópicos de Viabilidade Econômica e BMC Enxuto no modelo híbrido HaaS + SaaS (venda/comodato do kit de hardware com assinatura recorrente para gestão de treinos) e o Roadmap de Evolução em Curto Prazo (MVP validado), Médio Prazo (ESP32 sem fio e carenagem industrializada) e Longo Prazo (expansão para Beach Tennis/Padel e inteligência preditiva)."`[cite: 9, 10] |
| **Trechos ou entregas afetadas** | Arquivo `documentos/Apresentacao_FECAP_CCOMP6_LMPP.pdf` (`Smart Tennis Arena - Apresentação` / `Smart Tennis Arena (8 slides com BMC)`), abrangendo análises RBV/VRIO, 5 Forças de Porter, Cadeia de Valor, Business Model Canvas e Roadmap[cite: 9, 10, 26]. |

### Projeto Interdisciplinar — Internet das Coisas e Robótica

| **Aluno(s) Responsável(veis)** | Pedro Schaurich Maia [com contribuições integradas do Grupo 5 — LMPP: Lucas Oliveira da Silva, Matheus Rossaneze e Phelipe Antonio de Souza](cite: 3, 5, 10, 15) |
| :--- | :--- |
| **Ferramenta utilizada** | Google Antigravity [Google Gemini](cite: 5, 10, 15) |
| **Versão/modelo** | Gemini 4 Argon (Medium) e Gemini 3.8 Flash [Medium](cite: 15) |
| **Disciplina / Trabalho** | Projeto Interdisciplinar — Internet das Coisas e Robótica — Entrega 2 [Relatório de Evolução NI2, Auditoria de Requisitos RF01–RF23, OpenAPI 3.0.3, Banner Oficial, Documento de Extensão e Governança de IA](cite: 5, 10, 15, 26) |
| **Finalidade de uso** | Apoio na consolidação do `NI2 - Relatório de Evolução do Projeto Integrado` documentando as 3 camadas do repositório (`src/firmware/`, `src/mobile/` e `src/backend/`)[cite: 5]; auditoria de rastreabilidade do código frente aos requisitos `RF01` a `RF23` do edital oficial `documentos/PI_6CCOMP_2026_Smart_Tennis_Arena_FINAL.pdf` e organização do plano incremental em 6 fases[cite: 15]; geração da especificação `documentos/openapi-smart-tennis-arena.json` [OpenAPI 3.0.3](cite: 15); revisão de síntese textual sob restrição de espaço para o banner oficial (`documentos/Banner_FECAP_CCOMP6_LMPP.pdf`) e relatório de extensão (`documentos/Documento - Projeto de Extensão - COM Empresa - 2026_2.docx`) refletindo o recorte do protótipo focado em detecção piezoelétrica e telemetria USB/Web[cite: 10, 26]; e organização do histórico cronológico de governança de IA em `documentos/historico_prompts_smart_tennis_arena.md`[cite: 3, 15]. |
| ***Prompts* principais utilizados** | 1) `"Consolide no Relatório de Evolução do Projeto Integrado (NI2) as atualizações implementadas no repositório GitHub nas camadas de firmware Arduino, driver Web Serial no frontend e API REST com MySQL e Docker."` [28/10/2026](cite: 5)<br>2) `"Realize uma auditoria de conformidade do código atual frente ao edital oficial [PI_6CCOMP_2026_Smart_Tennis_Arena_FINAL.pdf], mapeando o atendimento aos requisitos RF01 a RF23 e organizando as evoluções em um plano estruturado de 6 fases."` [04/11/2026](cite: 15)<br>3) `"Estruture em Markdown na pasta 'documentos' o histórico cronológico completo de prompts, modelos, finalidades e arquivos afetados ao longo do desenvolvimento do projeto, em conformidade com o Guia de Uso Responsável de IA da FECAP."` [05/11/2026](cite: 15)<br>4) `"Sintetize o resumo executivo do projeto para o template oficial do banner (bloco inicial de 3 a 5 linhas e descrição técnica complementar), adequando a descrição ao escopo final do hardware validado com sensores piezoelétricos e telemetria USB/Web."` [06/11/2026 e 07/11/2026](cite: 10) |
| **Trechos ou entregas afetadas** | `README.md`, `documentos/Banner_FECAP_CCOMP6_LMPP.pdf`, `documentos/Documento - Projeto de Extensão - COM Empresa - 2026_2.docx`, `documentos/openapi-smart-tennis-arena.json`, `documentos/relatorio_implementacao_fases_smart_tennis_arena.md`, `documentos/plano_proximas_fases_smart_tennis_arena.md`, `documentos/historico_prompts_smart_tennis_arena.md`, `NI2 - Relatório de Evolução do Projeto Integrado` e portal `Smart Tennis Arena UX/UI (Google Sites)`[cite: 3, 5, 10, 15, 26]. |

***Declaro que o uso acima descrito está em conformidade com o GUIA PARA O USO RESPONSÁVEL DE
INTELIGÊNCIA ARTIFICIAL NA FECAP e que o conteúdo final é de minha plena responsabilidade
autoral.***
