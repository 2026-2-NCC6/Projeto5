# FECAP - Fundação de Comércio Álvares Penteado

<p align="center">
<a href="https://www.fecap.br/"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhZPrRa89Kma0ZZogxm0pi-tCn_TLKeHGVxywp-LXAFGR3B1DPouAJYHgKZGV0XTEf4AE&usqp=CAU" alt="FECAP - Fundação de Comércio Álvares Penteado" border="0"></a>
</p>

# Projeto Interdisciplinar – Smart Tennis Arena


## GRUPO 5 - LMPP

### Integrantes:
- <a href="https://www.linkedin.com/in/lucasoliveira198/">Lucas Oliveira da Silva</a>
- <a href="https://www.linkedin.com/in/matheus-rossaneze-911b191b4/">Matheus Rossaneze</a>
- <a href="https://www.linkedin.com/in/pedro-schaurich-maia/">Pedro Schaurich Maia</a>
- <a href="https://www.linkedin.com/in/phelipe-antonio-de-souza-6271b8321/">Phelipe Antonio</a>

### Professores Orientadores:
- <a href="https://www.linkedin.com/in/edsonbarbero/">Edson Ricardo Barbero</a>
- <a href="https://www.linkedin.com/in/trencher/">João Trencher</a>
- <a href="https://www.linkedin.com/in/katia-bossi/">Katia Milani Lara Bossi</a>
- <a href="https://www.linkedin.com/in/professorrodnil/">Rodnil da Silva Moreira Lisboa</a>
- <a href="https://www.linkedin.com/in/victorbarq/">Victor Bruno Alexander Rosetti de Quiroz</a>

---

## 📖 Descrição do Projeto

O **Smart Tennis Arena** é um ecossistema integrado de IoT e robótica voltado ao treinamento gamificado de tênis com detecção de impactos por sensores piezoelétricos. O sistema adapta-se dinamicamente a diferentes públicos:
- **🧒 Modo Kids (Lúdico)**: Linguagem simplificada, estímulos visuais alegres, regras permissivas sem penalidades e pontuação focada em motivação (RF11, RN09).
- **🎾 Modo Pro (Métrico)**: Métricas avançadas de tempo de reação, força de impacto (ADC), multiplicadores de combo/streak e penalidade por erros (RN03).

A arquitetura do projeto é dividida em **três camadas desacopladas**:
1. **Aplicativo Mobile & Web (Expo / React Native)**: Interface para seleção de treinos, controle da sessão, visualização do HUD e gestão de perfil.
2. **Backend REST API (Node.js / Express / TypeScript)**: Autenticação JWT, controle de acesso RBAC, CRUD de usuários (RF17), perfis esportivos (RF02) e logs de auditoria (RF23).
3. **Banco de Dados Relacional (MySQL / MariaDB)**: Persistência transacional com suporte a execução local e deploy em nuvem.

---

## 🛠 Estrutura de Pastas

```text
Projeto5/
├── .doc/                      # Especificações oficiais do edital FECAP (PDF)
├── documentos/                # Entregas intermediárias das Unidades Curriculares
│   ├── entrega 1/             # Relatório de vulnerabilidades e proposta técnica
│   └── entrega 2/
├── start-mysql.bat            # Script utilitário para iniciar o MySQL local com 1 clique
├── src/
│   ├── firmware/              # Código-fonte embarcado para Arduino Uno R3
│   │   └── smart_tennis_arduino/
│   │       ├── smart_tennis_arduino.ino  # Firmware: sensores piezo, LEDs, buzzer e serial
│   │       └── README.md                 # Guia de pinagem, upload e testes de bancada
│   ├── backend/               # Servidor REST API em Node.js + Express + TypeScript
│   │   ├── Dockerfile         # Configuração de container para nuvem
│   │   ├── docker-compose.yml # Orquestração local (API + MySQL)
│   │   ├── .env.example       # Variáveis de ambiente modelo
│   │   └── src/
│   │       ├── db.ts          # Pool de conexões MySQL, migrations e seeds
│   │       ├── server.ts      # Ponto de entrada do servidor Express
│   │       ├── routes/        # Rotas da API (/auth, /users, /audit-logs)
│   │       └── middlewares/   # Autenticação JWT e RBAC
│   ├── mobile/                # Aplicativo Expo / React Native (Web + Mobile)
│   │   ├── App.tsx            # Tela principal integrada
│   │   ├── metro.config.js    # Resolução de pacotes compartilhados (Monorepo)
│   │   └── src/
│   │       ├── components/    # HUD, TargetBoard, AuthModal, HardwareModal, etc.
│   │       ├── context/       # AuthContext (sessão persistente)
│   │       ├── fsm/           # Game Engine e Máquina de Estados (Mealy FSM)
│   │       ├── hardware/      # Drivers: WebSerialDriver (USB real), MockSerial, HardwareManager
│   │       └── services/      # Cliente HTTP da API REST
│   └── packages/
│       └── shared/            # Contratos, tipos, regras de pontuação e testes
│           ├── src/contracts/ # Interfaces de usuário, perfil e catálogo de treinos
│           ├── src/protocol/  # Protocolo serial: tipos, parser e serializer
│           ├── src/rules/     # Algoritmo de pontuação e streak (RN03)
│           └── test/          # Testes unitários automatizados (11 testes)
└── README.md                  # Este guia
```

