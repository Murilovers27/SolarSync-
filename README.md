# SolarSync

Sistema de gestão energética residencial que monitora a geração de energia solar fotovoltaica em tempo real e automatiza o direcionamento do excedente gerado para o carregamento de um veículo elétrico, priorizando o autoconsumo em detrimento da injeção de energia na rede elétrica (evitando a tarifação progressiva do Fio B prevista na Lei nº 14.300/2022).

Projeto acadêmico desenvolvido para a disciplina **UPX III: Energias Renováveis** — Curso de Análise e Desenvolvimento de Sistemas, UniFacens.

---

## Visão geral

O sistema é composto por três camadas principais:

1. **Hardware (protótipo IoT)** — dois módulos ESP32 emulam, respectivamente, a geração de energia solar e o comportamento de um carregador veicular (referência: BYD), comunicando-se via protocolo MQTT.
2. **Backend** — recebe os dados publicados pelos dispositivos, aplica a lógica de decisão (comparação entre geração e consumo) e envia comandos de controle de carregamento. Também encaminha os dados processados para o Power BI, onde são consolidados em métricas e indicadores.
3. **Frontend (dashboard)** — interface web em React que exibe em tempo real o status de geração, consumo e carregamento.

```
┌────────────────────┐        MQTT        ┌──────────────────────┐
│ ESP32 – Painel      │ ──────────────────▶│                      │
│ Solar (emulação)    │  casa/solar/geracao│                      │
└────────────────────┘                     │                      │
                                            │   Backend (Node.js   │        HTTP/REST        ┌───────────┐
┌────────────────────┐        MQTT         │   + TypeScript)      │ ───────────────────────▶ │ Power BI  │
│ ESP32 – Carregador   │◀────────────────── │   Lógica de decisão  │   (dataset / streaming)  │ (métricas │
│ BYD (emulação)       │ casa/carregador/   │                      │                          │ e balanço)│
└────────────────────┘     comando         │                      │                          └───────────┘
                                            └──────────┬───────────┘
                                                        │ WebSocket / REST
                                                        ▼
                                            ┌──────────────────────┐
                                            │ Dashboard (React +    │
                                            │ TypeScript)           │
                                            └──────────────────────┘
```
 
---

## Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| Prototipagem / hardware | ESP32 (x2), sensores analógicos, protocolo MQTT |
| Comunicação IoT | MQTT (broker Mosquitto ou serviço cloud) |
| Backend | Node.js, TypeScript |
| Frontend | React, TypeScript |
| Business Intelligence | Microsoft Power BI (métricas, indicadores e balanço energético) |
| Integração Backend → Power BI | Power BI REST API (push dataset) ou exportação para banco de dados consumido via conector |

---

## Kit de prototipagem (emulação com ESP32)

Lista de itens utilizados para montar o protótipo físico que emula a geração solar e o carregador veicular:

- 2x Placa de desenvolvimento ESP32 (DevKit V1 ou similar)
- 2x Protoboard (breadboard) 830 pontos
- 1x Potenciômetro rotativo 10kΩ (emulação da variação de geração solar/irradiância)
- 1x Sensor LDR (fotoresistor) + resistor 10kΩ (alternativa/complemento ao potenciômetro, para emulação visual com incidência de luz)
- 2x LED (indicação visual de status: geração ativa / carregamento ativo)
- 2x Resistor 220Ω (limitação de corrente dos LEDs)
- 1x Módulo relé 5V (emulação do acionamento real do carregador veicular)
- Jumpers macho-macho e macho-fêmea
- 2x Cabo micro-USB (alimentação e programação dos ESP32)
- 1x Fonte USB 5V (alimentação externa, se necessário fora da porta USB do computador)
- Protoboard power supply module (opcional, para alimentação independente dos módulos)

---

## Fluxo de dados

1. O ESP32 responsável pela emulação solar lê a variação analógica (potenciômetro/LDR) e publica o valor de geração no tópico MQTT `casa/solar/geracao`.
2. O backend, inscrito nesse tópico, compara o valor recebido com o consumo residencial configurado e aplica a lógica de decisão.
3. Caso haja excedente de geração, o backend publica um comando no tópico `casa/carregador/comando`, ao qual o segundo ESP32 (emulação do carregador BYD) está inscrito, acionando o relé/LED correspondente.
4. Os dados de geração, consumo, status de carregamento e economia tarifária estimada são enviados pelo backend ao **Power BI**, que consolida essas informações em métricas e no balanço energético (geração x consumo x economia).
5. O dashboard React consome os dados do backend via REST/WebSocket para exibição em tempo real ao usuário.

---

## Estrutura do repositório

```
apps/
  api/
    src/               → API Node.js + TypeScript, MQTT e regras do sistema
    package.json
    tsconfig.json
  web/
    app/               → Dashboard Next.js
    package.json
    tsconfig.json
packages/
  contracts/           → Tipos compartilhados entre API e dashboard
firmware/              → Firmware dos módulos ESP32
docs/                  → Relatório ABNT, diagramas e SQL
package.json           → Workspace e scripts do monorepo
README.md
```

### Comandos principais

```bash
npm install
npm run dev:api
npm run dev:web
npm run build:api
npm run build:web
```

A API roda em `http://localhost:3000` e o dashboard em `http://localhost:3001`.

---

## Status do projeto

Em desenvolvimento — projeto acadêmico da disciplina UPX III: Energias Renováveis (UniFacens).

## Autor

