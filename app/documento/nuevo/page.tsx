"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function NuevoDocumentoPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("Por favor sube un archivo .docx (Word)");
      return;
    }

    setAnalyzing(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error analizando el documento");
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const docModel = data.doc;
      const { data: row, error: insertErr } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          title: docModel.meta?.title || file.name.replace(/\.docx$/i, ""),
          doc_type: docModel.doc_type || "proposal",
          orientation: docModel.orientation || "landscape",
          data: docModel,
        })
        .select()
        .single();

      if (insertErr) throw new Error(insertErr.message);

      router.push(`/documento/${row.id}`);
    } catch (err: any) {
      setError(err.message);
      setAnalyzing(false);
    }
  }

  return (
    <div className="px-12 py-12 max-w-5xl">
      <div className="mb-12 fade-up">
        <div className="kicker mb-4">Nuevo documento</div>
        <h1 style={{ fontWeight: 300, fontSize: "56pt", lineHeight: 0.95, letterSpacing: "-2px" }}>
          Sube tu Word
          <span style={{ color: "var(--accent)", fontWeight: 500 }}>.</span>
        </h1>
        <p
          className="mt-6 max-w-2xl"
          style={{ fontSize: "13pt", lineHeight: 1.45, color: "var(--ink-soft)" }}
        >
          Arrastra un archivo .docx con tu propuesta o informe. El maquetador lo analizará y lo convertirá en un documento con la identidad de La Agencia.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (analyzing) return;
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        onClick={() => !analyzing && inputRef.current?.click()}
        className="border-2 border-dashed border-ink fade-up cursor-pointer"
        style={{
          animationDelay: "0.1s",
          padding: "5rem 3rem",
          background: dragging ? "rgba(217,88,43,0.04)" : "transparent",
          borderColor: dragging ? "var(--accent)" : "var(--ink)",
          transition: "background 0.15s, border-color 0.15s",
          opacity: analyzing ? 0.6 : 1,
          pointerEvents: analyzing ? "none" : "auto",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        <div className="text-center">
          {analyzing ? (
            <>
              <div className="kicker mb-6" style={{ color: "var(--accent)" }}>
                Analizando con IA
              </div>
              <div
                style={{
                  fontWeight: 300,
                  fontSize: "40pt",
                  lineHeight: 0.95,
                  letterSpacing: "-1.4px",
                  marginBottom: "1rem",
                }}
              >
                Detectando estructura…
              </div>
              <p style={{ fontSize: "11pt", color: "var(--ink-mute)", lineHeight: 1.5 }}>
                Esto suele tardar entre 10 y 30 segundos según el tamaño del documento.
              </p>
            </>
          ) : (
            <>
              <div className="kicker mb-6">Drop · Arrastra o haz clic</div>
              <div
                style={{
                  fontWeight: 300,
                  fontSize: "44pt",
                  lineHeight: 0.95,
                  letterSpacing: "-1.6px",
                  marginBottom: "1rem",
                }}
              >
                Archivo .docx
              </div>
              <p style={{ fontSize: "11pt", color: "var(--ink-mute)", lineHeight: 1.5 }}>
                Cualquier propuesta o informe en Word. <br />
                El maquetador detectará secciones, presupuesto, objetivos, etc.
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div
          className="mt-6 p-4 border-l-2"
          style={{ borderColor: "var(--accent)", background: "rgba(217,88,43,0.04)" }}
        >
          <div className="kicker mb-2" style={{ color: "var(--accent)", fontSize: "8.5pt" }}>
            Error
          </div>
          <div style={{ fontSize: "11pt" }}>{error}</div>
        </div>
      )}

      <div className="mt-16 fade-up" style={{ animationDelay: "0.2s" }}>
        <div className="kicker mb-4" style={{ fontSize: "9pt" }}>Qué detecta</div>
        <div className="grid grid-cols-3 gap-6 text-sm" style={{ color: "var(--ink-soft)" }}>
          <div>
            <div style={{ fontWeight: 500, color: "var(--ink)", marginBottom: "0.4rem" }}>
              Estructura
            </div>
            Portada, introducción, objetivos, grupos de interés, planteamiento, bloques de servicio, presupuesto.
          </div>
          <div>
            <div style={{ fontWeight: 500, color: "var(--ink)", marginBottom: "0.4rem" }}>
              Presupuesto
            </div>
            Tablas con conceptos, cantidades e importes. Identifica secciones, subtotales y total.
          </div>
          <div>
            <div style={{ fontWeight: 500, color: "var(--ink)", marginBottom: "0.4rem" }}>
              Metadatos
            </div>
            Título, cliente, fecha y ubicación. Se rellenan automáticamente la portada y la contraportada.
          </div>
        </div>
      </div>
    </div>
  );
}
