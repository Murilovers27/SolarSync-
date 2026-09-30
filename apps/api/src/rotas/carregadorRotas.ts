import { NextFunction, Request, Response, Router } from "express";
import config from "../config";
import { MqttBrokerService } from "../servicos/MqttBrokerService";
import { EstadoSistemaService } from "../servicos/EstadoSistemaService";

function exigirChaveApi(request: Request, response: Response, next: NextFunction) {
  const chaveRecebida = request.header("x-api-key");

  if (!config.apiKey) {
    response.status(503).json({ error: "Controle manual não configurado." });
    return;
  }

  if (chaveRecebida !== config.apiKey) {
    response.status(401).json({ error: "Não autorizado." });
    return;
  }

  next();
}

export function criarRotasCarregador(estadoSistema: EstadoSistemaService, mqttBroker: MqttBrokerService) {
  const router = Router();

  router.post("/commands/carregador", exigirChaveApi, (request, response) => {
    const payload = request.body;

    if (payload === undefined) {
      response.status(400).json({ error: "Body ausente" });
      return;
    }

    const comandoNormalizado =
      typeof payload === "string"
        ? payload.toLowerCase()
        : typeof payload === "object" && payload !== null && "comando" in payload
          ? String((payload as { comando?: string }).comando ?? "").toLowerCase()
          : "";

    const acao =
      comandoNormalizado === "ligar" || comandoNormalizado === "on" || comandoNormalizado === "ativo"
        ? "ligar"
        : comandoNormalizado === "desligar" || comandoNormalizado === "off" || comandoNormalizado === "inativo"
          ? "desligar"
          : null;

    if (!acao) {
      response.status(400).json({
        error: "Comando inválido. Use 'ligar' ou 'desligar'.",
      });
      return;
    }

    const decisao = mqttBroker.publicarComandoManual(acao);
    response.status(202).json({
      status: "comando_enviado",
      decisao,
    });
  });

  return router;
}
