"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-12 bg-bg">
      <div className="max-w-sm w-full fade-up">
        <div className="kicker mb-10">Nueva contraseña</div>
        <h1
          style={{
            fontWeight: 300,
            fontSize: "40pt",
            lineHeight: 0.95,
            letterSpacing: "-1.4px",
            marginBottom: "0.4in",
          }}
        >
          Define tu nueva<br />contraseña<span style={{ color: "var(--accent)" }}>.</span>
        </h1>

        <form onSubmit={handleUpdate} className="space-y-8">
          <div>
            <label className="label-mini">Contraseña</label>
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
          {error && <div className="text-sm" style={{ color: "var(--accent)" }}>{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Guardando…" : "Guardar"}
          </button>
        </form>
      </div>
    </main>
  );
}
