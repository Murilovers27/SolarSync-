import { Router } from "express";
import { TelemetryService } from "../servicos/TelemetryService";

export function criarRotasTelemetria(telemetryService: TelemetryService, aoLimparDados: () => void) {
  const router = Router();

  router.get("/telemetry/latest", (_request, response) => {
    response.json(telemetryService.getLatestPublico());
  });

  router.get("/telemetry/history", (_request, response) => {
    response.json(telemetryService.getHistoryPublico());
  });

  router.delete("/telemetry/data", async (_request, response) => {
    try {
      await telemetryService.limparDados();
      aoLimparDados();
      response.status(204).send();
    } catch (error) {
      console.error("Falha ao limpar dados de telemetria:", error);
      response.status(500).json({ error: "Não foi possível limpar os dados de telemetria." });
    }
  });

  return router;
}
