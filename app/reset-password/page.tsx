"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center p-12 bg-bg">
        <div className="max-w-md w-full text-center fade-up">
          <div className="kicker mb-6">Email enviado</div>
          <h1
            style={{
              fontWeight: 300,
              fontSize: "36pt",
              lineHeight: 1,
              letterSpacing: "-1.2px",
              marginBottom: "1in",
            }}
          >
            Revisa tu bandeja<span style={{ color: "var(--accent)" }}>.</span>
          </h1>
          <p className="text-ink-soft mb-8" style={{ fontSize: "11.5pt", lineHeight: 1.5 }}>
            Si <strong>{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña.
          </p>
          <Link href="/login" className="btn-ghost">Volver al login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-12 bg-bg">
      <div className="max-w-sm w-full fade-up">
        <div className="kicker mb-10">Recuperación</div>

        <h1
          style={{
            fontWeight: 300,
            fontSize: "40pt",
            lineHeight: 0.95,
            letterSpacing: "-1.4px",
            marginBottom: "0.4in",
          }}
        >
          Restablecer<br />contraseña<span style={{ color: "var(--accent)" }}>.</span>
        </h1>

        <form onSubmit={handleReset} className="space-y-8">
          <div>
            <label className="label-mini">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              className="input-field"
            />
          </div>

          {error && (
            <div className="text-sm" style={{ color: "var(--accent)" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>

        <div className="mt-10 text-xs text-center">
          <Link
            href="/login"
            className="text-ink-mute hover:text-ink"
            style={{ letterSpacing: "1px", textTransform: "uppercase" }}
          >
            Volver al login
          </Link>
        </div>
      </div>
    </main>
  );
}
