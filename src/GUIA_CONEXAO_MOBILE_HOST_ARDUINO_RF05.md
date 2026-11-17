# Guia Passo a Passo: Conexão Celular ↔ PC Host ↔ Arduino em Tempo Real (RF05)

A arquitetura de comunicação em tempo real entre **Celular ↔ PC Host ↔ Arduino** utiliza o Backend Node.js como ponte WebSocket (`/ws/hardware`), pois o Arduino Uno R3 se conecta via cabo USB ao PC (Web Serial API) e não possui Wi-Fi ou BLE nativo.

```text
[Celular (Expo Go)]  <-- Wi-Fi / WebSocket (:3001/ws/hardware) -->  [Backend Node.js]
                                                                           ^
                                                                           | WebSocket (HOST)
                                                                           v
[Arduino Uno R3]     <----------- Cabo USB (Web Serial 115200) -----------> [Navegador no PC (Chrome/Edge)]
```

---

## Passo 1: Pré-requisitos de Rede e Serviços no PC Host

1. **Mesma rede Wi-Fi**: Conecte o **PC Host** e o **celular** na mesma rede Wi-Fi (evite redes com isolamento de clientes, como redes públicas/corporativas restritas).
2. **Descubra o IP local do PC**:
   - No PowerShell ou CMD do PC, execute `ipconfig` e anote o **Endereço IPv4** da sua interface Wi-Fi (ex.: `192.168.x.x`).
3. **Firewall do Windows**:
   - Certifique-se de que as portas **`3001`** (API REST + WebSocket Gateway) e **`8081`** (Metro/Expo) estejam liberadas para tráfego na rede local/privada.
4. **Serviços ativos no PC**:
   - **MySQL / MariaDB** rodando na porta `3306`.
   - **Backend API + Hardware Gateway WebSocket** rodando na porta `3001` (`ws://<IP_DO_PC>:3001/ws/hardware`).

---

## Passo 2: Conectar o Arduino ao Navegador no PC Host (Papel `HOST`)

1. Conecte o **Arduino Uno R3** (com o firmware `src/firmware/smart_tennis_arduino/smart_tennis_arduino.ino` gravado) à porta USB do PC.
   > **Importante:** Feche o *Serial Monitor* da Arduino IDE, pois apenas um programa pode ocupar a porta COM por vez.
2. No PC, abra o **Google Chrome** ou **Microsoft Edge** (obrigatório por suportarem Web Serial API) em `http://localhost:8081`.
3. Faça login no sistema e acesse a aba **IoT / Hardware** (`HardwareModal`).
4. Selecione o modo **Web Serial (USB)**.
5. Confira o **Token de Pareamento IoT (RF05)** (padrão no `.env`: `sta-iot-uno-r3-demo-token-2026`) e clique em **Conectar**.
6. Na janela de permissão do navegador, selecione a porta COM do Arduino (`115200 baud`).
7. Ao conectar, o `HostGatewayBridge` (`src/mobile/src/hardware/hostGatewayBridge.ts`) se registra automaticamente no Backend como `HOST` e passa a exibir o banner verde:
   > *"Ponte com Celular Ativa: X celular(es) conectado(s) na Arena."*

---

## Passo 3: Rodar o Aplicativo no Celular e Conectar ao PC Host (Papel `CONTROLLER`)

1. Instale o aplicativo **Expo Go** no celular (Android ou iOS).
2. No PC, caso o Metro ainda não esteja rodando, inicie o Expo na pasta `src/mobile`:
   ```powershell
   cd src\mobile
   npm.cmd start
   ```
   *(Se o Metro já estiver rodando na porta `8081`, utilize o QR Code exibido no terminal ou informe manualmente `exp://<IP_DO_PC>:8081` no Expo Go.)*
3. No celular, abra o **Expo Go**, escaneie o QR Code e aguarde o carregamento do aplicativo.
4. Faça login no app do celular e abra a aba **IoT / Hardware**.
5. Selecione o modo **Gateway Remoto / Celular** (`REMOTE_GATEWAY`).
6. No campo **IP do PC da Arena na Rede Wi-Fi (Porta 3001)**, confira ou digite o IPv4 do seu PC (ex.: `192.168.15.160`).
7. Informe o mesmo **Token de Pareamento IoT (RF05)** (`sta-iot-uno-r3-demo-token-2026`) e toque em **Conectar ao PC da Arena**.
   - O `RemoteGatewayDriver` (`src/mobile/src/hardware/remoteGatewayDriver.ts`) abrirá o WebSocket para `ws://<IP_DO_PC>:3001/ws/hardware`, enviará `REGISTER` com `role: 'CONTROLLER'` e validará o pareamento via `POST /api/v1/devices/pair`.
   - No navegador do PC, o contador deve atualizar para **`1 celular(es) conectado(s) na Arena`**.

---

## Passo 4: Como Certificar a Comunicação Bidirecional em Tempo Real (RF05)

Utilize o **Monitor de Quadros Seriais UART (JSON `\n`)** dentro da aba **IoT / Hardware** para validar os dois sentidos da comunicação:

### A) Testando **Celular → PC Host → Arduino** (Comandos `TX`)

1. No **celular**, dentro do *Monitor de Quadros Seriais UART*, digite no campo de comando:
   ```json
   {"cmd":"PING"}
   ```
   e toque em **Enviar**.
   - **Resultado esperado:**
     - No log do **celular**: aparece `[TX] {"cmd":"PING"}`.
     - No terminal do **Backend** (`src/backend`): o `HardwareGateway` repassa o comando do `CONTROLLER` para o `HOST`.
     - No log do **navegador no PC**: o `HostGatewayBridge` escreve o comando na porta serial USB do Arduino.
     - O **Arduino** responde imediatamente com `{"evt":"PONG","ts":...}`.

2. **Teste de Parada Segura (`!EMG`)**:
   - Envie `!EMG` pelo monitor serial (ou acione o botão de parada de emergência).
   - O Arduino entra em `STATE_EMERGENCY_STOP`, apaga os LEDs de alvo, soa o alarme no buzzer e envia `{"evt":"ESTOP_ALERT","src":"SERIAL"}` de volta.
   - Para destravar o controlador, envie:
     ```json
     {"cmd":"RESET"}
     ```

3. **Teste de acionamento direto de alvo**:
   ```json
   {"cmd":"START","tgt":1,"time":3000}
   ```
   - O LED correspondente ao alvo no Arduino acende imediatamente por 3000 ms.

### B) Testando **Arduino → PC Host → Celular** (Eventos de Sensores `RX`)

1. Com o treino iniciado pelo celular (ou após enviar o comando `START` acima), **bata levemente no sensor piezoelétrico correspondente** (ou pressione o botão físico de emergência no pino `2` do Arduino).
2. **Resultado esperado em tempo real:**
   - **No Arduino**: o LED do alvo apaga, o buzzer toca o feedback sonoro de acerto/erro e o firmware envia pela USB um frame JSON como `{"evt":"HIT","tgt":1,"val":320,"ts":...}` (ou `TAP` quando em modo idle).
   - **No navegador do PC**: aparece `[RX]` no monitor serial e a ponte encaminha o evento via WebSocket.
   - **No celular**: aparece `[RX]` no monitor serial, o card do alvo na tela (`TargetBoard`) atualiza instantaneamente e a pontuação/HUD é recalculada.

### C) Verificação de Estado no Backend

Consulte no navegador:
```text
GET http://<IP_DO_PC>:3001/api/v1/hardware/gateway-status
```
Confirme que a resposta retorna:
- `hostOnline: true`
- `isArduinoConnected: true`
- `controllerCount: 1` (ou maior)
