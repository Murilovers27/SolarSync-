import { Router } from "express";
import { MqttBrokerService } from "../servicos/MqttBrokerService";
import { EstadoSistemaService } from "../servicos/EstadoSistemaService";

export function criarRotasCarregador(estadoSistema: EstadoSistemaService, mqttBroker: MqttBrokerService) {
  const router = Router();

  router.post("/commands/carregador", (request, response) => {
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
