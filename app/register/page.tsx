"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-12 bg-bg">
        <div className="max-w-md w-full text-center fade-up">
          <div className="kicker mb-6">Cuenta creada</div>
          <h1
            style={{
              fontWeight: 300,
              fontSize: "36pt",
              lineHeight: 1,
              letterSpacing: "-1.2px",
              marginBottom: "1in",
            }}
          >
            Revisa tu correo<span style={{ color: "var(--accent)" }}>.</span>
          </h1>
          <p className="text-ink-soft mb-8" style={{ fontSize: "11.5pt", lineHeight: 1.5 }}>
            Te hemos enviado un email a <strong>{email}</strong> para confirmar tu cuenta.
          </p>
          <Link href="/login" className="btn-ghost">Volver al login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-12 bg-bg">
      <div className="max-w-sm w-full fade-up">
        <div className="kicker mb-10">Registro</div>

        <h1
          style={{
            fontWeight: 300,
            fontSize: "40pt",
            lineHeight: 0.95,
            letterSpacing: "-1.4px",
            marginBottom: "0.4in",
          }}
        >
          Crea tu<br />cuenta<span style={{ color: "var(--accent)" }}>.</span>
        </h1>

        <form onSubmit={handleRegister} className="space-y-8">
          <div>
            <label className="label-mini">Nombre completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Tu nombre"
              className="input-field"
            />
          </div>
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
          <div>
            <label className="label-mini">Contraseña (mínimo 6 caracteres)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="input-field"
            />
          </div>

          {error && (
            <div className="text-sm" style={{ color: "var(--accent)" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creando…" : "Crear cuenta"}
          </button>
        </form>

        <div className="mt-10 text-xs text-center">
          <Link
            href="/login"
            className="text-ink-mute hover:text-ink"
            style={{ letterSpacing: "1px", textTransform: "uppercase" }}
          >
            ¿Ya tienes cuenta? Inicia sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
