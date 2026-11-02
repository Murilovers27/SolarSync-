"use client";

import { useGarageData } from "./useGarageData";
import type { SystemStatus } from "./types";

export default function VehicleLoadsPanel({ status }: { status: SystemStatus | null }) {
  const { cars, loading, error } = useGarageData();

  if (loading) {
    return <section className="card" aria-label="Veículos em carga"><p className="empty">Carregando veículos...</p></section>;
  }

  if (error) {
    return <section className="card" aria-label="Veículos em carga"><p className="error-message" role="alert">{error}</p></section>;
  }

  return (
    <section className="card" aria-label="Veículos em carga">
      <div className="card-head">
        <span className="label">Veículos vinculados</span>
        <span className="muted">{cars.length} cadastrados</span>
      </div>
      {cars.length === 0 ? (
        <p className="empty">Cadastre um veículo na aba Garagem para acompanhar suas cargas.</p>
      ) : (
        <ul className="vehicle-loads">
          {cars.map((car) => (
            <li key={car.id} className="vehicle-load">
              <div>
                <strong>{car.nome}</strong>
                <span>{[car.marca, car.modelo].filter(Boolean).join(" ") || "Modelo não informado"}</span>
                {car.placa && <small>{car.placa}</small>}
              </div>
              <div className={`vehicle-status ${status?.carregadorAtivo ? "active" : ""}`}>
                <i />
                <span>{status?.carregadorAtivo ? "Carregando" : "Pausado"}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">Estado recebido de solarsync/murilo123/casa/carregador/status.</p>
    </section>
  );
}
