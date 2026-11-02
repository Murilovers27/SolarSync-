export type TelemetryMessage = {
  topic: string;
  receivedAt: string;
  value: unknown;
  estado?: Pick<SystemStatus, "geracaoSolar" | "consumoResidencia" | "excedente" | "carregadorAtivo" | "ultimaDecisao">;
};

export type SystemStatus = {
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

export type Tab = "agora" | "monitoramento" | "cargas" | "historico" | "garagem";