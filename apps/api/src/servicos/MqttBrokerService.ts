import mqtt from "mqtt";
import config from "../config";
import { DecisaoSistema, EstadoSistemaService, TipoComandoCarregador } from "./EstadoSistemaService";

export type TelemetriaMensagem = {
  topic: string;
  receivedAt: string;
  raw: string;
  value: unknown;
};

export class MqttBrokerService {
  private readonly cliente: mqtt.MqttClient;
  private readonly estadoSistema: EstadoSistemaService;
  private readonly onMensagemRecebida: (mensagem: TelemetriaMensagem) => void;

  constructor(estadoSistema: EstadoSistemaService, onMensagemRecebida: (mensagem: TelemetriaMensagem) => void) {
    this.estadoSistema = estadoSistema;
    this.onMensagemRecebida = onMensagemRecebida;

    const brokerUrl = `${config.mqtt.protocol}://${config.mqtt.host}:${config.mqtt.port}`;
    const mqttOptions = {
      username: config.mqtt.username,
      password: config.mqtt.password,
      reconnectPeriod: 5000,
      clean: true,
      rejectUnauthorized: config.mqtt.rejectUnauthorized,
      ...(config.mqtt.clientId ? { clientId: config.mqtt.clientId } : {}),
    };

    this.cliente = mqtt.connect(brokerUrl, mqttOptions);
  }

  public iniciar() {
    this.cliente.on("connect", () => {
      this.cliente.subscribe(config.mqtt.subscribeTopic, { qos: 0 }, (erro) => {
        if (erro) {
          console.error("Falha ao assinar tópico MQTT:", erro.message);
          return;
        }

        console.log(`Conectado ao MQTT e inscrito em ${config.mqtt.subscribeTopic}`);
      });
    });

    this.cliente.on("reconnect", () => {
      console.warn("Reconectando ao broker HiveMQ...");
    });

    this.cliente.on("offline", () => {
      console.warn("Broker MQTT ficou offline.");
    });

    this.cliente.on("message", (topic, message) => {
      const mensagemParseada = this.parseIncomingPayload(message);
      const telemetria: TelemetriaMensagem = {
        topic,
        receivedAt: new Date().toISOString(),
        raw: mensagemParseada.raw,
        value: mensagemParseada.value,
      };

      if (topic === config.topicos.geracaoSolar) {
        const valorGeracao = this.extrairValorNumerico(mensagemParseada.value);

        if (valorGeracao !== null) {
          const decisao = this.estadoSistema.processarGeracaoSolar(valorGeracao);
          this.publicarComando(decisao);
        }
      }

      this.onMensagemRecebida(telemetria);
    });

    this.cliente.on("error", (erro) => {
      console.error("Erro no cliente MQTT:", erro.message);
    });
  }

  public publicarComandoManual(comando: TipoComandoCarregador) {
    const decisao = this.estadoSistema.definirComandoManual(comando);
    this.publicarComando(decisao);
    return decisao;
  }

  public restaurarEstado(telemetria: TelemetriaMensagem | undefined) {
    if (!telemetria || telemetria.topic !== config.topicos.geracaoSolar) {
      return;
    }

    const valorGeracao = this.extrairValorNumerico(telemetria.value);

    if (valorGeracao !== null) {
      this.estadoSistema.processarGeracaoSolar(valorGeracao);
    }
  }

  public publicarComando(decisao: DecisaoSistema) {
    const mensagem = JSON.stringify(decisao);

    this.cliente.publish(config.topicos.comandoCarregador, mensagem, { qos: 0 }, (erro) => {
      if (erro) {
        console.error("Falha ao publicar comando para o carregador:", erro.message);
        return;
      }

      console.log(`Comando enviado para ${config.topicos.comandoCarregador}: ${mensagem}`);
    });
  }

  public encerrar() {
    this.cliente.end(true, {}, () => {
      console.log("Cliente MQTT encerrado.");
    });
  }

  public conectado(): boolean {
    return this.cliente.connected;
  }

  public reconectando(): boolean {
    return this.cliente.reconnecting;
  }

  private parseIncomingPayload(rawMessage: Buffer): { raw: string; value: unknown } {
    const raw = rawMessage.toString("utf8");

    try {
      return {
        raw,
        value: JSON.parse(raw),
      };
    } catch {
      return {
        raw,
        value: raw,
      };
    }
  }

  private extrairValorNumerico(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const valor = Number(value.replace(",", "."));
      return Number.isFinite(valor) ? valor : null;
    }

    if (typeof value === "object" && value !== null) {
      const registro = value as Record<string, unknown>;
      const chaves = [
        "valor",
        "geracao",
        "geracaoSolar",
        "potencia",
        "power",
        "watts",
        "consumo",
        "consumoResidencial",
      ];

      for (const chave of chaves) {
        const encontrado = this.extrairValorNumerico(registro[chave]);
        if (encontrado !== null) {
          return encontrado;
        }
      }
    }

    return null;
  }
}
