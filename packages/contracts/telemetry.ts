export type TipoComandoCarregador = "ligar" | "desligar";

export type TelemetriaMensagem = {
  topic: string;
  receivedAt: string;
  value: unknown;
};

export type MensagemGeracaoSolar = {
  geracaoSolar: number;
  unidade?: "W";
  timestamp?: string;
};