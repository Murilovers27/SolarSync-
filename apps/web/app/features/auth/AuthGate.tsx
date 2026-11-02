"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Login from "../../login/Login";
import DashboardPage from "../dashboard/DashboardPage";
import { getSupabaseClient } from "../../lib/supabase";

export default function AuthGate() {
  const [user, setUser] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let ativo = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (ativo) {
        setUser(data.session?.user ?? null);
        setCarregando(false);
      }
    });

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