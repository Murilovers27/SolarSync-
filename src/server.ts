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
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
  },
});

const estadoSistema = new EstadoSistemaService(config.consumoResidenciaPadrao);
const telemetryService = new TelemetryService();

const mqttBroker = new MqttBrokerService(estadoSistema, (mensagem) => {
  telemetryService.registrarMensagem(mensagem);
  io.emit("telemetry:update", mensagem);
  io.emit("mqtt:message", mensagem);
});

mqttBroker.iniciar();

app.use(criarRotasStatus(estadoSistema, mqttBroker, telemetryService));
app.use(criarRotasTelemetria(telemetryService));
app.use(criarRotasCarregador(estadoSistema, mqttBroker));

io.on("connection", (socket) => {
  socket.emit("telemetry:snapshot", {
    latestByTopic: telemetryService.getLatestByTopic(),
    history: telemetryService.getHistory(),
  });
});

server.listen(config.server.port, () => {
  console.log(`API ouvindo na porta ${config.server.port}`);
});

function shutdown(signal: string) {
  console.log(`Encerrando por ${signal}...`);

  mqttBroker.encerrar();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));