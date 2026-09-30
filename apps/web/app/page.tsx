"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

type TelemetryMessage = {
  topic: string;
  receivedAt: string;
  value: unknown;
};

type SystemStatus = {
  geracaoSolar: number;
  consumoResidencia: number;
  excedente: number;
  carregadorAtivo: boolean;
  ultimaDecisao: {
    comando: string;
    status: string;
    timestamp: string;
  } | null;
  mqttConnected: boolean;
  mqttStatus: string;
  historySize: number;
  persisted: boolean;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function readNumericValue(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value.replace(",", "."));
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    for (const key of ["geracaoSolar", "geracao", "potencia", "power", "watts", "valor"]) {
      const candidate = readNumericValue(record[key]);
      if (Number.isFinite(candidate)) return candidate;
    }
  }
  return null;
}

export default function HomePage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [latest, setLatest] = useState<Record<string, TelemetryMessage>>({});
  const [history, setHistory] = useState<TelemetryMessage[]>([]);
  const [apiConnected, setApiConnected] = useState(false);

  useEffect(() => {
    let socket: Socket | undefined;

    async function loadInitialData() {
      try {
        const [statusResponse, latestResponse, historyResponse] = await Promise.all([
          fetch(`${apiUrl}/status`),
          fetch(`${apiUrl}/telemetry/latest`),
          fetch(`${apiUrl}/telemetry/history`),
        ]);

        if (!statusResponse.ok || !latestResponse.ok || !historyResponse.ok) throw new Error("API indisponível");

        setStatus(await statusResponse.json());
        setLatest(await latestResponse.json());
        setHistory(await historyResponse.json());
        setApiConnected(true);

        socket = io(apiUrl, { transports: ["websocket"] });
        socket.on("telemetry:snapshot", (snapshot) => {
          setLatest(snapshot.latestByTopic);
          setHistory(snapshot.history);
        });
        socket.on("telemetry:update", (message: TelemetryMessage) => {
          setLatest((current) => ({ ...current, [message.topic]: message }));
          setHistory((current) => [...current.slice(-199), message]);
          setStatus((current) => current ? { ...current, historySize: Math.min(current.historySize + 1, 200) } : current);
        });
        socket.on("connect", () => setApiConnected(true));
        socket.on("disconnect", () => setApiConnected(false));
      } catch {
        setApiConnected(false);
      }
    }

    void loadInitialData();
    return () => {
      socket?.disconnect();
    };
  }, []);

  const solarTelemetry = latest["casa/solar/geracao"];
  const solarValue = solarTelemetry ? readNumericValue(solarTelemetry.value) : status?.geracaoSolar ?? null;

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SolarSync</p>
          <h1>Monitoramento energético</h1>
        </div>
        <div className={`connection-pill ${apiConnected ? "online" : "offline"}`}>
          <span /> {apiConnected ? "API conectada" : "API desconectada"}
        </div>
      </header>

      <section className="summary-grid" aria-label="Resumo do sistema">
        <article className="metric-card solar-card">
          <span>Geração solar</span>
          <strong>{solarValue === null ? "--" : `${formatNumber(solarValue)} W`}</strong>
          <small>Último valor recebido</small>
        </article>
        <article className="metric-card">
          <span>Consumo residencial</span>
          <strong>{status ? `${formatNumber(status.consumoResidencia)} W` : "--"}</strong>
          <small>Consumo configurado</small>
        </article>
        <article className="metric-card">
          <span>Excedente</span>
          <strong>{status ? `${formatNumber(status.excedente)} W` : "--"}</strong>
          <small>Disponível para autoconsumo</small>
        </article>
        <article className="metric-card">
          <span>Carregador</span>
          <strong>{status?.carregadorAtivo ? "Ligado" : "Desligado"}</strong>
          <small>{status?.ultimaDecisao ? `Decisão: ${status.ultimaDecisao.comando}` : "Sem decisão registrada"}</small>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Telemetria</p><h2>Últimos tópicos</h2></div>
            <span className="muted">{Object.keys(latest).length} tópicos</span>
          </div>
          <div className="telemetry-list">
            {Object.values(latest).length === 0 ? <p className="empty-state">Aguardando mensagens do broker.</p> : Object.values(latest).map((message) => (
              <div className="telemetry-row" key={`${message.topic}-${message.receivedAt}`}>
                <div><strong>{message.topic}</strong><span>{formatDate(message.receivedAt)}</span></div>
                <code>{JSON.stringify(message.value)}</code>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Operação</p><h2>Conectividade</h2></div>
          </div>
          <dl className="status-list">
            <div><dt>API</dt><dd>{apiConnected ? "Online" : "Offline"}</dd></div>
            <div><dt>MQTT</dt><dd>{status?.mqttStatus ?? "Indisponível"}</dd></div>
            <div><dt>Mensagens no histórico</dt><dd>{status?.historySize ?? history.length}</dd></div>
            <div><dt>Persistência</dt><dd>{status?.persisted ? "Supabase" : "Memória"}</dd></div>
          </dl>
        </article>
      </section>

      <section className="panel history-panel">
        <div className="panel-heading"><div><p className="eyebrow">Registro</p><h2>Histórico recente</h2></div><span className="muted">{history.length} mensagens</span></div>
        <div className="history-table-wrap"><table><thead><tr><th>Horário</th><th>Tópico</th><th>Valor</th></tr></thead><tbody>
          {history.slice().reverse().slice(0, 12).map((message, index) => <tr key={`${message.receivedAt}-${index}`}><td>{formatDate(message.receivedAt)}</td><td>{message.topic}</td><td><code>{JSON.stringify(message.value)}</code></td></tr>)}
        </tbody></table>{history.length === 0 && <p className="empty-state">Nenhuma mensagem persistida ainda.</p>}</div>
      </section>
    </main>
  );
}