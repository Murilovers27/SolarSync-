"use client";

import { useGarageData } from "./useGarageData";

export default function GaragePanel() {
  const { profile, cars, loading, error } = useGarageData();

  if (loading) return <section className="card" aria-label="Garagem"><p className="empty">Carregando garagem...</p></section>;
  if (error) return <section className="card" aria-label="Garagem"><p className="error-message" role="alert">{error}</p></section>;

  return (
    <>
      <section className="card" aria-label="Dados do usuário">
        <div className="card-head"><span className="label">Meu perfil</span><span className="muted">Conta ativa</span></div>
        <ul className="profile-data">
          <li><span>Nome</span><strong>{profile?.nome}</strong></li>
          <li><span>E-mail</span><strong>{profile?.email}</strong></li>
          {profile?.carro && <li><span>Carro principal</span><strong>{profile.carro}</strong></li>}
        </ul>
      </section>

      <section className="card" aria-label="Carros vinculados">
        <div className="card-head"><span className="label">Meus carros</span><span className="muted">{cars.length} cadastrados</span></div>
        {cars.length === 0 ? <p className="empty">Nenhum carro vinculado a este usuário.</p> : <ul className="rows">{cars.map((car) => <li key={car.id}><div><strong>{car.nome}</strong><span>{[car.marca, car.modelo].filter(Boolean).join(" ") || "Modelo não informado"}</span></div><code>{car.placa || "Placa não informada"}</code></li>)}</ul>}
      </section>
    </>
  );
}