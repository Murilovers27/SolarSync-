import { Router } from "express";
import { TelemetryService } from "../servicos/TelemetryService";

export function criarRotasTelemetria(telemetryService: TelemetryService) {
  const router = Router();

  router.get("/telemetry/latest", (_request, response) => {
    response.json(telemetryService.getLatestPublico());
  });

  router.get("/telemetry/history", (_request, response) => {
    response.json(telemetryService.getHistoryPublico());
  });

  return router;
}
