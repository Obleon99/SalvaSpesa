"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "./modal";
import { useUserState } from "@/lib/user-state";

const inputClass =
  "bg-surface-container-low px-space-sm py-2 rounded-xl font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "font-label-caps text-label-caps text-on-surface-variant uppercase";

export function AuthDialog() {
  const { signIn, closeDialog } = useUserState();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleHint, setGoogleHint] = useState(false);

  useEffect(() => {
    fetch("/api/auth/google/status")
      .then((response) => response.json() as Promise<{ enabled: boolean }>)
      .then((data) => setGoogleEnabled(data.enabled))
      .catch(() => undefined);
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await signIn(mode, email, password, name.trim());
    setBusy(false);
    if (result.ok) closeDialog();
    else setError(result.error);
  }

  const register = mode === "register";

  return (
    <Modal title={register ? "Crea il tuo account" : "Accedi"} onClose={closeDialog}>
      <form onSubmit={onSubmit} className="flex flex-col gap-space-md">
        {(
          <>
            <a
              href={googleEnabled ? "/api/auth/google" : undefined}
              onClick={googleEnabled ? undefined : (event) => { event.preventDefault(); setGoogleHint(true); }}
              role={googleEnabled ? undefined : "button"}
              className="flex items-center justify-center gap-space-xs px-space-md py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container font-body-sm text-body-sm font-semibold text-on-surface transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
                <path fill="#FBBC05" d="M10.5 28.6A14.500 14.500 0 0 1 9.500 24c0-1.600.3-3.200.9-4.600l-7.900-6.200A24 24 0 0 0 0 24c0 3.900.9 7.500 2.600 10.800l7.900-6.200z" />
                <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.600-5.900c-2.100 1.400-4.900 2.300-8.300 2.300-6.300 0-11.600-4.200-13.500-9.900l-7.900 6.200C6.500 42.600 14.600 48 24 48z" />
              </svg>
              Continua con Google
            </a>
            {googleHint ? (
              <p role="alert" className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low rounded-xl px-space-sm py-space-xs">
                Accesso con Google non ancora configurato: servono GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET in apps/web/.env.local (vedi .env.example), poi riavvia il servizio.
              </p>
            ) : null}
            <div className="flex items-center gap-space-xs text-outline font-label-unit text-label-unit">
              <span className="h-px flex-1 bg-outline-variant/50" /> oppure con email <span className="h-px flex-1 bg-outline-variant/50" />
            </div>
          </>
        )}

        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {register
            ? "Con un account posizione, preferiti, carrello e profilo ti seguono su qualsiasi dispositivo."
            : "Accedi per ritrovare posizione, preferiti, carrello e profilo."}
        </p>

        {register ? (
          <div className="flex flex-col gap-space-xs">
            <label htmlFor="auth-name" className={labelClass}>
              Nome
            </label>
            <input id="auth-name" value={name} maxLength={40} autoComplete="name" onChange={(e) => setName(e.target.value)} placeholder="Come ti chiami?" className={inputClass} />
          </div>
        ) : null}

        <div className="flex flex-col gap-space-xs">
          <label htmlFor="auth-email" className={labelClass}>
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@esempio.it"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-space-xs">
          <label htmlFor="auth-password" className={labelClass}>
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            required
            minLength={8}
            value={password}
            autoComplete={register ? "new-password" : "current-password"}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={register ? "Almeno 8 caratteri" : "La tua password"}
            className={inputClass}
          />
        </div>

        {error ? (
          <p role="alert" className="font-body-sm text-body-sm text-error">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="px-space-md py-2.5 rounded-xl bg-primary hover:bg-primary-container disabled:opacity-60 text-on-primary font-body-sm text-body-sm font-semibold transition-colors shadow-sm"
        >
          {busy ? "Un attimo…" : register ? "Registrati" : "Accedi"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(register ? "login" : "register");
            setError(null);
          }}
          className="font-body-sm text-body-sm text-primary font-semibold hover:underline"
        >
          {register ? "Hai già un account? Accedi" : "Non hai un account? Registrati"}
        </button>
      </form>
    </Modal>
  );
}
