"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex">
      {/* Lado izquierdo: identidad */}
      <section className="hidden md:flex w-1/2 bg-bg flex-col justify-between p-12">
        <div className="flex items-center gap-4">
          <img src="/logos/laagencia-logo.png" alt="LaAgencia" className="h-10" />
        </div>

        <div>
          <div className="kicker mb-8" style={{ color: "var(--ink)" }}>
            Maquetador editorial
          </div>
          <div
            style={{
              fontWeight: 300,
              fontSize: "84pt",
              lineHeight: 0.92,
              letterSpacing: "-3.5px",
            }}
          >
            La Agencia<br />
            x Navarra<br />
            Capital<span style={{ color: "var(--accent)", fontWeight: 500 }}>.</span>
          </div>
        </div>

        <div className="text-xs uppercase tracking-widest text-ink-mute">
          Pamplona · Navarra
        </div>
      </section>

      {/* Lado derecho: formulario */}
      <section className="w-full md:w-1/2 flex flex-col justify-center p-12 bg-bg">
        <div className="max-w-sm w-full mx-auto fade-up">
          <div className="kicker mb-10">Acceso</div>

          <h1
            style={{
              fontWeight: 300,
              fontSize: "40pt",
              lineHeight: 0.95,
              letterSpacing: "-1.4px",
              marginBottom: "0.4in",
            }}
          >
            Entra en tu<br />maquetador<span style={{ color: "var(--accent)" }}>.</span>
          </h1>

          <form onSubmit={handleLogin} className="space-y-8">
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
              <label className="label-mini">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
              {loading ? "Entrando…" : "Iniciar sesión"}
            </button>
          </form>

          <div className="mt-10 flex justify-between text-xs">
            <Link
              href="/reset-password"
              className="text-ink-mute hover:text-ink"
              style={{ letterSpacing: "1px", textTransform: "uppercase" }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
            <Link
              href="/register"
              className="text-ink-mute hover:text-ink"
              style={{ letterSpacing: "1px", textTransform: "uppercase" }}
            >
              Registrarse
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
