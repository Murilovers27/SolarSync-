import type { SystemStatus, TelemetryMessage } from "../types";
import { formatDate } from "../utils";

type HealthCheckPanelProps = {
  status: SystemStatus | null;
  history: TelemetryMessage[];
  apiConnected: boolean;
};

function idadeDaLeitura(receivedAt: string | undefined, now: number) {
  if (!receivedAt) return "Nenhuma leitura recebida";

  const segundos = Math.max(0, Math.round((now - new Date(receivedAt).getTime()) / 1000));
  if (segundos < 60) return `Atualizada há ${segundos}s`;
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `Atualizada há ${minutos}min`;
  return `Atualizada há ${Math.round(minutos / 60)}h`;
}

function statusDaLeitura(receivedAt: string | undefined, now: number) {
  if (!receivedAt) return "attention";
  return now - new Date(receivedAt).getTime() <= 60_000 ? "ok" : "attention";
}

function StatusBadge({ state }: { state: "ok" | "attention" | "offline" }) {
  const labels = {
    ok: "Operando",
    attention: "Atenção",
    offline: "Indisponível",
  };

  return <span className={`health-badge ${state}`}>{labels[state]}</span>;
}

function HealthItem({
  title,
  description,
  state,
}: {
  title: string;
  description: string;
  state: "ok" | "attention" | "offline";
}) {
  return (
    <li className="health-item">
      <div className={`health-indicator ${state}`} aria-hidden="true" />
      <div className="health-item-content">
        <div className="health-item-head">
          <strong>{title}</strong>
          <StatusBadge state={state} />
        </div>
        <span>{description}</span>
      </div>
    </li>
  );
}

export default function HealthCheckPanel({ status, history, apiConnected }: HealthCheckPanelProps) {
  const now = Date.now();
  const solarTelemetry = history
    .filter((message) => message.topic.endsWith("casa/solar/geracao"))
    .at(-1);
  const chargerTelemetry = history
    .filter((message) => message.topic.endsWith("casa/carregador/status"))
    .at(-1);
  const mqttState = status?.mqttConnected ? "ok" : "offline";
  const solarState = statusDaLeitura(solarTelemetry?.receivedAt, now);
  const chargerState = status?.mqttConnected
    ? chargerTelemetry
      ? statusDaLeitura(chargerTelemetry.receivedAt, now)
      : "attention"
    : "offline";
  const overallState = apiConnected && status?.mqttConnected && solarState === "ok" ? "ok" : "attention";
  const ultimaDecisao = status?.ultimaDecisao;

  return (
    <>
      <section className="health-hero card" aria-label="Resumo da saúde do sistema">
        <div>
          <span className="label">Health check detalhado</span>
          <h2 className="health-title">
            {overallState === "ok" ? "Tudo funcionando bem" : "O sistema precisa de atenção"}
          </h2>
          <p className="health-subtitle">
            Verificação em tempo real dos serviços e dispositivos do SolarSync.
          </p>
        </div>
        <StatusBadge state={overallState} />
      </section>

      <section className="card" aria-label="Status dos serviços">
        <div className="card-head">
          <span className="label">Status dos serviços</span>
          <span className="muted">{history.length} leituras registradas</span>
        </div>
        <ul className="health-list">
          <HealthItem
            title="Aplicação web e API"
            description={apiConnected ? "Conexão com o servidor estabelecida." : "Não foi possível conectar ao servidor."}
            state={apiConnected ? "ok" : "offline"}
          />
          <HealthItem
            title="Comunicação com os dispositivos"
            description={
              status?.mqttConnected
                ? "Broker conectado e pronto para receber dados."
                : "A comunicação com o broker está indisponível."
            }
            state={mqttState}
          />
          <HealthItem
            title="Geração solar"
            description={`${idadeDaLeitura(solarTelemetry?.receivedAt, now)}${solarTelemetry ? ` · ${formatDate(solarTelemetry.receivedAt)}` : ""}`}
            state={solarState}
          />
          <HealthItem
            title="Carregador veicular"
            description={
              chargerTelemetry
                ? `${idadeDaLeitura(chargerTelemetry.receivedAt, now)} · Estado atual: ${status?.carregadorAtivo ? "ligado" : "desligado"}`
                : "Ainda não há confirmação de estado do carregador."
            }
            state={chargerState}
          />
          <HealthItem
            title="Histórico de dados"
            description={status?.persisted ? "Dados protegidos e salvos no Supabase." : "Dados temporários na memória da aplicação."}
            state={status?.persisted ? "ok" : "attention"}
          />
        </ul>
      </section>

      <section className="health-columns">
        <article className="card health-summary-card">
          <span className="label">Resumo energético</span>
          <dl className="health-metrics">
            <div><dt>Geração solar</dt><dd>{status ? `${Math.round(status.geracaoSolar)} W` : "--"}</dd></div>
            <div><dt>Consumo da residência</dt><dd>{status ? `${Math.round(status.consumoResidencia)} W` : "--"}</dd></div>
            <div><dt>Excedente disponível</dt><dd>{status ? `${Math.round(Math.max(status.excedente, 0))} W` : "--"}</dd></div>
          </dl>
        </article>
        <article className="card health-summary-card">
          <span className="label">Última decisão automática</span>
          {ultimaDecisao ? (
            <>
              <p className="health-decision">{ultimaDecisao.comando === "ligar" ? "Carregamento ligado" : "Carregamento desligado"}</p>
              <p className="hint">{formatDate(ultimaDecisao.timestamp)}</p>
            </>
          ) : (
            <p className="empty">Nenhuma decisão registrada ainda.</p>
          )}
        </article>
      </section>

      <section className="card" aria-label="Atividade recente">
        <div className="card-head">
          <span className="label">Atividade recente</span>
          <span className="muted">Últimas atualizações</span>
        </div>
        {history.length === 0 ? (
          <p className="empty">Aguardando a primeira leitura dos dispositivos.</p>
        ) : (
          <ul className="activity-list">
            {history.slice(-5).reverse().map((message, index) => (
              <li key={`${message.receivedAt}-${index}`}>
                <span className="activity-dot" aria-hidden="true" />
                <div>
                  <strong>{message.topic.includes("solar") ? "Leitura solar recebida" : "Atualização do carregador recebida"}</strong>
                  <span>{formatDate(message.receivedAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