---

## ⚙️ Pré-requisitos para Rodar em Qualquer Máquina

Antes de começar, certifique-se de ter instalado:
1. **Node.js**: Versão 20.x, 22.x ou superior ([Download](https://nodejs.org/)).
2. **Git**: Para clonar e gerenciar o repositório ([Download](https://git-scm.com/)).
3. **MySQL / MariaDB**:
   - Pode ser via **XAMPP** (recomendado no Windows), instalação padrão do **MySQL Server** ou via **Docker**.

---

## 🚀 Passo a Passo: Como Rodar o Sistema Localmente

Siga os 4 passos abaixo para subir todo o ecossistema do zero em uma nova máquina:

### Passo 1: Clonar o Repositório
Abra o terminal (PowerShell, Prompt de Comando ou Git Bash):
```bash
git clone <URL_DO_REPOSITORIO>
cd Projeto5
```

---

### Passo 2: Iniciar o Banco de Dados MySQL

Escolha **uma** das opções abaixo:

#### Opção A (Windows via XAMPP ou script do projeto - Recomendado):
Se você utiliza Windows com XAMPP ou standalone:
- Execute o script na raiz do projeto:
  ```cmd
  start-mysql.bat
  ```
- *Ou abra o **XAMPP Control Panel** e clique em **Start** no módulo MySQL (Porta 3306).*

#### Opção B (Via Docker):
Se preferir rodar o MySQL em container Docker:
```bash
cd src/backend
docker compose up -d mysql
cd ../..
```

---

### Passo 3: Configurar e Iniciar o Backend (API REST)

1. Entre na pasta do backend:
   ```bash
   cd src/backend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure o arquivo `.env`:
   - Copie o arquivo modelo:
     ```bash
     cp .env.example .env
     ```
   - O arquivo `.env` já vem pré-configurado para o MySQL local padrão (`127.0.0.1:3306`, usuário `root` e senha vazia).

4. **Inicialize o banco de dados e as tabelas com seeds**:
   ```bash
   npm run db:init
   ```
   > Este comando cria o banco de dados `smart_tennis_arena`, cria automaticamente as tabelas `users`, `player_profiles` e `audit_logs`, e cadastra as contas iniciais de teste.

5. Inicie o servidor da API:
   ```bash
   npm run dev
   ```
   > A API estará rodando em: **`http://localhost:3001`**  
   > Você pode verificar a saúde da API e do banco acessando: **`http://localhost:3001/api/health`**

---

### Passo 4: Configurar e Iniciar o Aplicativo Mobile (Expo / Web)

Abra um **segundo terminal** na raiz do projeto:

1. Entre na pasta do aplicativo:
   ```bash
   cd src/mobile
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o aplicativo:
   - **Para rodar no Navegador (Web)**:
     ```bash
     npm run web
     ```
     > O aplicativo abrirá em: **`http://localhost:8081`**

   - **Para rodar no Celular (Android / iOS)**:
     ```bash
     npm start
     ```
     > Abra o app **Expo Go** no seu smartphone e escaneie o QR Code exibido no terminal.

---


## ☁️ Implantação em Nuvem (Deploy)

Conforme a Seção 6 do edital FECAP, a solução está pronta para nuvem com containerização:

1. **Deploy da API (PaaS)**:
   - Plataformas suportadas: **Render**, **Railway**, **Fly.io** ou **AWS App Runner**.
   - O [Dockerfile](file:///c:/Users/testelab/Documents/projeto/Projeto5/src/backend/Dockerfile) já está configurado no backend.
2. **Deploy do Banco de Dados (Cloud DB)**:
   - Utilize um serviço de banco gerenciado como **Railway MySQL**, **Aiven MySQL** ou **AWS RDS**.
   - Defina a variável de ambiente `DATABASE_URL` no painel da nuvem:
     ```env
     DATABASE_URL=mysql://usuario:senha@host:3306/smart_tennis_arena
     ```
   - A API detecta automaticamente o uso de nuvem via `DATABASE_URL` e aplica SSL e migrations sem alterações de código.

---

## 📋 Resumo das Portas Utilizadas

| Serviço | Porta Padrão | URL / Destino |
| :--- | :--- | :--- |
| **Mobile Web (Expo)** | `8081` | [http://localhost:8081](http://localhost:8081) |
| **Backend REST API** | `3001` | [http://localhost:3001](http://localhost:3001) |
| **Health Check API** | `3001` | [http://localhost:3001/api/health](http://localhost:3001/api/health) |
| **Banco MySQL** | `3306` | `127.0.0.1:3306` |
