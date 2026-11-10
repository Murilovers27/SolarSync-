"use client";

import { useGarageData } from "../useGarageData";
import type { SystemStatus } from "../types";
import styles from "./VehicleLoadsPanel.module.css";

export default function VehicleLoadsPanel({ status }: { status: SystemStatus | null }) {
  const { cars, loading, error } = useGarageData();
  const isCharging = status?.carregadorAtivo ?? false;
  const activeCars = isCharging ? cars.length : 0;

  if (loading) {
    return <section className="card" aria-label="Veículos em carga"><p className="empty">Carregando veículos...</p></section>;
  }

  if (error) {
    return <section className="card" aria-label="Veículos em carga"><p className="error-message" role="alert">{error}</p></section>;
  }

  return (
    <div className={styles.root}>
      <section className={`card ${styles.hero}`} aria-label="Resumo das cargas">
        <div className={styles.heroCopy}>
          <span className="label">Gestão de cargas</span>
          <h2 className={styles.title}>{isCharging ? "Carregamento em andamento" : "Cargas em espera"}</h2>
          <p className={styles.subtitle}>
            {isCharging
              ? "O excedente solar está sendo direcionado para o carregador."
              : "Nenhum carregamento está ativo neste momento."}
          </p>
        </div>
        <span className={`${styles.stateBadge} ${isCharging ? styles.active : styles.paused}`}>
          <i />
          {isCharging ? "Ativo" : "Pausado"}
        </span>
      </section>

      <section className={styles.metrics} aria-label="Resumo das cargas">
        <article className={`card ${styles.metricCard}`}>
          <span className="label">Veículos</span>
          <strong>{cars.length}</strong>
          <span>vinculados</span>
        </article>
        <article className={`card ${styles.metricCard}`}>
          <span className="label">Em carga</span>
          <strong className={isCharging ? styles.metricActive : ""}>{activeCars}</strong>
          <span>neste momento</span>
        </article>
        <article className={`card ${styles.metricCard}`}>
          <span className="label">Excedente solar</span>
          <strong>{status ? `${Math.round(Math.max(status.excedente, 0))}` : "--"}</strong>
          <span>watts disponíveis</span>
        </article>
      </section>

      <section className={`card ${styles.vehicleCard}`} aria-label="Veículos vinculados">
        <div className="card-head">
          <div>
            <span className="label">Veículos vinculados</span>
            <p className={styles.sectionSubtitle}>Acompanhe o estado de cada veículo conectado.</p>
          </div>
          <span className="muted">{cars.length} cadastrados</span>
        </div>
      {cars.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>+</span>
          <strong>Nenhum veículo cadastrado</strong>
          <p>Cadastre um veículo na aba Garagem para acompanhar suas cargas.</p>
        </div>
      ) : (
        <ul className={styles.vehicleList}>
          {cars.map((car) => (
            <li key={car.id} className={styles.vehicle}>
              <div className={styles.vehicleIdentity}>
                <span className={styles.vehicleIcon}>EV</span>
                <div>
                  <strong>{car.nome}</strong>
                  <span>{[car.marca, car.modelo].filter(Boolean).join(" ") || "Modelo não informado"}</span>
                  {car.placa && <small>{car.placa}</small>}
                </div>
              </div>
              <div className={`${styles.vehicleStatus} ${isCharging ? styles.active : ""}`}>
                <i />
                <span>{isCharging ? "Carregando" : "Pausado"}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
        <p className="hint">Estado recebido de solarsync/murilo123/casa/carregador/status.</p>
      </section>
    </div>
  );
}
