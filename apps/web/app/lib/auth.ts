import { getSupabaseClient } from "./supabase";

export type ModoAutenticacao = "entrar" | "criar";

type DadosAutenticacao = {
  modo: ModoAutenticacao;
  nome: string;
  email: string;
  senha: string;
};

export async function autenticar({ modo, nome, email, senha }: DadosAutenticacao) {
  const supabase = getSupabaseClient();

  if (modo === "criar") {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome },
      },
    });

    if (error) throw error;
    if (!data.session) {
      throw new Error("A conta foi criada. Confirme o e-mail antes de entrar.");
    }

    return data;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
  return data;
}

export async function encerrarSessao() {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
}