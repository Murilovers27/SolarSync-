"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Login from "../../login/Login";
import DashboardPage from "../dashboard/components/DashboardPage";
import { getSupabaseClient } from "../../lib/supabase";

const DURACAO_SESSAO_MS = 24 * 60 * 60 * 1000;
const CHAVE_INICIO_SESSAO = "solarsync-session-started-at";

export default function AuthGate() {
  const [user, setUser] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let ativo = true;

    async function carregarSessao() {
      const { data } = await supabase.auth.getSession();
      const sessaoExpirada = data.session && sessaoExpiradaNoNavegador();

      if (sessaoExpirada) {
        window.localStorage.removeItem(CHAVE_INICIO_SESSAO);
        await supabase.auth.signOut();
      } else if (data.session && !window.localStorage.getItem(CHAVE_INICIO_SESSAO)) {
        registrarInicioSessao();
      }

      if (ativo) {
        setUser(sessaoExpirada ? null : data.session?.user ?? null);
        setCarregando(false);
      }
    }

    void carregarSessao();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        registrarInicioSessao();
      }
      if (event === "SIGNED_OUT") {
        window.localStorage.removeItem(CHAVE_INICIO_SESSAO);
      }
      setUser(session?.user ?? null);
      setCarregando(false);
    });

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };

    function registrarInicioSessao() {
      window.localStorage.setItem(CHAVE_INICIO_SESSAO, String(Date.now()));
    }

    function sessaoExpiradaNoNavegador() {
      const inicio = Number(window.localStorage.getItem(CHAVE_INICIO_SESSAO));
      return !Number.isFinite(inicio) || Date.now() - inicio >= DURACAO_SESSAO_MS;
    }
  }, []);

  if (carregando) return <main className="auth-loading" aria-label="Carregando" />;
  if (!user) return <Login />;
  return <DashboardPage />;
}