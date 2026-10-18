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

type Tab = "agora" | "cargas" | "historico";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const tabs: { id: Tab; label: string }[] = [
  { id: "agora", label: "Agora" },
  { id: "cargas", label: "Cargas" },
  { id: "historico", label: "Histórico" },
];

// 8.0 / 18.4 / 0.46 — igual ao layout de referência
function formatKw(watts: number) {
  const kw = watts / 1000;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: kw < 1 ? 2 : 1,
    maximumFractionDigits: kw < 1 ? 2 : 1,
  }).format(kw);
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

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="4" width="10" height="17" rx="2" />
      <path d="M10 2h4M12 9v6M9.5 12h5" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 11l9-7 9 7v9H3z" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

export default function HomePage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [latest, setLatest] = useState<Record<string, TelemetryMessage>>({});
  const [history, setHistory] = useState<TelemetryMessage[]>([]);
  const [apiConnected, setApiConnected] = useState(false);
  const [tab, setTab] = useState<Tab>("agora");
  const [now, setNow] = useState<Date | null>(null);

  // Relógio (iniciado no cliente para evitar erro de hidratação)
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);

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

  // ---- Valores derivados (em W) ----
  const solarTelemetry = latest["casa/solar/geracao"];
  const solarW = solarTelemetry ? readNumericValue(solarTelemetry.value) : status?.geracaoSolar ?? null;
  const loadW = status?.consumoResidencia ?? null;
  const gridW = solarW !== null && loadW !== null ? Math.max(loadW - solarW, 0) : null;
  const coverage =
    solarW !== null && loadW !== null && loadW > 0 ? Math.min(Math.round((solarW / loadW) * 100), 100) : 0;

  const clock = now ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(now) : "--:--";
  const dateLabel = now
    ? new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" }).format(now)
    : "";

  const systemActive = apiConnected && (status?.mqttConnected ?? false);
  const topics = Object.values(latest);

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <p className={`system-status ${systemActive ? "on" : "off"}`}>
            <span className="dot" /> {systemActive ? "Sistema ativo" : "Sistema inativo"}
          </p>
          <h1>SolarSync</h1>
        </div>
        <div className="clock">
          <strong>{clock}</strong>
          <span>{dateLabel}</span>
        </div>
      </header>

      <nav className="tabs" role="tablist" aria-label="Seções">
        {tabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "tab active" : "tab"}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="content" role="tabpanel">
        {tab === "agora" && (
          <>
            <section className="card solar-card" aria-label="Geração solar">
              <div className="card-head">
                <span className="label">Geração solar</span>
                <span className="live">Ao vivo</span>
              </div>
              <div className="solar-body">
                <div>
                  <p className="big yellow">{solarW === null ? "--" : formatKw(solarW)}</p>
                  <p className="unit">kW ativos</p>
                </div>
                <div className="gauge" aria-label={`Cobertura solar ${coverage}%`}>
                  <svg viewBox="0 0 120 120" aria-hidden="true">
                    <circle className="gauge-track" cx="60" cy="60" r="50" pathLength={100} />
                    <circle
                      className="gauge-fill"
                      cx="60"
                      cy="60"
                      r="50"
                      pathLength={100}
                      strokeDasharray={`${(coverage * 75) / 100} 100`}
                    />
                  </svg>
                  <div className="gauge-text">
                    <strong>{coverage}%</strong>
                    <span>Solar</span>
                  </div>
                </div>
              </div>
              <p className="hint">Cobertura solar das cargas ativas</p>
            </section>

            <div className="pair">
              <section className="card" aria-label="Carga total">
                <span className="label">Carga total</span>
                <p className="big white">{loadW === null ? "--" : formatKw(loadW)}</p>
                <p className="unit">kW consumo</p>
              </section>
              <section className="card" aria-label="Rede elétrica">
                <span className="label">Rede elétrica</span>
                <p className="big green">{gridW === null ? "--" : formatKw(gridW)}</p>
                <p className="unit">kW da rede</p>
              </section>
            </div>

            <section className="card" aria-label="Fluxo de energia">
              <span className="label">Fluxo de energia</span>
              <div className="flow">
                <div className="node solar">
                  <span className="node-icon"><SunIcon /></span>
                  <small>Solar</small>
                  <strong>{solarW === null ? "--" : `${formatKw(solarW)} kW`}</strong>
                </div>
                <span className={`line ${solarW ? "active" : ""}`} />
                <div className="node cars">
                  <span className="node-icon"><CarIcon /></span>
                  <small>Carros</small>
                  <strong>{loadW === null ? "--" : `${formatKw(loadW)} kW`}</strong>
                </div>
                <span className={`line ${gridW ? "active-green" : ""}`} />
                <div className="node grid">
                  <span className="node-icon"><GridIcon /></span>
                  <small>Rede</small>
                  <strong>{gridW === null ? "--" : `${formatKw(gridW)} kW`}</strong>
                </div>
              </div>
            </section>
          </>
        )}

        {tab === "cargas" && (
          <section className="card" aria-label="Telemetria por tópico">
            <div className="card-head">
              <span className="label">Últimos tópicos</span>
              <span className="muted">{topics.length} tópicos</span>
            </div>
            {topics.length === 0 ? (
              <p className="empty">Aguardando mensagens do broker.</p>
            ) : (
              <ul className="rows">
                {topics.map((message) => (
                  <li key={message.topic}>
                    <div>
                      <strong>{message.topic}</strong>
                      <span>{formatDate(message.receivedAt)}</span>
                    </div>
                    <code>{JSON.stringify(message.value)}</code>
                  </li>
                ))}
              </ul>
            )}
            <p className="hint">
              Carregador: {status?.carregadorAtivo ? "ligado" : "desligado"}
              {status?.ultimaDecisao ? ` · última decisão: ${status.ultimaDecisao.comando}` : ""}
            </p>
          </section>
        )}

        {tab === "historico" && (
          <section className="card" aria-label="Histórico recente">
            <div className="card-head">
              <span className="label">Histórico recente</span>
              <span className="muted">{history.length} mensagens</span>
            </div>
            {history.length === 0 ? (
              <p className="empty">Nenhuma mensagem registrada ainda.</p>
            ) : (
              <ul className="rows">
                {history
                  .slice()
                  .reverse()
                  .slice(0, 20)
                  .map((message, index) => (
                    <li key={`${message.receivedAt}-${index}`}>
                      <div>
                        <strong>{message.topic}</strong>
                        <span>{formatDate(message.receivedAt)}</span>
                      </div>
                      <code>{JSON.stringify(message.value)}</code>
                    </li>
                  ))}
              </ul>
            )}
            <p className="hint">Armazenamento: {status?.persisted ? "Supabase" : "memória"}</p>
          </section>
        )}
      </div>

      <footer className="footer">
        <span>SolarSync v1.0</span>
        <span className={`online ${apiConnected ? "on" : "off"}`}>
          <i /> {apiConnected ? "Online" : "Offline"}
        </span>
      </footer>
    </main>
  );
}