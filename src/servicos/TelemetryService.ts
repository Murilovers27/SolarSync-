import { TelemetriaMensagem } from "./MqttBrokerService";

export class TelemetryService {
  private readonly latestByTopic: Record<string, TelemetriaMensagem> = {};
  private readonly history: TelemetriaMensagem[] = [];
  private readonly maxHistory = 200;

  public registrarMensagem(mensagem: TelemetriaMensagem) {
    this.latestByTopic[mensagem.topic] = mensagem;
    this.history.push(mensagem);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  public getLatestByTopic() {
    return this.latestByTopic;
  }

  public getHistory() {
    return this.history;
  }

  public getStatusResumo() {
    return {
      topics: Object.keys(this.latestByTopic).length,
      historySize: this.history.length,
    };
  }
}
