"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "../../lib/supabase";

export type GarageProfile = {
  id: string;
  nome: string;
  email: string;
  carro: string | null;
  carga_total_w?: number;
};

export type GarageCar = {
  id: string;
  nome: string;
  marca: string | null;
  modelo: string | null;
  placa: string | null;
};

export function useGarageData() {
  const [profile, setProfile] = useState<GarageProfile | null>(null);
  const [cars, setCars] = useState<GarageCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregarGaragem(user: User) {
      const supabase = getSupabaseClient();
      const { data: profileData, error: profileError } = await supabase
        .from("usuario")
        .select("id, nome, email, carro")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      const profile = (profileData as GarageProfile | null) ?? {
        id: user.id,
        nome: typeof user.user_metadata?.nome === "string" && user.user_metadata.nome.trim()
          ? user.user_metadata.nome
          : user.email?.split("@")[0] ?? "Usuário",
        email: user.email ?? "",
        carro: null,
        carga_total_w: 400,
      };

      let carData: GarageCar[] = [];
      if (profileData) {
        const { data, error: carsError } = await supabase
          .from("carros")
          .select("id, nome, marca, modelo, placa")
          .eq("usuario_id", profileData.id)
          .order("created_at", { ascending: true });

        if (carsError) throw carsError;
        carData = (data ?? []) as GarageCar[];
      }
      if (!ativo) return;

      setProfile(profile);
      setCars(carData);
      setLoading(false);
    }

    void getSupabaseClient().auth.getUser().then(({ data, error: userError }) => {
      if (userError || !data.user) {
        if (ativo) {
          setError("Não foi possível identificar o usuário.");
          setLoading(false);
        }
        return;
      }

      void carregarGaragem(data.user).catch((loadError: unknown) => {
        if (ativo) {
          setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a garagem.");
          setLoading(false);
        }
      });
    });

    const handleCarAdded = (event: Event) => {
      const car = (event as CustomEvent<GarageCar>).detail;
      if (car) setCars((current) => [...current, car]);
    };
    const handleCarDeleted = (event: Event) => {
      const carId = (event as CustomEvent<string>).detail;
      setCars((current) => current.filter((car) => car.id !== carId));
    };
    window.addEventListener("solarsync:carro-adicionado", handleCarAdded);
    window.addEventListener("solarsync:carro-excluido", handleCarDeleted);

    return () => {
      ativo = false;
      window.removeEventListener("solarsync:carro-adicionado", handleCarAdded);
      window.removeEventListener("solarsync:carro-excluido", handleCarDeleted);
    };
  }, []);

  return { profile, cars, loading, error };
}