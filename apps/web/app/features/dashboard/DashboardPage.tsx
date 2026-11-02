"use client";

import { CarIcon, GridIcon, SunIcon } from "./icons";
import GaragePanel from "./GaragePanel";
import { useDashboardData } from "./useDashboardData";
import { formatDate, formatKw, readNumericValue } from "./utils";
import type { Tab } from "./types";
import { encerrarSessao } from "../../lib/auth";
import { useUserLoad } from "./useUserLoad";
import MonitoringPanel from "./MonitoringPanel";
import VehicleLoadsPanel from "./VehicleLoadsPanel";

const tabs: { id: Tab; label: string }[] = [
  { id: "agora", label: "Agora" },
  { id: "monitoramento", label: "Monitoramento" },
  { id: "cargas", label: "Cargas" },
  { id: "historico", label: "Histórico" },
  { id: "garagem", label: "Garagem" },
];

export default function DashboardPage() {
  const {
    status, latest, history, apiConnected, tab, setTab, now,
    clearingData, clearError, limparDados,
  } = useDashboardData();
  const { loadW } = useUserLoad();

  const solarTelemetry = Object.values(latest).find(
    (message) => message.topic === "casa/solar/geracao" || message.topic.endsWith("/casa/solar/geracao"),
  );
  const solarW = solarTelemetry ? readNumericValue(solarTelemetry.value) : status?.geracaoSolar ?? null;
  const totalLoadW = loadW ?? status?.consumoResidencia ?? null;
  const gridW = solarW !== null && totalLoadW !== null ? Math.max(totalLoadW - solarW, 0) : null;
  const coverage = solarW !== null && totalLoadW !== null && totalLoadW > 0
    ? Math.min(Math.round((solarW / totalLoadW) * 100), 100)
    : 0;
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
          <p className={`system-status ${systemActive ? "on" : "off"}`}><span className="dot" /> {systemActive ? "Sistema ativo" : "Sistema inativo"}</p>
          <h1>SolarSync</h1>
        </div>
        <div className="clock"><strong>{clock}</strong><span>{dateLabel}</span><button className="logout-button" type="button" onClick={() => void encerrarSessao()}>Sair</button></div>
      </header>

      <nav className="tabs" role="tablist" aria-label="Seções">
        {tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? "tab active" : "tab"} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </nav>

      <div className="content" role="tabpanel">
        {tab === "agora" && <>
          <section className="card solar-card" aria-label="Geração solar">
            <div className="card-head"><span className="label">Geração solar</span><span className="live">Ao vivo</span></div>
            <div className="solar-body">
              <div><p className="big yellow">{solarW === null ? "--" : formatKw(solarW)}</p><p className="unit">kW ativos</p></div>
              <div className="gauge" aria-label={`Cobertura solar ${coverage}%`}><svg viewBox="0 0 120 120" aria-hidden="true"><circle className="gauge-track" cx="60" cy="60" r="50" pathLength={100} /><circle className="gauge-fill" cx="60" cy="60" r="50" pathLength={100} strokeDasharray={`${(coverage * 75) / 100} 100`} /></svg><div className="gauge-text"><strong>{coverage}%</strong><span>Solar</span></div></div>
            </div>
            <p className="hint">Cobertura solar das cargas ativas</p>
          </section>

          <div className="pair">
            <section className="card" aria-label="Carga total"><span className="label">Carga total</span><p className="big white">{totalLoadW === null ? "--" : formatKw(totalLoadW)}</p><p className="unit">kW consumo</p></section>
            <section className="card" aria-label="Rede elétrica"><span className="label">Rede elétrica</span><p className="big green">{gridW === null ? "--" : formatKw(gridW)}</p><p className="unit">kW da rede</p></section>
          </div>

          <section className="card" aria-label="Fluxo de energia"><span className="label">Fluxo de energia</span><div className="flow">
            <div className="node solar"><span className="node-icon"><SunIcon /></span><small>Solar</small><strong>{solarW === null ? "--" : `${formatKw(solarW)} kW`}</strong></div><span className={`line ${solarW ? "active" : ""}`} />
            <div className="node cars"><span className="node-icon"><CarIcon /></span><small>Carros</small><strong>{totalLoadW === null ? "--" : `${formatKw(totalLoadW)} kW`}</strong></div><span className={`line ${gridW ? "active-green" : ""}`} />
            <div className="node grid"><span className="node-icon"><GridIcon /></span><small>Rede</small><strong>{gridW === null ? "--" : `${formatKw(gridW)} kW`}</strong></div>
          </div></section>
        </>}

        {tab === "monitoramento" && <MonitoringPanel history={history} />}

        {tab === "cargas" && <>
          <VehicleLoadsPanel status={status} />
          <section className="card" aria-label="Telemetria por tópico">
            <div className="card-head"><span className="label">Últimos tópicos</span><div className="card-actions"><span className="muted">{topics.length} tópicos</span><button className="clear-button" onClick={() => void limparDados()} disabled={clearingData}>{clearingData ? "Limpando..." : "Limpar"}</button></div></div>
            {clearError && <p className="error-message" role="alert">{clearError}</p>}
            {topics.length === 0 ? <p className="empty">Aguardando mensagens do broker.</p> : <ul className="rows">{topics.map((message) => <li key={message.topic}><div><strong>{message.topic}</strong><span>{formatDate(message.receivedAt)}</span></div><code>{JSON.stringify(message.value)}</code></li>)}</ul>}
            <p className="hint">Carregador: {status?.carregadorAtivo ? "ligado" : "desligado"}{status?.ultimaDecisao ? ` · última decisão: ${status.ultimaDecisao.comando}` : ""}</p>
          </section>
        </>}

        {tab === "historico" && <section className="card" aria-label="Histórico recente">
          <div className="card-head"><span className="label">Histórico recente</span><div className="card-actions"><span className="muted">{history.length} mensagens</span><button className="clear-button" onClick={() => void limparDados()} disabled={clearingData}>{clearingData ? "Limpando..." : "Limpar"}</button></div></div>
          {clearError && <p className="error-message" role="alert">{clearError}</p>}
          {history.length === 0 ? <p className="empty">Nenhuma mensagem registrada ainda.</p> : <ul className="rows">{history.slice().reverse().slice(0, 20).map((message, index) => <li key={`${message.receivedAt}-${index}`}><div><strong>{message.topic}</strong><span>{formatDate(message.receivedAt)}</span></div><code>{JSON.stringify(message.value)}</code></li>)}</ul>}
          <p className="hint">Armazenamento: {status?.persisted ? "Supabase" : "memória"}</p>
        </section>}

        {tab === "garagem" && <GaragePanel />}
      </div>

      <footer className="footer"><span>SolarSync v1.0</span><span className={`online ${apiConnected ? "on" : "off"}`}><i /> {apiConnected ? "Online" : "Offline"}</span></footer>
    </main>
  );
}