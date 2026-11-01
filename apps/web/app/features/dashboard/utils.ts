export function formatKw(watts: number) {
  const kw = watts / 1000;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: kw < 1 ? 2 : 1,
    maximumFractionDigits: kw < 1 ? 2 : 1,
  }).format(kw);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function readNumericValue(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value.replace(",", "."));
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    for (const key of ["geracaoSolar", "geracao", "potencia", "potenciaWatts", "power", "watts", "valor"]) {
      const candidate = readNumericValue(record[key]);
      if (Number.isFinite(candidate)) return candidate;
    }
  }
  return null;
}