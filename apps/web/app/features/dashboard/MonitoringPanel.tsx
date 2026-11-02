"use client";

import type { TelemetryMessage } from "./types";
import { formatKw, readNumericValue } from "./utils";

const WIDTH = 900;
const HEIGHT = 460;
const PADDING = { top: 24, right: 24, bottom: 48, left: 64 };
const INNER_WIDTH = WIDTH - PADDING.left - PADDING.right;
const INNER_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

function isSolarTopic(topic: string) {
  return topic === "casa/solar/geracao" || topic.endsWith("/casa/solar/geracao");
}

function minutesOfDay(value: string) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function formatHour(minutes: number) {
  const hour = Math.floor(minutes / 60) % 24;
  return `${String(hour).padStart(2, "0")}:00`;
}

type Point = {
  x: number;
  y: number;
  watts: number;
  receivedAt: string;
};

export default function MonitoringPanel({ history }: { history: TelemetryMessage[] }) {
  // Filtra, valida e ordena as leituras cronologicamente pelo horário
  const readings = history
    .filter((message) => isSolarTopic(message.topic))
    .map((message) => ({
      message,
      watts: readNumericValue(message.value),
      timeMinutes: minutesOfDay(message.receivedAt),
    }))
    .filter((item): item is { message: TelemetryMessage; watts: number; timeMinutes: number } =>
      item.watts !== null && Number.isFinite(item.watts) && item.watts >= 0,
    )
    .sort((a, b) => a.timeMinutes - b.timeMinutes)
    .slice(-100);

  const maxWatts = Math.max(1000, ...readings.map((item) => item.watts));

  // Mapeamento correto: Eixo X = Tempo (00:00 às 24:00) | Eixo Y = Geração em Watts (Invertido no SVG pois Y cresce para baixo)
  const points: Point[] = readings.map(({ message, watts, timeMinutes }) => ({
    x: PADDING.left + (timeMinutes / 1440) * INNER_WIDTH,
    y: PADDING.top + INNER_HEIGHT - (watts / maxWatts) * INNER_HEIGHT,
    watts,
    receivedAt: message.receivedAt,
  }));

  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  
  // Ticks para o Eixo X (Horários: 0h, 6h, 12h, 18h, 24h)
  const xTicks = [0, 360, 720, 1080, 1440];
  // Ticks para o Eixo Y (Valores em kW)
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <section className="card monitoring-card" aria-label="Monitoramento da geração solar">
      <div className="card-head">
        <div>
          <span className="label">Monitoramento</span>
          <p className="monitoring-subtitle">Curva diária de geração solar</p>
        </div>
        <span className="muted">{readings.length} leituras</span>
      </div>
      {points.length < 2 ? (
        <p className="empty">Aguardando pelo menos duas leituras solares para desenhar a curva.</p>
      ) : (
        <div className="chart-scroll">
          <svg className="monitoring-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Gráfico de geração solar ao longo do dia">
            
            {/* Linhas de grade e rótulos do Eixo Y (Potência em kW) */}
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

            {/* Linhas de grade e rótulos do Eixo X (Horário do dia) */}
            {xTicks.map((minutes) => {
              const x = PADDING.left + (minutes / 1440) * INNER_WIDTH;
              return (
                <g key={minutes}>
                  <line className="chart-grid" x1={x} x2={x} y1={PADDING.top} y2={HEIGHT - PADDING.bottom} />
                  <text className="chart-axis-label" x={x} y={HEIGHT - PADDING.bottom + 22} textAnchor="middle">
                    {formatHour(minutes)}
                  </text>
                </g>
              );
            })}

            <polyline className="chart-line" points={line} />

            {points.map((point) => (
              <circle key={`${point.receivedAt}-${point.watts}`} className="chart-point" cx={point.x} cy={point.y} r="4">
                <title>{`${formatKw(point.watts)} kW · ${new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(point.receivedAt))}`}</title>
              </circle>
            ))}

            <text className="chart-title" x={WIDTH / 2} y={HEIGHT - 6} textAnchor="middle">Hora do dia</text>
            <text className="chart-title" transform={`translate(16 ${HEIGHT / 2}) rotate(-90)`} textAnchor="middle">Geração (kW)</text>
          </svg>
        </div>
      )}
      <p className="hint">Eixo X: horário do dia · Eixo Y: quantidade gerada em tempo real</p>
    </section>
  );
}