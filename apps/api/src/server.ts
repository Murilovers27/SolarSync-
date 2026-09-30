import cors from "cors";
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import config from "./config";
import { EstadoSistemaService } from "./servicos/EstadoSistemaService";
import { MqttBrokerService } from "./servicos/MqttBrokerService";
import { TelemetryService } from "./servicos/TelemetryService";
import { criarRotasCarregador } from "./rotas/carregadorRotas";
import { criarRotasStatus } from "./rotas/statusRotas";
import { criarRotasTelemetria } from "./rotas/telemetriaRotas";

const app = express();
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: config.corsOrigins,
  },
});

const estadoSistema = new EstadoSistemaService(config.consumoResidenciaPadrao);
const telemetryService = new TelemetryService();

const mqttBroker = new MqttBrokerService(estadoSistema, (mensagem) => {
  telemetryService.registrarMensagem(mensagem);
  const mensagemPublica = {
    topic: mensagem.topic,
    receivedAt: mensagem.receivedAt,
    value: mensagem.value,
  };
  io.emit("telemetry:update", mensagemPublica);
});

app.use(criarRotasStatus(estadoSistema, mqttBroker, telemetryService));
app.use(criarRotasTelemetria(telemetryService));
app.use(criarRotasCarregador(estadoSistema, mqttBroker));

io.on("connection", (socket) => {
  socket.emit("telemetry:snapshot", {
    latestByTopic: telemetryService.getLatestPublico(),
    history: telemetryService.getHistoryPublico(),
  });
});

async function iniciarServidor() {
  await telemetryService.carregarHistorico();
  mqttBroker.iniciar();

  server.listen(config.server.port, () => {
    const apiUrl = `http://localhost:${config.server.port}`;

    console.log(`API SolarSync disponível em ${apiUrl}`);
    console.log(`Health check: ${apiUrl}/health`);
    console.log(`Status do sistema: ${apiUrl}/status`);
    console.log(`Telemetria atual: ${apiUrl}/telemetry/latest`);
    console.log(`Histórico: ${apiUrl}/telemetry/history`);
    console.log(`Socket.IO: ${apiUrl}`);
  });
}

void iniciarServidor();

function shutdown(signal: string) {
  console.log(`Encerrando por ${signal}...`);

  mqttBroker.encerrar();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));