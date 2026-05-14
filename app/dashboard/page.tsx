import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const fullName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "";

  const { data: documents } = await supabase
    .from("documents")
    .select("id, title, doc_type, orientation, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="px-12 py-12 max-w-6xl">
      {/* Header */}
      <div className="mb-16 fade-up">
        <div className="kicker mb-4">Mis documentos</div>
        <h1
          style={{
            fontWeight: 300,
            fontSize: "56pt",
            lineHeight: 0.95,
            letterSpacing: "-2px",
          }}
        >
          Hola, {fullName}
          <span style={{ color: "var(--accent)", fontWeight: 500 }}>.</span>
        </h1>
        <p
          className="mt-6 max-w-2xl"
          style={{ fontSize: "13pt", lineHeight: 1.45, color: "var(--ink-soft)" }}
        >
          Crea propuestas comerciales, informes o clipping con la identidad de
          La Agencia x Navarra Capital.
        </p>
      </div>

      {/* CTA Nuevo documento */}
      <Link
        href="/documento/nuevo"
        className="block fade-up mb-12 group"
        style={{ animationDelay: "0.1s" }}
      >
        <div
          className="border border-ink p-8 transition-all"
          style={{ background: "transparent" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="kicker mb-3" style={{ color: "var(--accent)" }}>
                + Nuevo
              </div>
              <h2
                style={{
                  fontWeight: 300,
                  fontSize: "32pt",
                  lineHeight: 0.95,
                  letterSpacing: "-1px",
                }}
              >
                Maquetar un nuevo documento
              </h2>
            </div>
            <div
              style={{
                fontWeight: 300,
                fontSize: "32pt",
                color: "var(--accent)",
              }}
            >
              →
            </div>
          </div>
        </div>
      </Link>

      {/* Listado */}
      <div className="fade-up" style={{ animationDelay: "0.2s" }}>
        <div
          className="flex justify-between items-baseline pb-3 border-b border-ink"
          style={{ marginBottom: "1rem" }}
        >
          <div className="kicker">Documentos recientes</div>
          <div
            style={{
              fontSize: "9pt",
              color: "var(--ink-mute)",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {documents?.length || 0} total
          </div>
        </div>

        {(!documents || documents.length === 0) && (
          <div
            className="py-16 text-center"
            style={{ color: "var(--ink-mute)", fontSize: "11pt" }}
          >
            Aún no has creado ningún documento.
          </div>
        )}

        <div className="divide-y divide-rule">
          {documents?.map((d) => (
            <Link
              key={d.id}
              href={`/documento/${d.id}`}
              className="flex justify-between items-center py-5 group hover:px-2 transition-all"
            >
              <div>
                <div
                  className="text-base mb-1 group-hover:text-accent transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  {d.title}
                </div>
                <div
                  style={{
                    fontSize: "9pt",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    color: "var(--ink-mute)",
                  }}
                >
                  {d.doc_type === "proposal" ? "Propuesta comercial" : "Informe"} ·{" "}
                  {d.orientation === "landscape" ? "Apaisado 16:9" : "Vertical A4"}
                </div>
              </div>
              <div
                style={{
                  fontSize: "9pt",
                  color: "var(--ink-mute)",
                }}
              >
                {new Date(d.updated_at).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
