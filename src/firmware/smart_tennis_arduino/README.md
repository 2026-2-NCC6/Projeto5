# Firmware Arduino — Smart Tennis Arena (Entrega 02)

Este diretório contém o código-fonte oficial em C++ para o microcontrolador **Arduino Uno R3**, responsável pela aquisição de sinais dos sensores piezoelétricos de impacto, controle de atuadores visuais (LEDs) e sonoros (Buzzer), parada de emergência e comunicação serial bidirecional com o aplicativo.

---

## 📌 Pinagem de Hardware (Conexões)

| Componente | Pino no Arduino Uno | Tipo | Função |
| :--- | :--- | :--- | :--- |
| **Piezo Alvo 1 (Sup. Esq.)** | `A0` | Entrada Analógica | Detecção de impacto mecânico no Alvo 1 |
| **Piezo Alvo 2 (Sup. Dir.)** | `A1` | Entrada Analógica | Detecção de impacto mecânico no Alvo 2 |
| **Piezo Alvo 3 (Inf. Esq.)** | `A2` | Entrada Analógica | Detecção de impacto mecânico no Alvo 3 |
| **Piezo Alvo 4 (Inf. Dir.)** | `A3` | Entrada Analógica | Detecção de impacto mecânico no Alvo 4 |
| **Piezo Alvo 5 (Centro)** | `A4` | Entrada Analógica | Detecção de impacto mecânico no Alvo 5 |
| **LED Alvo 1** | `D3` (ou 74HC595) | Saída Digital | Indicação visual de ativação do Alvo 1 |
| **LED Alvo 2** | `D4` (ou 74HC595) | Saída Digital | Indicação visual de ativação do Alvo 2 |
| **LED Alvo 3** | `D5` (ou 74HC595) | Saída Digital | Indicação visual de ativação do Alvo 3 |
| **LED Alvo 4** | `D6` (ou 74HC595) | Saída Digital | Indicação visual de ativação do Alvo 4 |
| **LED Alvo 5** | `D7` (ou 74HC595) | Saída Digital | Indicação visual de ativação do Alvo 5 |
| **Buzzer** | `D8` | Saída Digital (Tone) | Feedback sonoro (Acerto, Erro, Alerta) |
| **Botão de Emergência** | `D2` (INT0) | Entrada Digital (Pull-up) | Disparo imediato de Parada Segura (RF22) |
| **LED de Status** | `D13` | Saída Digital | Pisca conforme estado do sistema |

> **Nota sobre o CI 74HC595:** Caso utilize o registrador de deslocamento para expansão dos LEDs, altere `#define USE_74HC595 true` no arquivo `.ino`. Os pinos utilizados são: Data (`D5`), Clock (`D6`), Latch (`D7`).

---

## 🚀 Como Gravar no Arduino via Arduino IDE

1. Abra o arquivo `smart_tennis_arduino.ino` na **Arduino IDE** (v2.x recomendada).
2. Conecte a placa Arduino Uno ao notebook via cabo USB.
3. No menu **Ferramentas (Tools)**:
   - **Placa**: Selecione `Arduino Uno`.
   - **Porta**: Selecione a porta serial correspondente (ex: `COM3`, `COM4` no Windows).
4. Clique no botão **Carregar (Upload)** (seta para a direita).
5. Ao concluir o carregamento, a placa emitirá dois bipes curtos de inicialização e enviará pela serial:
   ```json
   {"evt":"READY","hw":"STA-UNO-R3","fw":"1.0.0","piezo":[250,250,250,250,250]}
   ```

---

## 🧪 Teste Rápido via Monitor Serial (Baudrate: 115200)

Abra o Monitor Serial da Arduino IDE e configure para **115200 baud** com final de linha **Nova linha (NL)**:
- Envie `{"cmd":"PING"}` -> Resposta esperada: `{"evt":"PONG","ts":...}`
- Envie `{"cmd":"START","tgt":1,"time":4000}` -> O LED do Alvo 1 acenderá por 4 segundos aguardando batida no sensor `A0`.
- Dê uma leve pancada no piezo do Alvo 1 -> Resposta esperada: `{"evt":"HIT","tgt":1,"val":...,"ts":...}`
- Envie `!EMG` ou aperte o botão no pino D2 -> Resposta esperada: `{"evt":"ESTOP_ALERT",...}` com alarme sonoro.
