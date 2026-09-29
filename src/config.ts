import dotenv from "dotenv";

dotenv.config();

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

function obterVariavelObrigatoria(...names: string[]) {
  const value = names
    .map((name) => process.env[name])
    .find((item) => item !== undefined && item.trim() !== "");

  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${names.join(" ou ")}`);
  }

  return value;
}

const config = {
  apiKey: process.env.SOLARSYNC_API_KEY,
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  mqtt: {
    host: obterVariavelObrigatoria("BROKER_MQTT_HOST", "HIVEMQ_HOST"),
    port: Number(process.env.BROKER_MQTT_PORT ?? process.env.HIVEMQ_PORT ?? 8883),
    protocol: ((process.env.BROKER_MQTT_PROTOCOL ??
      process.env.HIVEMQ_PROTOCOL ??
      (Number(process.env.BROKER_MQTT_PORT ?? process.env.HIVEMQ_PORT ?? 8883) === 8883 ? "mqtts" : "mqtt")) as "mqtt" | "mqtts"),
    username: obterVariavelObrigatoria("BROKER_MQTT_USUARIO", "HIVEMQ_USERNAME"),
    password: obterVariavelObrigatoria("BROKER_MQTT_SENHA", "HIVEMQ_PASSWORD"),
    clientId: process.env.BROKER_MQTT_CLIENT_ID ?? process.env.HIVEMQ_CLIENT_ID,
    rejectUnauthorized: parseBoolean(
      process.env.BROKER_MQTT_REJEITAR_CERTIFICADO ?? process.env.HIVEMQ_REJECT_UNAUTHORIZED,
      true,
    ),
    subscribeTopic:
      process.env.BROKER_MQTT_TOPICO_ASSINATURA ??
      process.env.HIVEMQ_SUBSCRIBE_TOPIC ??
      "casa/solar/geracao",
  },
  server: {
    port: Number(process.env.PORTA_API ?? process.env.PORT ?? 3000),
  },
  consumoResidenciaPadrao: Number(process.env.CONSUMO_RESIDENCIA_PADRAO ?? 400),
  topicos: {
    geracaoSolar: "casa/solar/geracao",
    comandoCarregador: "casa/carregador/comando",
  },
};

export default config;