"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type {
  DocumentModel,
  DocSection,
  ExportFormat,
  LogoUpload,
} from "@/types/document";
import DocumentRenderer from "@/components/DocumentRenderer";

// ============================================================
// Editor visual: panel izquierdo con campos editables agrupados
// por sección, panel derecho con preview en vivo a escala.
// ============================================================

export default function Editor({ initialDoc }: { initialDoc: DocumentModel }) {
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentModel>(initialDoc);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  // Auto-guardado con debounce
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(), 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  async function save() {
    if (!doc.id) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("documents").update({
      title: doc.meta.title || "Sin título",
      doc_type: doc.doc_type,
      orientation: doc.orientation,
      data: doc,
      updated_at: new Date().toISOString(),
    }).eq("id", doc.id);
    setSaving(false);
    setSavedAt(new Date());
  }

  async function exportDoc(format: ExportFormat) {
    await save();
    setExporting(format);
    try {
      const res = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc }),
      });
      if (!res.ok) {
        alert("Error exportando: " + res.statusText);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.meta.title || "documento"}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setExporting(null);
    }
  }

  // Mutadores
  function updateMeta(field: keyof DocumentModel["meta"], value: string) {
    setDoc((d) => ({ ...d, meta: { ...d.meta, [field]: value } }));
  }
  function updateSection(idx: number, patch: any) {
    setDoc((d) => ({
      ...d,
      sections: d.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  }
  function removeSection(idx: number) {
    setDoc((d) => ({ ...d, sections: d.sections.filter((_, i) => i !== idx) }));
  }
  function moveSection(idx: number, dir: -1 | 1) {
    setDoc((d) => {
      const next = [...d.sections];
      const ni = idx + dir;
      if (ni < 0 || ni >= next.length) return d;
      [next[idx], next[ni]] = [next[ni], next[idx]];
      return { ...d, sections: next };
    });
  }
  function addLogo(tier: "primary" | "secondary", logo: LogoUpload) {
    setDoc((d) => ({
      ...d,
      [tier === "primary" ? "logos_primary" : "logos_secondary"]: [
        ...(tier === "primary" ? d.logos_primary : d.logos_secondary),
        logo,
      ],
    }));
  }
  function removeLogo(tier: "primary" | "secondary", id: string) {
    setDoc((d) => ({
      ...d,
      [tier === "primary" ? "logos_primary" : "logos_secondary"]: (tier === "primary"
        ? d.logos_primary
        : d.logos_secondary
      ).filter((l) => l.id !== id),
    }));
  }

  return (
    <div className="min-h-screen flex">
      {/* IZQUIERDA: panel de edición */}
      <div className="w-[44%] border-r border-rule flex flex-col bg-bg">
        <div className="px-10 pt-10 pb-4 border-b border-rule sticky top-0 bg-bg z-20">
          <div className="flex justify-between items-baseline mb-2">
            <div className="kicker" style={{ fontSize: "8.5pt", color: "var(--ink-mute)" }}>
              Editor visual
            </div>
            <div className="text-xs" style={{ color: "var(--ink-mute)" }}>
              {saving ? "Guardando…" : savedAt ? `Guardado ${savedAt.toLocaleTimeString("es-ES")}` : ""}
            </div>
          </div>
          <input
            type="text"
            value={doc.meta.title}
            onChange={(e) => updateMeta("title", e.target.value)}
            className="w-full bg-transparent focus:outline-none"
            style={{ fontSize: "22pt", fontWeight: 300, letterSpacing: "-0.6px" }}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-10 py-6 space-y-8">
          {/* Configuración global */}
          <Card title="Configuración" tag="00">
            <Row>
              <Choice
                label="Tipo"
                value={doc.doc_type}
                options={[
                  { value: "proposal", label: "Propuesta" },
                  { value: "report", label: "Informe" },
                ]}
                onChange={(v) => setDoc((d) => ({ ...d, doc_type: v as any }))}
              />
              <Choice
                label="Orientación"
                value={doc.orientation}
                options={[
                  { value: "landscape", label: "Apaisado 16:9" },
                  { value: "portrait", label: "Vertical A4" },
                ]}
                onChange={(v) => setDoc((d) => ({ ...d, orientation: v as any }))}
              />
            </Row>
          </Card>

          {/* Metadatos */}
          <Card title="Portada · metadatos" tag="01">
            <Row>
              <Field label="Subtítulo" value={doc.meta.subtitle || ""} onChange={(v) => updateMeta("subtitle", v)} />
              <Field label="Fecha" value={doc.meta.date || ""} onChange={(v) => updateMeta("date", v)} />
            </Row>
            <Row>
              <Field label="Cliente / destinatario" value={doc.meta.client || ""} onChange={(v) => updateMeta("client", v)} />
              <Field label="Etiqueta del documento" value={doc.meta.documentLabel || ""} onChange={(v) => updateMeta("documentLabel", v)} />
            </Row>
            <Field label="Ubicación" value={doc.meta.location || ""} onChange={(v) => updateMeta("location", v)} />
          </Card>

          {/* Logos */}
          <Card title="Logos del cliente" tag="02">
            <LogosBlock
              tier="primary"
              label="Primer nivel · junto a La Agencia"
              logos={doc.logos_primary}
              onAdd={(l) => addLogo("primary", l)}
              onRemove={(id) => removeLogo("primary", id)}
            />
            <LogosBlock
              tier="secondary"
              label="Subnivel · entidades secundarias"
              logos={doc.logos_secondary}
              onAdd={(l) => addLogo("secondary", l)}
              onRemove={(id) => removeLogo("secondary", id)}
            />
          </Card>

          {/* Secciones */}
          {doc.sections.map((s, i) => (
            <Card
              key={i}
              title={titleForSection(s)}
              tag={String(i + 1).padStart(2, "0")}
              actions={
                <>
                  <button onClick={() => moveSection(i, -1)} className="iconbtn" title="Subir">↑</button>
                  <button onClick={() => moveSection(i, 1)} className="iconbtn" title="Bajar">↓</button>
                  <button onClick={() => removeSection(i)} className="iconbtn" title="Eliminar" style={{ color: "var(--accent)" }}>×</button>
                </>
              }
            >
              <SectionEditor
                section={s}
                onChange={(patch) => updateSection(i, patch)}
              />
            </Card>
          ))}

          {doc.sections.length === 0 && (
            <div className="text-center py-12" style={{ color: "var(--ink-mute)" }}>
              <div className="kicker mb-3" style={{ fontSize: "9pt" }}>Sin secciones</div>
              <p style={{ fontSize: "11pt" }}>El análisis del Word no detectó secciones. Puedes añadirlas manualmente:</p>
              <AddSectionMenu
                onAdd={(s) => setDoc((d) => ({ ...d, sections: [...d.sections, s] }))}
              />
            </div>
          )}

          {doc.sections.length > 0 && (
            <AddSectionMenu
              onAdd={(s) => setDoc((d) => ({ ...d, sections: [...d.sections, s] }))}
            />
          )}
        </div>

        {/* Footer fijo: exportar */}
        <div className="border-t border-rule p-6 bg-bg sticky bottom-0 z-20">
          <div className="kicker mb-3" style={{ fontSize: "8.5pt" }}>Exportar</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => exportDoc("pdf")}
              disabled={!!exporting}
              className="btn-primary"
              style={{ padding: "0.6rem 0.5rem", fontSize: "10pt" }}
            >
              {exporting === "pdf" ? "…" : "PDF"}
            </button>
            <button
              onClick={() => exportDoc("pptx")}
              disabled={!!exporting}
              className="btn-ghost"
              style={{ padding: "0.6rem 0.5rem", fontSize: "10pt" }}
            >
              {exporting === "pptx" ? "…" : "PowerPoint"}
            </button>
            <button
              onClick={() => exportDoc("docx")}
              disabled={!!exporting}
              className="btn-ghost"
              style={{ padding: "0.6rem 0.5rem", fontSize: "10pt" }}
            >
              {exporting === "docx" ? "…" : "Word"}
            </button>
          </div>
        </div>
      </div>

      {/* DERECHA: preview vivo */}
      <div className="flex-1 bg-[#DEDDD9] overflow-y-auto">
        <div className="px-8 py-6 sticky top-0 bg-[#DEDDD9] border-b border-rule z-10 flex justify-between items-center">
          <div>
            <div className="kicker" style={{ fontSize: "8pt", color: "var(--ink-mute)" }}>Preview</div>
            <div style={{ fontSize: "12pt", fontWeight: 500, marginTop: "0.2rem" }}>
              {doc.sections.length + 2} páginas
            </div>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xs uppercase tracking-widest text-ink-mute hover:text-ink"
            style={{ letterSpacing: "1.5px" }}
          >
            ← Dashboard
          </button>
        </div>

        <div className="p-8 flex justify-center">
          <div style={{ transform: "scale(0.55)", transformOrigin: "top center" }}>
            <DocumentRenderer doc={doc} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .iconbtn {
          width: 1.7rem;
          height: 1.7rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--ink-mute);
          font-size: 14pt;
          line-height: 1;
        }
        .iconbtn:hover { color: var(--ink); }
      `}</style>
    </div>
  );
}

// ============================================================
// Bloques de UI
// ============================================================

function Card({
  title,
  tag,
  actions,
  children,
}: {
  title: string;
  tag: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-rule" style={{ background: "rgba(255,255,255,0.4)" }}>
      <div className="flex justify-between items-center px-5 py-3 border-b border-rule">
        <div className="flex items-baseline gap-3">
          <div style={{ fontSize: "10pt", fontWeight: 500, color: "var(--accent)", letterSpacing: "1.5px" }}>
            {tag}
          </div>
          <div className="kicker" style={{ fontSize: "9pt" }}>{title}</div>
        </div>
        <div className="flex items-center gap-1">{actions}</div>
      </div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

function Row({ children }: any) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label, value, onChange, placeholder, mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="label-mini" style={{ fontSize: "8pt" }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field"
        style={{ fontSize: mono ? "10pt" : "11pt", fontFamily: mono ? "monospace" : "Halyard, sans-serif" }}
      />
    </div>
  );
}

function TextArea({
  label, value, onChange, rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="label-mini" style={{ fontSize: "8pt" }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="input-field"
        style={{ fontSize: "10.5pt", resize: "vertical", lineHeight: 1.4 }}
      />
    </div>
  );
}

// TextArea con barra de formato rápido (**negrita**, _cursiva_, [acento])
function RichTextArea({
  label, value, onChange, rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  function wrap(prefix: string, suffix: string = prefix) {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || "texto";
    const next = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    onChange(next);
    // restaurar selección dentro de los marcadores
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <label className="label-mini" style={{ fontSize: "8pt" }}>{label}</label>
        <div className="flex items-center gap-1" style={{ marginBottom: "0.3rem" }}>
          <FmtBtn onClick={() => wrap("**")} title="Negrita: **texto**" label="B" bold />
          <FmtBtn onClick={() => wrap("_")} title="Cursiva: _texto_" label="i" italic />
          <FmtBtn onClick={() => wrap("[", "]")} title="Acento naranja: [texto]" label="A" accent />
        </div>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="input-field"
        style={{ fontSize: "10.5pt", resize: "vertical", lineHeight: 1.4 }}
      />
    </div>
  );
}

function FmtBtn({
  onClick, title, label, bold, italic, accent,
}: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: "1.5rem",
        height: "1.5rem",
        fontSize: "11px",
        border: "1px solid var(--rule)",
        background: "transparent",
        color: accent ? "var(--accent)" : "var(--ink)",
        fontWeight: bold ? 600 : 400,
        fontStyle: italic ? "italic" : "normal",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function LineHeightSlider({
  value, onChange,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const current = value ?? 1.45;
  return (
    <div className="flex items-center gap-3" style={{ paddingTop: "0.4rem" }}>
      <label className="label-mini" style={{ fontSize: "8pt", marginBottom: 0 }}>
        Interlineado · {current.toFixed(2)}
      </label>
      <input
        type="range"
        min={1.1}
        max={2.0}
        step={0.05}
        value={current}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1 }}
      />
      <button
        onClick={() => onChange(undefined)}
        className="text-xs"
        style={{ color: "var(--ink-mute)", letterSpacing: "1px", textTransform: "uppercase" }}
        title="Restablecer al valor por defecto"
      >
        Reset
      </button>
    </div>
  );
}

function Choice<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="label-mini" style={{ fontSize: "8pt" }}>{label}</label>
      <div className="flex gap-2 mt-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="flex-1 py-2 px-2 border text-xs"
            style={{
              borderColor: value === o.value ? "var(--ink)" : "var(--rule)",
              background: value === o.value ? "var(--ink)" : "transparent",
              color: value === o.value ? "var(--bg)" : "var(--ink)",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Editor por tipo de sección
// ============================================================

function SectionEditor({
  section, onChange,
}: {
  section: DocSection;
  onChange: (patch: any) => void;
}) {
  const t = section.type;

  if (t === "intro") {
    const s = section as any;
    return (
      <>
        <Row>
          <Field label="Número" value={s.number} onChange={(v) => onChange({ number: v })} />
          <Field label="Etiqueta" value={s.label} onChange={(v) => onChange({ label: v })} />
        </Row>
        <RichTextArea label="Frase destacada (lede)" value={s.lede || ""} onChange={(v) => onChange({ lede: v })} rows={2} />
        {(s.columns || []).map((c: string, i: number) => (
          <RichTextArea
            key={i}
            label={`Columna ${i + 1}`}
            value={c}
            onChange={(v) => {
              const next = [...s.columns];
              next[i] = v;
              onChange({ columns: next });
            }}
            rows={4}
          />
        ))}
        <ListControls
          items={s.columns}
          onAdd={() => onChange({ columns: [...s.columns, ""] })}
          onRemove={(i) => onChange({ columns: s.columns.filter((_: any, j: number) => j !== i) })}
        />
        <LineHeightSlider value={s.lineHeight} onChange={(v) => onChange({ lineHeight: v })} />
      </>
    );
  }

  if (t === "objectives" || t === "stakeholders") {
    const s = section as any;
    return (
      <>
        <Row>
          <Field label="Número" value={s.number} onChange={(v) => onChange({ number: v })} />
          <Field label="Etiqueta" value={s.label} onChange={(v) => onChange({ label: v })} />
        </Row>
        <ItemsEditor
          items={s.items}
          fields={t === "stakeholders" ? ["num", "title", "body"] : ["title", "body"]}
          onChange={(items) => onChange({ items })}
        />
        <LineHeightSlider value={s.lineHeight} onChange={(v) => onChange({ lineHeight: v })} />
      </>
    );
  }

  if (t === "planning") {
    const s = section as any;
    return (
      <>
        <Row>
          <Field label="Número" value={s.number} onChange={(v) => onChange({ number: v })} />
          <Field label="Etiqueta" value={s.label} onChange={(v) => onChange({ label: v })} />
        </Row>
        {(s.items || []).map((it: any, i: number) => (
          <div key={i} className="border-l-2 pl-3 space-y-2" style={{ borderColor: "var(--rule)" }}>
            <Row>
              <Choice
                label="Color"
                value={it.dotColor || "orange"}
                options={[
                  { value: "orange", label: "Naranja" },
                  { value: "blue", label: "Azul" },
                  { value: "beige", label: "Beige" },
                ]}
                onChange={(v) => {
                  const next = [...s.items];
                  next[i] = { ...next[i], dotColor: v };
                  onChange({ items: next });
                }}
              />
              <div></div>
            </Row>
            <Field label="Kicker" value={it.kicker} onChange={(v) => {
              const next = [...s.items]; next[i] = { ...next[i], kicker: v }; onChange({ items: next });
            }} />
            <Field label="Título" value={it.title} onChange={(v) => {
              const next = [...s.items]; next[i] = { ...next[i], title: v }; onChange({ items: next });
            }} />
            <RichTextArea label="Texto" value={it.body} onChange={(v) => {
              const next = [...s.items]; next[i] = { ...next[i], body: v }; onChange({ items: next });
            }} rows={3} />
          </div>
        ))}
        <ListControls
          items={s.items}
          onAdd={() => onChange({ items: [...s.items, { dotColor: "blue", kicker: "", title: "", body: "" }] })}
          onRemove={(i) => onChange({ items: s.items.filter((_: any, j: number) => j !== i) })}
        />
        <LineHeightSlider value={s.lineHeight} onChange={(v) => onChange({ lineHeight: v })} />
      </>
    );
  }

  if (t === "services-index") {
    const s = section as any;
    return (
      <>
        <Row>
          <Field label="Número" value={s.number} onChange={(v) => onChange({ number: v })} />
          <Field label="Etiqueta" value={s.label} onChange={(v) => onChange({ label: v })} />
        </Row>
        <RichTextArea label="Frase lede" value={s.lede} onChange={(v) => onChange({ lede: v })} rows={2} />
        {(s.blocks || []).map((b: any, i: number) => (
          <Row key={i}>
            <Field label="Letra" value={b.letter} onChange={(v) => {
              const next = [...s.blocks]; next[i] = { ...next[i], letter: v }; onChange({ blocks: next });
            }} />
            <Field label="Título" value={b.title} onChange={(v) => {
              const next = [...s.blocks]; next[i] = { ...next[i], title: v }; onChange({ blocks: next });
            }} />
          </Row>
        ))}
        <ListControls
          items={s.blocks}
          onAdd={() => onChange({ blocks: [...s.blocks, { letter: "", title: "" }] })}
          onRemove={(i) => onChange({ blocks: s.blocks.filter((_: any, j: number) => j !== i) })}
        />
      </>
    );
  }

  if (t === "service-block") {
    const s = section as any;
    return (
      <>
        <Row>
          <Field label="Letra" value={s.letter} onChange={(v) => onChange({ letter: v })} />
          <Field label="Kicker" value={s.kicker} onChange={(v) => onChange({ kicker: v })} />
        </Row>
        <Field label="Título" value={s.title} onChange={(v) => onChange({ title: v })} />
        <ItemsEditor
          items={s.items}
          fields={["title", "body"]}
          onChange={(items) => onChange({ items })}
        />
        <LineHeightSlider value={s.lineHeight} onChange={(v) => onChange({ lineHeight: v })} />
      </>
    );
  }

  if (t === "budget") {
    const s = section as any;
    return (
      <>
        <Row>
          <Field label="Número" value={s.number} onChange={(v) => onChange({ number: v })} />
          <Field label="Etiqueta" value={s.label} onChange={(v) => onChange({ label: v })} />
        </Row>
        <Field label="Tag (esquina superior)" value={s.tag || ""} onChange={(v) => onChange({ tag: v })} />
        {(s.groups || []).map((g: any, gi: number) => (
          <div key={gi} className="border-l-2 pl-3 space-y-2" style={{ borderColor: "var(--accent)" }}>
            <Field label="Sección" value={g.title} onChange={(v) => {
              const next = [...s.groups]; next[gi] = { ...next[gi], title: v }; onChange({ groups: next });
            }} />
            {(g.rows || []).map((r: any, ri: number) => (
              <div key={ri} className="grid grid-cols-3 gap-2">
                <Field label="Concepto" value={r.concept} onChange={(v) => {
                  const next = [...s.groups];
                  next[gi].rows[ri] = { ...next[gi].rows[ri], concept: v };
                  onChange({ groups: next });
                }} />
                <Field label="Cantidad" value={r.qty || ""} onChange={(v) => {
                  const next = [...s.groups];
                  next[gi].rows[ri] = { ...next[gi].rows[ri], qty: v };
                  onChange({ groups: next });
                }} />
                <Field label="Importe" value={r.amount} onChange={(v) => {
                  const next = [...s.groups];
                  next[gi].rows[ri] = { ...next[gi].rows[ri], amount: v };
                  onChange({ groups: next });
                }} />
              </div>
            ))}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const next = [...s.groups];
                  next[gi].rows = [...next[gi].rows, { concept: "", qty: "", amount: "" }];
                  onChange({ groups: next });
                }}
                className="text-xs uppercase tracking-widest"
                style={{ color: "var(--ink-mute)", letterSpacing: "1px" }}
              >
                + Línea
              </button>
              <button
                onClick={() => {
                  const next = s.groups.filter((_: any, j: number) => j !== gi);
                  onChange({ groups: next });
                }}
                className="text-xs uppercase tracking-widest ml-auto"
                style={{ color: "var(--accent)", letterSpacing: "1px" }}
              >
                Eliminar sección
              </button>
            </div>
            <Field label="Subtotal sección" value={g.subtotal || ""} onChange={(v) => {
              const next = [...s.groups]; next[gi] = { ...next[gi], subtotal: v }; onChange({ groups: next });
            }} />
          </div>
        ))}
        <button
          onClick={() => onChange({
            groups: [...(s.groups || []), { title: "", rows: [{ concept: "", qty: "", amount: "" }], subtotal: "" }]
          })}
          className="btn-ghost text-xs"
        >
          + Nueva sección de presupuesto
        </button>
        <TextArea label="Nota legal" value={s.note || ""} onChange={(v) => onChange({ note: v })} rows={2} />
      </>
    );
  }

  if (t === "budget-summary") {
    const s = section as any;
    return (
      <>
        <Row>
          <Field label="Número" value={s.number} onChange={(v) => onChange({ number: v })} />
          <Field label="Etiqueta" value={s.label} onChange={(v) => onChange({ label: v })} />
        </Row>
        {(s.rows || []).map((r: any, i: number) => (
          <div key={i} className="border-l-2 pl-3 space-y-2" style={{ borderColor: r.isTotal ? "var(--ink)" : "var(--rule)" }}>
            <Row>
              <Field label="Concepto" value={r.concept} onChange={(v) => {
                const next = [...s.rows]; next[i] = { ...next[i], concept: v }; onChange({ rows: next });
              }} />
              <Field label="Importe" value={r.amount} onChange={(v) => {
                const next = [...s.rows]; next[i] = { ...next[i], amount: v }; onChange({ rows: next });
              }} />
            </Row>
            <Field label="Detalle" value={r.detail || ""} onChange={(v) => {
              const next = [...s.rows]; next[i] = { ...next[i], detail: v }; onChange({ rows: next });
            }} />
            <label className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-mute)" }}>
              <input type="checkbox" checked={!!r.isTotal} onChange={(e) => {
                const next = [...s.rows]; next[i] = { ...next[i], isTotal: e.target.checked }; onChange({ rows: next });
              }} />
              Es fila TOTAL (destacada)
            </label>
          </div>
        ))}
        <ListControls
          items={s.rows}
          onAdd={() => onChange({ rows: [...s.rows, { concept: "", detail: "", amount: "", isTotal: false }] })}
          onRemove={(i) => onChange({ rows: s.rows.filter((_: any, j: number) => j !== i) })}
        />
        <TextArea label="Nota legal" value={s.note || ""} onChange={(v) => onChange({ note: v })} rows={2} />
      </>
    );
  }

  if (t === "prose") {
    const s = section as any;
    return (
      <>
        <Row>
          <Field label="Número (opcional)" value={s.number || ""} onChange={(v) => onChange({ number: v })} />
          <Field label="Etiqueta" value={s.label} onChange={(v) => onChange({ label: v })} />
        </Row>
        <Field label="Título grande" value={s.title || ""} onChange={(v) => onChange({ title: v })} />
        <RichTextArea
          label="Párrafos (separa con línea en blanco)"
          value={(s.paragraphs || []).join("\n\n")}
          onChange={(v) => onChange({ paragraphs: v.split(/\n\s*\n/) })}
          rows={8}
        />
        <LineHeightSlider value={s.lineHeight} onChange={(v) => onChange({ lineHeight: v })} />
      </>
    );
  }

  return null;
}

function ItemsEditor({
  items, fields, onChange,
}: {
  items: any[];
  fields: string[];
  onChange: (next: any[]) => void;
}) {
  return (
    <>
      {(items || []).map((it: any, i: number) => (
        <div key={i} className="border-l-2 pl-3 space-y-2" style={{ borderColor: "var(--rule)" }}>
          {fields.includes("num") && (
            <Field label="Número (01, 02…)" value={it.num || ""} onChange={(v) => {
              const next = [...items]; next[i] = { ...next[i], num: v }; onChange(next);
            }} />
          )}
          {fields.includes("title") && (
            <Field label="Título" value={it.title} onChange={(v) => {
              const next = [...items]; next[i] = { ...next[i], title: v }; onChange(next);
            }} />
          )}
          {fields.includes("body") && (
            <RichTextArea label="Texto" value={it.body} onChange={(v) => {
              const next = [...items]; next[i] = { ...next[i], body: v }; onChange(next);
            }} rows={2} />
          )}
        </div>
      ))}
      <ListControls
        items={items}
        onAdd={() => {
          const obj: any = {};
          fields.forEach((f) => obj[f] = "");
          onChange([...(items || []), obj]);
        }}
        onRemove={(i) => onChange(items.filter((_, j) => j !== i))}
      />
    </>
  );
}

function ListControls({
  items, onAdd, onRemove,
}: {
  items: any[];
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="flex justify-between items-center pt-2">
      <button
        onClick={onAdd}
        className="text-xs uppercase tracking-widest"
        style={{ color: "var(--ink-mute)", letterSpacing: "1.5px" }}
      >
        + Añadir
      </button>
      {items.length > 1 && (
        <button
          onClick={() => onRemove(items.length - 1)}
          className="text-xs uppercase tracking-widest"
          style={{ color: "var(--accent)", letterSpacing: "1.5px" }}
        >
          − Quitar último
        </button>
      )}
    </div>
  );
}

function LogosBlock({
  tier, label, logos, onAdd, onRemove,
}: {
  tier: "primary" | "secondary";
  label: string;
  logos: LogoUpload[];
  onAdd: (l: LogoUpload) => void;
  onRemove: (id: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("logos").upload(path, file);
    if (error) {
      alert("Error subiendo logo: " + error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("logos").getPublicUrl(path);
    onAdd({ id: crypto.randomUUID(), url: data.publicUrl, name: file.name, tier });
    setUploading(false);
  }

  return (
    <div>
      <div className="kicker mb-2" style={{ fontSize: "8pt", color: tier === "primary" ? "var(--accent)" : "var(--ink-mute)" }}>
        {label}
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {logos.map((l) => (
          <div key={l.id} className="border border-rule p-2 flex items-center gap-2">
            <img src={l.url} alt={l.name} className="h-8" />
            <button onClick={() => onRemove(l.id)} className="text-ink-mute hover:text-accent text-xs">×</button>
          </div>
        ))}
      </div>
      <label className="btn-ghost cursor-pointer" style={{ padding: "0.4rem 0.8rem", fontSize: "9pt" }}>
        {uploading ? "Subiendo…" : "+ Logo"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </label>
    </div>
  );
}

function AddSectionMenu({ onAdd }: { onAdd: (s: DocSection) => void }) {
  const [open, setOpen] = useState(false);
  const sections: { type: DocSection["type"]; label: string; init: () => DocSection }[] = [
    { type: "intro", label: "Introducción", init: () => ({ type: "intro", number: "1.0", label: "Introducción", lede: "", columns: ["", ""] }) },
    { type: "objectives", label: "Objetivos", init: () => ({ type: "objectives", number: "2.0", label: "Objetivos", items: [{ title: "", body: "" }] }) },
    { type: "stakeholders", label: "Grupos de interés", init: () => ({ type: "stakeholders", number: "3.0", label: "Grupos de interés", items: [{ num: "", title: "", body: "" }] }) },
    { type: "planning", label: "Planteamiento", init: () => ({ type: "planning", number: "4.0", label: "Planteamiento", items: [{ dotColor: "orange", kicker: "", title: "", body: "" }] }) },
    { type: "services-index", label: "Índice de servicios", init: () => ({ type: "services-index", number: "5.0", label: "Propuesta de servicios", lede: "Una propuesta articulada en [varios bloques] de servicio.", blocks: [{ letter: "A", title: "" }, { letter: "B", title: "" }] }) },
    { type: "service-block", label: "Bloque de servicio", init: () => ({ type: "service-block", letter: "A", kicker: "BLOQUE 01", title: "", items: [{ title: "", body: "" }] }) },
    { type: "budget", label: "Presupuesto", init: () => ({ type: "budget", number: "6.0", label: "Presupuesto", tag: "", groups: [{ title: "", rows: [{ concept: "", qty: "", amount: "" }], subtotal: "" }], note: "" }) },
    { type: "budget-summary", label: "Cuadro resumen", init: () => ({ type: "budget-summary", number: "6.0", label: "Presupuesto · Cuadro resumen", rows: [{ concept: "", detail: "", amount: "", isTotal: false }], note: "" }) },
    { type: "prose", label: "Texto libre", init: () => ({ type: "prose", number: "", label: "Sección", title: "", paragraphs: [""] }) },
  ];
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost w-full"
        style={{ padding: "0.7rem", fontSize: "10pt" }}
      >
        {open ? "− Cerrar" : "+ Añadir sección"}
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {sections.map((s) => (
            <button
              key={s.type}
              onClick={() => { onAdd(s.init()); setOpen(false); }}
              className="text-left p-3 border border-rule hover:border-ink"
              style={{ fontSize: "10pt" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function titleForSection(s: DocSection): string {
  if (s.type === "service-block") return `${(s as any).letter}/ ${(s as any).title || "Bloque"}`;
  if ("label" in s) return (s as any).label;
  return s.type;
}
