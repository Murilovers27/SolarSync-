"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { Tab, SystemStatus, TelemetryMessage } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export function useDashboardData() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [latest, setLatest] = useState<Record<string, TelemetryMessage>>({});
  const [history, setHistory] = useState<TelemetryMessage[]>([]);
  const [apiConnected, setApiConnected] = useState(false);
  const [tab, setTab] = useState<Tab>("agora");
  const [now, setNow] = useState<Date | null>(null);
  const [clearingData, setClearingData] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  async function limparDados() {
    if (!window.confirm("Limpar os dados de Cargas e Histórico? Esta ação não pode ser desfeita.")) return;

    setClearingData(true);
    setClearError(null);

    try {
      const response = await fetch(`${apiUrl}/telemetry/data`, { method: "DELETE" });
      if (!response.ok) throw new Error("Não foi possível limpar os dados.");

      setLatest({});
      setHistory([]);
      setStatus((current) => current ? { ...current, historySize: 0 } : current);
    } catch (error) {
      setClearError(error instanceof Error ? error.message : "Não foi possível limpar os dados.");
    } finally {
      setClearingData(false);
    }
  }

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let socket: Socket | undefined;

    socket = io(apiUrl, { transports: ["websocket"] });
    socket.on("telemetry:snapshot", (snapshot) => {
      setLatest(snapshot.latestByTopic);
      setHistory(snapshot.history);
    });
    socket.on("telemetry:update", (message: TelemetryMessage) => {
      setLatest((current) => ({ ...current, [message.topic]: message }));
      setHistory((current) => [...current.slice(-199), message]);
      setStatus((current) => message.estado && current
        ? { ...current, ...message.estado, historySize: Math.min(current.historySize + 1, 200) }
        : current
          ? { ...current, historySize: Math.min(current.historySize + 1, 200) }
          : current);
    });
    socket.on("connect", () => setApiConnected(true));
    socket.on("disconnect", () => setApiConnected(false));

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
      } catch {
        setApiConnected(socket?.connected ?? false);
      }
    }

    void loadInitialData();
    return () => {
      socket?.disconnect();
    };
  }, []);

  return { status, latest, history, apiConnected, tab, setTab, now, clearingData, clearError, limparDados };
}