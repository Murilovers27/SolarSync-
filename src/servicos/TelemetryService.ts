import { TelemetriaMensagem } from "./MqttBrokerService";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import config from "../config";

type TelemetryRow = {
  topic: string;
  received_at: string;
  raw: string;
  value: unknown;
};

export class TelemetryService {
  private readonly latestByTopic: Record<string, TelemetriaMensagem> = {};
  private readonly history: TelemetriaMensagem[] = [];
  private readonly maxHistory = 200;
  private readonly supabase: SupabaseClient | null;

  constructor() {
    this.supabase =
      config.supabase.url && config.supabase.serviceRoleKey
        ? createClient(config.supabase.url, config.supabase.serviceRoleKey)
        : null;

    if (!this.supabase) {
      console.warn("Supabase não configurado. O histórico ficará apenas em memória.");
    }
  }

  public registrarMensagem(mensagem: TelemetriaMensagem) {
    this.latestByTopic[mensagem.topic] = mensagem;
    this.history.push(mensagem);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    void this.persistirMensagem(mensagem);
  }

  public async carregarHistorico() {
    if (!this.supabase) {
      return;
    }

    const { data, error } = await this.supabase
      .from("telemetry_messages")
      .select("topic, received_at, raw, value")
      .order("received_at", { ascending: false })
      .limit(this.maxHistory);

    if (error) {
      console.error("Falha ao carregar histórico do Supabase:", error.message);
      return;
    }

    const mensagens = (data as TelemetryRow[]).reverse().map((registro) => ({
      topic: registro.topic,
      receivedAt: registro.received_at,
      raw: registro.raw,
      value: registro.value,
    }));

    for (const mensagem of mensagens) {
      this.latestByTopic[mensagem.topic] = mensagem;
      this.history.push(mensagem);
    }
  }

  private async persistirMensagem(mensagem: TelemetriaMensagem) {
    if (!this.supabase) {
      return;
    }

    const { error } = await this.supabase.from("telemetry_messages").insert({
      topic: mensagem.topic,
      received_at: mensagem.receivedAt,
      raw: mensagem.raw,
      value: mensagem.value,
    });

    if (error) {
      console.error("Falha ao persistir telemetria no Supabase:", error.message);
    }
  }

  public getLatestByTopic() {
    return this.latestByTopic;
  }

  public getLatestPublico() {
    return Object.fromEntries(
      Object.entries(this.latestByTopic).map(([topic, mensagem]) => [topic, this.removerDadosInternos(mensagem)]),
    );
  }

  public getHistory() {
    return [...this.history];
  }

  public getHistoryPublico() {
    return this.history.map((mensagem) => this.removerDadosInternos(mensagem));
  }

  private removerDadosInternos(mensagem: TelemetriaMensagem) {
    return {
      topic: mensagem.topic,
      receivedAt: mensagem.receivedAt,
      value: mensagem.value,
    };
  }

  public getStatusResumo() {
    return {
      topics: Object.keys(this.latestByTopic).length,
      historySize: this.history.length,
      persisted: this.supabase !== null,
    };
  }
}
