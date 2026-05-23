"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase ist noch nicht konfiguriert.");
      return;
    }

    setIsLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setIsLoading(false);

    if (loginError) {
      setError("Login fehlgeschlagen. Bitte E-Mail und Passwort prüfen.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="login-card">
      <div className="login-header">
        <div className="login-icon">
          <LockKeyhole size={20} />
        </div>
        <div>
          <p className="section-kicker">Secure access</p>
          <h2>Anmelden</h2>
        </div>
      </div>

      <form className="login-form" onSubmit={handleLogin}>
        <label>
          <span>E-Mail</span>
          <div className="input-frame">
            <Mail size={16} />
            <input
              type="email"
              placeholder="name@xcellerate.ch"
              aria-label="E-Mail"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
        </label>

        <label>
          <span>Passwort</span>
          <div className="input-frame">
            <KeyRound size={16} />
            <input
              type="password"
              placeholder="Passwort"
              aria-label="Passwort"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="spin" size={16} />
              Anmeldung läuft
            </>
          ) : (
            <>
              Einloggen
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="self-service">
        <button type="button">Passwort vergessen</button>
        <button type="button">Zugang anfragen</button>
      </div>

      <div className="security-note">
        <ShieldCheck size={16} />
        <span>Supabase Auth ist für den Demo-Login angebunden.</span>
      </div>
    </div>
  );
}
