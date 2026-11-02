"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "../../lib/supabase";

export type GarageProfile = {
  id: string;
  nome: string;
  email: string;
  carro: string | null;
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
      if (!profileData) throw new Error("Perfil do usuário ainda não está disponível.");

      const { data: carData, error: carsError } = await supabase
        .from("carros")
        .select("id, nome, marca, modelo, placa")
        .eq("usuario_id", profileData.id)
        .order("created_at", { ascending: true });

      if (carsError) throw carsError;
      if (!ativo) return;

      setProfile(profileData as GarageProfile);
      setCars((carData ?? []) as GarageCar[]);
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

    return () => {
      ativo = false;
    };
  }, []);

  return { profile, cars, loading, error };
}