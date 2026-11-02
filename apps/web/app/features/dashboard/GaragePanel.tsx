"use client";

import { useGarageData } from "./useGarageData";
import { useUserLoad } from "./useUserLoad";
import { useState } from "react";
import { getSupabaseClient } from "../../lib/supabase";

function formatSupabaseError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const details = error as { message?: string; code?: string; details?: string; hint?: string };
    return [details.message, details.code, details.details, details.hint].filter(Boolean).join(" · ");
  }
  return fallback;
}

export default function GaragePanel() {
  const { profile, cars, loading, error } = useGarageData();
  const { loadW, saving, error: loadError, saveLoad } = useUserLoad();
  const [loadInput, setLoadInput] = useState("");
  const [carFormOpen, setCarFormOpen] = useState(false);
  const [carName, setCarName] = useState("");
  const [carBrand, setCarBrand] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carPlate, setCarPlate] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingCar, setSavingCar] = useState(false);

  if (loading) return <section className="card" aria-label="Garagem"><p className="empty">Carregando garagem...</p></section>;
  if (error) return <section className="card" aria-label="Garagem"><p className="error-message" role="alert">{error}</p></section>;

  async function handleSaveLoad() {
    const value = Number(loadInput);
    if (!Number.isInteger(value) || value <= 0) {
      setActionError("Informe uma carga inteira maior que zero.");
      return;
    }
    try {
      await saveLoad(value);
      setLoadInput("");
      setActionError(null);
    } catch {
      // O hook já expõe o erro do servidor.
    }
  }

  async function handleAddCar() {
    if (!profile || !carName.trim()) {
      setActionError("Informe um nome para o veículo.");
      return;
    }
    setSavingCar(true);
    setActionError(null);
    try {
      const { data, error: insertError } = await getSupabaseClient()
        .from("carros")
        .insert({
          usuario_id: profile.id,
          nome: carName.trim(),
          marca: carBrand.trim() || null,
          modelo: carModel.trim() || null,
          placa: carPlate.trim() || null,
        })
        .select("id, nome, marca, modelo, placa")
        .single();
      if (insertError) throw insertError;
      window.dispatchEvent(new CustomEvent("solarsync:carro-adicionado", { detail: data }));
      setCarName("");
      setCarBrand("");
      setCarModel("");
      setCarPlate("");
      setCarFormOpen(false);
    } catch (addError: unknown) {
      setActionError(formatSupabaseError(addError, "Não foi possível adicionar o veículo."));
    } finally {
      setSavingCar(false);
    }
  }

  async function handleDeleteCar(id: string) {
    if (!window.confirm("Excluir este veículo da sua conta?")) return;
    setActionError(null);
    const { error: deleteError } = await getSupabaseClient().from("carros").delete().eq("id", id);
    if (deleteError) setActionError(formatSupabaseError(deleteError, "Não foi possível excluir o veículo."));
    else window.dispatchEvent(new CustomEvent("solarsync:carro-excluido", { detail: id }));
  }

  return (
    <>
      <section className="card" aria-label="Dados do usuário">
        <div className="card-head">
          <span className="label">Meu perfil</span>
          <span className="muted">Conta ativa</span>
        </div>
        <ul className="profile-data">
          <li><span>Nome</span><strong>{profile?.nome}</strong></li>
          <li><span>E-mail</span><strong>{profile?.email}</strong></li>
          {profile?.carro && <li><span>Carro principal</span><strong>{profile.carro}</strong></li>}
        </ul>
      </section>

      <section className="card" aria-label="Carga residencial">
        <div className="card-head">
          <span className="label">Carga total</span>
          <span className="muted">Watts</span>
        </div>
        <p className="hint">Valor usado no cálculo de consumo do painel. Atual: {loadW ?? profile?.carga_total_w ?? 400} W</p>
        <div className="garage-form">
          <input 
            type="number" 
            min="1" 
            step="1" 
            placeholder="Ex.: 400" 
            aria-label="Nova carga residencial em Watts"
            value={loadInput} 
            onChange={(event) => setLoadInput(event.target.value)} 
          />
          <button className="garage-button" type="button" onClick={() => void handleSaveLoad()} disabled={saving}>
            Salvar carga
          </button>
        </div>
        {loadError && <p className="error-message" role="alert">{loadError}</p>}
      </section>

      <section className="card" aria-label="Carros vinculados">
        <div className="card-head">
          <span className="label">Meus carros</span>
          <div className="card-actions">
            <span className="muted">{cars.length} cadastrados</span>
            <button className="garage-button" type="button" onClick={() => setCarFormOpen((open) => !open)}>
              {carFormOpen ? "Fechar" : "Adicionar"}
            </button>
          </div>
        </div>

        {carFormOpen && (
          <div className="garage-form">
            <input 
              placeholder="Nome" 
              aria-label="Nome do veículo"
              value={carName} 
              onChange={(event) => setCarName(event.target.value)} 
            />
            <input 
              placeholder="Marca" 
              aria-label="Marca do veículo"
              value={carBrand} 
              onChange={(event) => setCarBrand(event.target.value)} 
            />
            <input 
              placeholder="Modelo" 
              aria-label="Modelo do veículo"
              value={carModel} 
              onChange={(event) => setCarModel(event.target.value)} 
            />
            <input 
              placeholder="Placa" 
              aria-label="Placa do veículo"
              value={carPlate} 
              onChange={(event) => setCarPlate(event.target.value)} 
            />
            <button className="garage-button" type="button" onClick={() => void handleAddCar()} disabled={savingCar}>
              Salvar veículo
            </button>
          </div>
        )}

        {actionError && <p className="error-message" role="alert">{actionError}</p>}

        {cars.length === 0 ? (
          <p className="empty">Nenhum carro vinculado a este usuário.</p>
        ) : (
          <ul className="rows">
            {cars.map((car) => (
              <li key={car.id}>
                <div>
                  <strong>{car.nome}</strong>
                  <span>{[car.marca, car.modelo].filter(Boolean).join(" ") || "Modelo não informado"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "space-between" }}>
                  <code>{car.placa || "Placa não informada"}</code>
                  <button className="delete-button" type="button" onClick={() => void handleDeleteCar(car.id)}>
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}