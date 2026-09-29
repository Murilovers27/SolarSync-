import { Router } from "express";
import { EstadoSistemaService } from "../servicos/EstadoSistemaService";
import { MqttBrokerService } from "../servicos/MqttBrokerService";
import { TelemetryService } from "../servicos/TelemetryService";

export function criarRotasStatus(
  estadoSistema: EstadoSistemaService,
  mqttBroker: MqttBrokerService,
  telemetryService: TelemetryService,
) {
  const router = Router();

  router.get("/health", (_request, response) => {
    const mqttStatus = mqttBroker.conectado() ? "connected" : mqttBroker.reconectando() ? "reconnecting" : "offline";

    response.json({
      status: "ok",
      mqttConnected: mqttBroker.conectado(),
      mqttStatus,
      ...telemetryService.getStatusResumo(),
      ...estadoSistema.getEstado(),
    });
  });

  router.get("/status", (_request, response) => {
    response.json({
      ...estadoSistema.getEstado(),
      ...telemetryService.getStatusResumo(),
      mqttConnected: mqttBroker.conectado(),
    });
  });

  return router;
}
