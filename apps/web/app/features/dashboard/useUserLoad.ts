"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase";

const DEFAULT_LOAD_W = 400;

export function useUserLoad() {
  const [loadW, setLoadW] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregarCarga() {
      const supabase = getSupabaseClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Não foi possível identificar o usuário.");

      const { data, error: profileError } = await supabase
        .from("usuario")
        .select("carga_total_w")
        .eq("auth_user_id", userData.user.id)
        .maybeSingle();
      if (profileError) {
        if (profileError.code === "42703" || profileError.message.includes("carga_total_w")) {
          if (ativo) setLoadW(DEFAULT_LOAD_W);
          return;
        }
        throw profileError;
      }

      if (ativo) setLoadW(Number(data?.carga_total_w ?? DEFAULT_LOAD_W));
    }

    void carregarCarga().catch((loadError: unknown) => {
      if (ativo) {
        setLoadW(DEFAULT_LOAD_W);
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a carga.");
      }
    });

    return () => {
      ativo = false;
    };
  }, []);

  async function saveLoad(value: number) {
    setSaving(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Não foi possível identificar o usuário.");

      const { error: updateError } = await supabase
        .from("usuario")
        .update({ carga_total_w: value }, { count: "exact" })
        .eq("auth_user_id", userData.user.id);
      if (updateError) throw updateError;

      setLoadW(value);
      window.dispatchEvent(new CustomEvent("solarsync:carga-atualizada", { detail: value }));
    } catch (saveError: unknown) {
      if (saveError && typeof saveError === "object" && "message" in saveError) {
        const details = saveError as { message?: string; code?: string; details?: string; hint?: string };
        setError([details.message, details.code, details.details, details.hint].filter(Boolean).join(" · "));
      } else {
        setError("Não foi possível salvar a carga.");
      }
      throw saveError;
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const handleLoadUpdate = (event: Event) => {
      const value = (event as CustomEvent<number>).detail;
      if (Number.isFinite(value)) setLoadW(value);
    };
    window.addEventListener("solarsync:carga-atualizada", handleLoadUpdate);
    return () => window.removeEventListener("solarsync:carga-atualizada", handleLoadUpdate);
  }, []);

  return { loadW, saving, error, saveLoad };
}
