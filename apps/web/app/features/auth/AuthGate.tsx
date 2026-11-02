"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Login from "../../login/Login";
import DashboardPage from "../dashboard/components/DashboardPage";
import { getSupabaseClient } from "../../lib/supabase";

export default function AuthGate() {
  const [user, setUser] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let ativo = true;

    async function carregarSessao() {
      const callbackDeAutenticacao =
        window.location.hash.includes("access_token") || window.location.search.includes("code=");

      if (process.env.NEXT_PUBLIC_REQUIRE_LOGIN_ON_START === "true" && !callbackDeAutenticacao) {
        await supabase.auth.signOut();
      }

      const { data } = await supabase.auth.getSession();
      if (ativo) {
        setUser(data.session?.user ?? null);
        setCarregando(false);
      }
    }

    void carregarSessao();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setCarregando(false);
    });

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (carregando) return <main className="auth-loading" aria-label="Carregando" />;
  if (!user) return <Login />;
  return <DashboardPage />;
}