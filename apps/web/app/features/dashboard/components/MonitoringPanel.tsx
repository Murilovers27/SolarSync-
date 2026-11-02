"use client";

import { useState } from "react";
import type { TelemetryMessage } from "../types";
import { formatKw, readNumericValue } from "../utils";
import styles from "./MonitoringPanel.module.css";

const WIDTH = 900;
const HEIGHT = 460;
const PADDING = { top: 24, right: 24, bottom: 48, left: 64 };
const INNER_WIDTH = WIDTH - PADDING.left - PADDING.right;
const INNER_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

function isSolarTopic(topic: string) {
  return topic === "casa/solar/geracao" || topic.endsWith("/casa/solar/geracao");
}

function getMinutesFromMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function formatMinuteLabel(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type Point = {
  x: number;
  y: number;
  watts: number;
  receivedAt: string;
  timeMinutes: number;
};

export default function MonitoringPanel({ history }: { history: TelemetryMessage[] }) {
  // Estado para selecionar o dia (YYYY-MM-DD) e os horários de início e fim
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [startHour, setStartHour] = useState<string>("00:00");
  const [endHour, setEndHour] = useState<string>("23:59");

  // Converter horários de filtro em minutos do dia
  const [startH, startM] = startHour.split(":").map(Number);
  const [endH, endM] = endHour.split(":").map(Number);
  const startMinutes = startH * 60 + (startM || 0);
  const endMinutes = endH * 60 + (endM || 0);

  // Filtra as leituras com base no tópico solar, na data seleccionada e no intervalo de horas/minutos
  const readings = history
    .filter((message) => isSolarTopic(message.topic))
    .map((message) => {
      const date = new Date(message.receivedAt);
      return {
        message,
        watts: readNumericValue(message.value),
        dateObj: date,
        dateStr: date.toISOString().split("T")[0],
        timeMinutes: getMinutesFromMidnight(date),
      };
    })
    .filter((item): item is { message: TelemetryMessage; watts: number; dateObj: Date; dateStr: string; timeMinutes: number } =>
      item.watts !== null && Number.isFinite(item.watts) && item.watts >= 0,
    )
    .filter((item) => {
      // Filtra pelo dia escolhido e pelo intervalo de minutos
      const matchesDate = !selectedDate || item.dateStr === selectedDate;
      const matchesTime = item.timeMinutes >= startMinutes && item.timeMinutes <= endMinutes;
      return matchesDate && matchesTime;
    })
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const maxWatts = Math.max(1000, ...readings.map((item) => item.watts));

  // Mapeia os pontos considerando o intervalo exacto escolhido pelo utilizador para o Eixo X
  const timeSpan = Math.max(1, endMinutes - startMinutes);
  const points: Point[] = readings.map(({ message, watts, timeMinutes }) => ({
    x: PADDING.left + ((timeMinutes - startMinutes) / timeSpan) * INNER_WIDTH,
    y: PADDING.top + INNER_HEIGHT - (watts / maxWatts) * INNER_HEIGHT,
    watts,
    receivedAt: message.receivedAt,
    timeMinutes,
  }));

  const line = points.map((point) => `${point.x},${point.y}`).join(" ");

  // Gera ticks baseados no intervalo de minutos escolhido
  const xTicksCount = 5;
  const xTicks = Array.from({ length: xTicksCount }, (_, i) => 
    startMinutes + (timeSpan / (xTicksCount - 1)) * i
  );
  
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  const lastReadingTime = readings.length > 0 
    ? new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(
      new Date(readings[readings.length - 1].message.receivedAt),
    )
    : "--:--";

  return (
    <section className={`card monitoring-card ${styles.root}`} aria-label="Monitoramento da geração solar">
      <div className="card-head">
        <div>
          <span className="label">Monitoramento</span>
          <p className="monitoring-subtitle">Curva de geração solar por minuto</p>
        </div>
        <div className={styles.liveIndicator}>
          <span className={styles.liveDot} />
          <span className="live">Ao Vivo</span>
          <span className="muted" style={{ marginLeft: "8px" }}>{readings.length} leituras</span>
        </div>
      </div>

      {/* Controlos para escolha de dia e horários */}
      <div className={styles.filterControls}>
        <div className={styles.filterGroup}>
          <label htmlFor="date-select" className={styles.filterLabel}>Dia:</label>
          <input 
            id="date-select" 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className={styles.filterInput}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="start-time" className={styles.filterLabel}>De:</label>
          <input 
            id="start-time" 
            type="time" 
            value={startHour} 
            onChange={(e) => setStartHour(e.target.value)} 
            className={styles.filterInput}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="end-time" className={styles.filterLabel}>Até:</label>
          <input 
            id="end-time" 
            type="time" 
            value={endHour} 
            onChange={(e) => setEndHour(e.target.value)} 
            className={styles.filterInput}
          />
        </div>
      </div>

      {points.length < 2 ? (
        <p className="empty">Aguardando pelo menos duas leituras solares no intervalo seleccionado para desenhar a curva.</p>
      ) : (
        <div className={styles.chartScroll}>
          <svg className="monitoring-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Gráfico de geração solar por minuto">
            {yTicks.map((ratio) => {
              const y = PADDING.top + INNER_HEIGHT - ratio * INNER_HEIGHT;
              return (
                <g key={ratio}>
                  <line className="chart-grid" x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} />
                  <text className="chart-axis-label" x={PADDING.left - 10} y={y + 4} textAnchor="end">
                    {formatKw(maxWatts * ratio)}
                  </text>
                </g>
              );
            })}

            {xTicks.map((minutes, idx) => {
              const x = PADDING.left + ((minutes - startMinutes) / timeSpan) * INNER_WIDTH;
              return (
                <g key={idx}>
                  <line className="chart-grid" x1={x} x2={x} y1={PADDING.top} y2={HEIGHT - PADDING.bottom} />
                  <text className="chart-axis-label" x={x} y={HEIGHT - PADDING.bottom + 22} textAnchor="middle">
                    {formatMinuteLabel(minutes)}
                  </text>
                </g>
              );
            })}

            <polyline className="chart-line" points={line} />

            {points.map((point) => (
              <circle key={`${point.receivedAt}-${point.watts}`} className="chart-point" cx={point.x} cy={point.y} r="4">
                <title>{`${formatKw(point.watts)} kW · ${new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium" }).format(new Date(point.receivedAt))}`}</title>
              </circle>
            ))}

            <text className="chart-title" x={WIDTH / 2} y={HEIGHT - 6} textAnchor="middle">Horário (Minutos)</text>
            <text className="chart-title" transform={`translate(16 ${HEIGHT / 2}) rotate(-90)`} textAnchor="middle">Geração (kW)</text>
          </svg>
        </div>
      )}

      <div className={styles.footerInfo}>
        <p className="hint">Eixo X: hora e minuto · Eixo Y: quantidade gerada em tempo real</p>
        <p className={styles.lastReading}>Última leitura: <strong>{lastReadingTime}</strong></p>
      </div>
    </section>
  );
}