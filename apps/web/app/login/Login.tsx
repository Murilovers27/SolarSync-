"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Bebas_Neue, Space_Mono } from "next/font/google";
import { autenticar, type ModoAutenticacao } from "../lib/auth";
import styles from "./Login.module.css";

const fonteTitulo = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-titulo",
});

const fonteTexto = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-texto",
});

function IconeSol() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
      <path d="m4.93 4.93 1.41 1.41M17.66 17.66l1.41 1.41M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function IconeRaio() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

type LoginProps = {
  destino?: string;
};

export default function Login({ destino = "/" }: LoginProps) {
  const router = useRouter();
  const [modo, setModo] = useState<ModoAutenticacao>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const criando = modo === "criar";

  function alternarModo() {
    setModo(criando ? "entrar" : "criar");
    setErro("");
    setMensagem("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    if (criando && !nome.trim()) {
      setErro("Informe seu nome.");
      return;
    }
    if (!email.trim() || !senha) {
      setErro("Preencha o e-mail e a senha.");
      return;
    }
    if (criando && senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setCarregando(true);
    try {
      const resultado = await autenticar({ modo, nome: nome.trim(), email: email.trim(), senha });
      if (modo === "criar" && !resultado.session) {
        setMensagem("Conta criada. Confirme o e-mail recebido para liberar o acesso.");
        setCarregando(false);
        return;
      }
      router.push(destino);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível acessar. Tente novamente.");
      setCarregando(false);
    }
  }

  return (
    <main className={`${styles.login} ${fonteTitulo.variable} ${fonteTexto.variable}`}>
      <section className={styles.painel}>
        <div className={styles.marca}>
          <span className={styles.logo}><IconeSol /></span>
          <span className={styles.marcaNome}>SOLARSYNC</span>
        </div>

        <header className={styles.cabecalho}>
          <p className={styles.eyebrow}>ACESSO AO SISTEMA</p>
          <h1 className={styles.titulo}>{criando ? "CRIAR ACESSO" : "ENTRAR"}</h1>
        </header>

        <form onSubmit={handleSubmit}>
          {criando && (
            <div className={styles.campo}>
              <label htmlFor="login-nome">NOME</label>
              <input
                id="login-nome"
                type="text"
                autoComplete="name"
                placeholder="Seu nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
              />
            </div>
          )}

          <div className={styles.campo}>
            <label htmlFor="login-email">E-MAIL</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className={styles.campo}>
            <label htmlFor="login-senha">SENHA</label>
            <input
              id="login-senha"
              type="password"
              autoComplete={criando ? "new-password" : "current-password"}
              placeholder="••••••••"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
            />
          </div>

          <button className={styles.botao} type="submit" disabled={carregando}>
            <IconeRaio />
            {carregando ? "AGUARDE..." : criando ? "CRIAR ACESSO" : "ACESSAR PAINEL"}
          </button>

          <p className={styles.erro} role="alert" aria-live="polite">{erro}</p>
          <p className={styles.sucesso} role="status" aria-live="polite">{mensagem}</p>
        </form>

        <p className={styles.rodape}>
          {criando ? "Já tem conta? " : "Ainda não tem conta? "}
          <button type="button" className={styles.link} onClick={alternarModo}>
            {criando ? "Entrar" : "Criar acesso"}
          </button>
        </p>
      </section>
    </main>
  );
}