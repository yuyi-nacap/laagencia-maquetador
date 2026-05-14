import React from "react";
import type { DocumentModel, DocSection } from "@/types/document";

// ============================================================
// Renderer del documento.
// Mejoras:
//   · SAFE-ZONE inferior garantizada (max-height + overflow:hidden).
//   · Rich text inline: **negrita**, _cursiva_, [acento].
//   · Interlineado configurable por sección (lineHeight).
//   · Formas decorativas y uso disciplinado de la paleta completa.
// ============================================================

const SAFE = {
  top: "1.05in",
  bottom: "0.85in",
  left: "0.7in",
  right: "0.7in",
};

export default function DocumentRenderer({
  doc,
  scale = 1,
}: {
  doc: DocumentModel;
  scale?: number;
}) {
  return (
    <div
      className="flex flex-col gap-6"
      style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
    >
      <CoverPage doc={doc} />
      {doc.sections.map((s, i) => (
        <SectionPage
          key={i}
          doc={doc}
          section={s}
          pageNum={i + 2}
          totalPages={doc.sections.length + 2}
        />
      ))}
      <ClosingPage doc={doc} />
    </div>
  );
}

// ============================================================
// Rich text inline
// ============================================================

function richText(text: string): React.ReactNode {
  if (!text) return null;
  const re = /(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\])/g;
  const parts = text.split(re);
  return parts.map((p, i) => {
    if (!p) return null;
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} style={{ fontWeight: 500 }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("_") && p.endsWith("_"))
      return <em key={i} style={{ fontStyle: "italic" }}>{p.slice(1, -1)}</em>;
    if (p.startsWith("[") && p.endsWith("]"))
      return <span key={i} style={{ color: "var(--accent)", fontWeight: 500 }}>{p.slice(1, -1)}</span>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

function paragraphs(text: string, lineHeight = 1.45): React.ReactNode[] {
  if (!text) return [];
  return text.split(/\n\s*\n/).filter(Boolean).map((p, i) => (
    <p key={i} style={{ marginBottom: "0.14in", lineHeight }}>
      {richText(p)}
    </p>
  ));
}

// ============================================================
// Helpers comunes
// ============================================================

function SafeBody({
  children, topOffset, isLandscape, style, extraBottom = "0in",
}: {
  children: React.ReactNode;
  topOffset: string;
  isLandscape: boolean;
  style?: React.CSSProperties;
  extraBottom?: string;
}) {
  const pageH = isLandscape ? 7.5 : 11.69;
  const topN = parseFloat(topOffset);
  const botN = parseFloat(SAFE.bottom) + parseFloat(extraBottom);
  const maxH = `${pageH - topN - botN}in`;
  return (
    <div
      className="absolute"
      style={{
        left: SAFE.left, right: SAFE.right, top: topOffset,
        maxHeight: maxH, overflow: "hidden", ...style,
      }}
    >
      {children}
    </div>
  );
}

function LogoHeader({ doc, white }: { doc: DocumentModel; white?: boolean }) {
  const primary = doc.logos_primary || [];
  const secondary = doc.logos_secondary || [];
  const la = white ? "/logos/laagencia-logo-white.png" : "/logos/laagencia-logo.png";
  const sepColor = white ? "#FAFAFA" : "var(--ink)";
  return (
    <div
      className="absolute flex justify-between items-center"
      style={{ top: "0.55in", left: SAFE.left, right: SAFE.right, height: "0.75in" }}
    >
      <div className="flex items-center" style={{ gap: "0.28in", height: "100%" }}>
        <img src={la} alt="LaAgencia" style={{ height: "0.6in" }} />
        {primary.map((logo) => (
          <React.Fragment key={logo.id}>
            <div style={{ width: "1.1px", height: "0.5in", background: sepColor, flexShrink: 0 }} />
            <img src={logo.url} alt={logo.name} style={{ height: "0.66in" }} />
          </React.Fragment>
        ))}
        {secondary.length > 0 && (
          <>
            <div style={{ width: "1.1px", height: "0.4in", background: sepColor, flexShrink: 0, opacity: 0.5 }} />
            {secondary.map((logo) => (
              <img key={logo.id} src={logo.url} alt={logo.name} style={{ height: "0.5in", opacity: 0.85 }} />
            ))}
          </>
        )}
      </div>
      <div style={{ fontSize: "10.5pt", color: white ? "#FAFAFA" : "var(--ink)", letterSpacing: "0.5px" }}>
        {doc.meta.date || ""}
      </div>
    </div>
  );
}

function Topbar({ folio, pageNum, total }: { folio: string; pageNum: number; total: number }) {
  return (
    <>
      <div
        className="absolute flex justify-between"
        style={{
          top: "0.4in", left: SAFE.left, right: SAFE.right,
          fontSize: "9pt", color: "var(--ink-mute)",
          letterSpacing: "0.8px", textTransform: "uppercase",
        }}
      >
        <span>{folio}</span>
        <span>{String(pageNum).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
      </div>
      <div
        className="absolute"
        style={{
          top: "0.62in", left: SAFE.left, right: SAFE.right,
          height: "0.4px", background: "var(--ink)", opacity: 0.35,
        }}
      />
    </>
  );
}

function SectionHead({ number, label }: { number: string; label: string }) {
  const [n1, n2] = number.split(".");
  return (
    <div className="absolute" style={{ top: SAFE.top, left: SAFE.left, right: SAFE.right }}>
      <div style={{ fontWeight: 300, fontSize: "90pt", lineHeight: 0.85, letterSpacing: "-3.5px" }}>
        {n1}<span style={{ color: "var(--accent)" }}>.</span>{n2 || "0"}
      </div>
      <div
        style={{
          fontWeight: 500, fontSize: "11pt",
          letterSpacing: "2.5px", textTransform: "uppercase",
          marginTop: "0.15in",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ============================================================
// PORTADA
// ============================================================

function CoverPage({ doc }: { doc: DocumentModel }) {
  const isLandscape = doc.orientation === "landscape";
  const year = doc.meta.date?.match(/\d{4}/)?.[0] || "2026";
  return (
    <div className={`doc-page ${doc.orientation}`}>
      <LogoHeader doc={doc} />
      <div
        className="absolute flex justify-between"
        style={{
          top: isLandscape ? "1.85in" : "2.2in",
          left: SAFE.left, right: SAFE.right,
          fontSize: "10pt", letterSpacing: "1.5px",
          textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 500,
        }}
      >
        <span>{doc.meta.subtitle || "Propuesta"}</span>
        <span>{doc.meta.location || ""}</span>
      </div>
      <div
        className="absolute"
        style={{
          top: isLandscape ? "2.4in" : "2.75in",
          left: SAFE.left, right: SAFE.right,
          height: "0.5px", background: "var(--ink)",
        }}
      />

      {/* Cuadrado beige decorativo */}
      {isLandscape && (
        <div
          className="absolute"
          style={{
            right: "0.7in", top: "3.4in",
            width: "1.2in", height: "1.2in",
            background: "var(--dot-beige)", opacity: 0.55,
          }}
        />
      )}

      <div
        className="absolute"
        style={{
          left: SAFE.left, right: SAFE.right,
          top: isLandscape ? "2.95in" : "3.5in",
        }}
      >
        <div
          style={{
            fontSize: "11pt", fontWeight: 500,
            letterSpacing: "3px", textTransform: "uppercase",
            marginBottom: "0.4in",
          }}
        >
          {doc.meta.title}
        </div>
        <div
          style={{
            fontSize: isLandscape ? "148pt" : "110pt",
            fontWeight: 300,
            letterSpacing: isLandscape ? "-6px" : "-4px",
            lineHeight: 0.85,
          }}
        >
          {year}<span style={{ color: "var(--accent)", fontWeight: 500 }}>.</span>
        </div>
      </div>

      <div
        className="absolute grid"
        style={{
          left: SAFE.left, right: SAFE.right, bottom: "0.65in",
          paddingTop: "0.22in", borderTop: "0.5px solid var(--ink)",
          gridTemplateColumns: "1fr 1fr 1fr", columnGap: "0.5in",
        }}
      >
        <FootCol label="Documento" text={doc.meta.documentLabel || ""} />
        <FootCol label="Para" text={doc.meta.client || ""} />
        <FootCol label="De" text={"La Agencia x\nNavarra Capital"} />
      </div>
    </div>
  );
}

function FootCol({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: "9pt", fontWeight: 500,
          letterSpacing: "2px", textTransform: "uppercase",
          color: "var(--ink-mute)", marginBottom: "0.1in",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "12.5pt", fontWeight: 500, lineHeight: 1.3 }}>
        {text.split("\n").map((l, i) => (
          <React.Fragment key={i}>
            {l}
            {i < text.split("\n").length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SECCIÓN (router)
// ============================================================

function SectionPage({
  doc, section, pageNum, totalPages,
}: {
  doc: DocumentModel;
  section: DocSection;
  pageNum: number;
  totalPages: number;
}) {
  const isLandscape = doc.orientation === "landscape";
  return (
    <div className={`doc-page ${doc.orientation}`}>
      <Topbar folio={doc.meta.title} pageNum={pageNum} total={totalPages} />
      {section.type === "intro" && <IntroBlock section={section} isLandscape={isLandscape} />}
      {section.type === "objectives" && <ObjectivesBlock section={section} isLandscape={isLandscape} />}
      {section.type === "stakeholders" && <StakeholdersBlock section={section} isLandscape={isLandscape} />}
      {section.type === "planning" && <PlanningBlock section={section} isLandscape={isLandscape} />}
      {section.type === "services-index" && <ServicesIndexBlock section={section} isLandscape={isLandscape} />}
      {section.type === "service-block" && <ServiceBlockBlock section={section} isLandscape={isLandscape} />}
      {section.type === "budget" && <BudgetBlock section={section} isLandscape={isLandscape} />}
      {section.type === "budget-summary" && <BudgetSummaryBlock section={section} isLandscape={isLandscape} />}
      {section.type === "prose" && <ProseBlock section={section} isLandscape={isLandscape} />}
    </div>
  );
}

// ============================================================
// BLOQUES
// ============================================================

function IntroBlock({ section: s, isLandscape }: any) {
  const lh = s.lineHeight || 1.45;
  const grid =
    s.columns.length === 1
      ? "1fr"
      : s.lede
      ? "4.6in 1fr 1fr"
      : `repeat(${Math.min(s.columns.length, 3)}, 1fr)`;
  return (
    <>
      <SectionHead number={s.number} label={s.label} />
      {/* Círculo beige decorativo */}
      <div
        className="absolute"
        style={{
          right: "0.7in", top: "1.4in",
          width: "0.55in", height: "0.55in",
          borderRadius: "50%",
          background: "var(--dot-beige)", opacity: 0.5,
        }}
      />
      <SafeBody topOffset={isLandscape ? "4.0in" : "5.0in"} isLandscape={isLandscape}>
        <div className="grid" style={{ gridTemplateColumns: grid, columnGap: "0.5in" }}>
          {s.lede && (
            <div
              style={{
                fontSize: "16pt", fontWeight: 400,
                lineHeight: 1.35, letterSpacing: "-0.2px",
              }}
            >
              {richText(s.lede)}
            </div>
          )}
          {s.columns.map((col: string, i: number) => (
            <div key={i} style={{ fontSize: "11.5pt", lineHeight: lh }}>
              {paragraphs(col, lh)}
            </div>
          ))}
        </div>
      </SafeBody>
    </>
  );
}

function ObjectivesBlock({ section: s, isLandscape }: any) {
  const cols = isLandscape ? Math.min(s.items.length, 5) : Math.min(s.items.length, 2);
  const lh = s.lineHeight || 1.4;
  const palette = ["var(--accent)", "var(--dot-blue)", "var(--dot-beige)"];
  return (
    <>
      <SectionHead number={s.number} label={s.label} />
      {/* Banda fina naranja arriba a la derecha */}
      <div
        className="absolute"
        style={{
          right: "0.7in", top: "1.6in",
          width: "0.45in", height: "0.08in", background: "var(--accent)",
        }}
      />
      <SafeBody topOffset="3.95in" isLandscape={isLandscape}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            columnGap: "0.35in", rowGap: "0.45in",
          }}
        >
          {s.items.map((it: any, i: number) => {
            const barColor = palette[i % palette.length];
            return (
              <div key={i} style={{ position: "relative", paddingTop: "0.16in" }}>
                <div
                  style={{
                    position: "absolute", top: 0, left: 0,
                    width: "0.3in", height: "2px", background: barColor,
                  }}
                />
                <div
                  style={{
                    position: "absolute", top: 0,
                    left: "0.35in", right: 0,
                    borderTop: "0.6px solid var(--ink)",
                  }}
                />
                <div
                  style={{
                    fontSize: "11pt", fontWeight: 500,
                    lineHeight: 1.3, marginBottom: "0.15in",
                    letterSpacing: "0.3px",
                  }}
                >
                  {richText(it.title)}
                </div>
                <div style={{ fontSize: "10.5pt", lineHeight: lh, color: "var(--ink-soft)" }}>
                  {richText(it.body)}
                </div>
              </div>
            );
          })}
        </div>
      </SafeBody>
    </>
  );
}

function StakeholdersBlock({ section: s, isLandscape }: any) {
  const cols = isLandscape ? Math.min(s.items.length, 4) : 2;
  const lh = s.lineHeight || 1.4;
  return (
    <>
      <SectionHead number={s.number} label={s.label} />
      <SafeBody topOffset="4.0in" isLandscape={isLandscape}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            columnGap: "0.4in", rowGap: "0.5in",
          }}
        >
          {s.items.map((it: any, i: number) => (
            <div key={i} style={{ borderTop: "0.6px solid var(--ink)", paddingTop: "0.16in" }}>
              {it.num && (
                <div
                  style={{
                    fontSize: "10pt", fontWeight: 500, color: "var(--accent)",
                    letterSpacing: "1.5px", marginBottom: "0.1in",
                  }}
                >
                  {it.num}
                </div>
              )}
              <div
                style={{
                  fontSize: "11pt", fontWeight: 500,
                  lineHeight: 1.3, marginBottom: "0.15in",
                }}
              >
                {richText(it.title)}
              </div>
              <div style={{ fontSize: "10.5pt", lineHeight: lh, color: "var(--ink-soft)" }}>
                {richText(it.body)}
              </div>
            </div>
          ))}
        </div>
      </SafeBody>
    </>
  );
}

function PlanningBlock({ section: s, isLandscape }: any) {
  const cols = isLandscape ? Math.min(s.items.length, 3) : 1;
  const lh = s.lineHeight || 1.4;
  return (
    <>
      <SectionHead number={s.number} label={s.label} />
      <SafeBody topOffset="3.95in" isLandscape={isLandscape}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            columnGap: "0.45in", rowGap: "0.5in",
          }}
        >
          {s.items.map((it: any, i: number) => {
            const dotColor =
              it.dotColor === "orange" ? "var(--accent)"
              : it.dotColor === "blue" ? "var(--dot-blue)"
              : "var(--dot-beige)";
            return (
              <div key={i}>
                <div
                  className="flex items-center"
                  style={{ gap: "0.15in", marginBottom: "0.15in" }}
                >
                  <div style={{ width: "0.22in", height: "0.22in", background: dotColor }} />
                  <div
                    style={{
                      fontSize: "9pt", fontWeight: 500,
                      letterSpacing: "1.5px", textTransform: "uppercase",
                    }}
                  >
                    {it.kicker}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "15pt", fontWeight: 400, lineHeight: 1.2,
                    marginBottom: "0.18in", letterSpacing: "-0.3px",
                  }}
                >
                  {richText(it.title)}
                </div>
                <div style={{ fontSize: "11pt", lineHeight: lh }}>
                  {paragraphs(it.body, lh)}
                </div>
              </div>
            );
          })}
        </div>
      </SafeBody>
    </>
  );
}

function ServicesIndexBlock({ section: s, isLandscape }: any) {
  const palette = [
    "var(--accent)", "var(--dot-blue)", "var(--dot-beige)",
    "var(--accent)", "var(--dot-blue)",
  ];
  return (
    <>
      <SectionHead number={s.number} label={s.label} />
      <SafeBody topOffset={isLandscape ? "4.0in" : "5.0in"} isLandscape={isLandscape}>
        <div
          style={{
            fontSize: "23pt", fontWeight: 300, lineHeight: 1.2,
            letterSpacing: "-0.5px", maxWidth: "8.5in", marginBottom: "0.45in",
          }}
        >
          {richText(s.lede)}
        </div>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${s.blocks.length}, 1fr)`,
            columnGap: "0.3in",
          }}
        >
          {s.blocks.map((b: any, i: number) => {
            const color = palette[i % palette.length];
            return (
              <div
                key={i}
                style={{
                  borderTop: `1.5px solid ${color}`,
                  paddingTop: "0.16in",
                }}
              >
                <div
                  style={{
                    fontSize: "10pt", fontWeight: 500,
                    letterSpacing: "2px", color, marginBottom: "0.06in",
                  }}
                >
                  {b.letter} /
                </div>
                <div style={{ fontSize: "11pt", fontWeight: 500, lineHeight: 1.25 }}>
                  {richText(b.title)}
                </div>
              </div>
            );
          })}
        </div>
      </SafeBody>
    </>
  );
}

function ServiceBlockBlock({ section: s, isLandscape }: any) {
  const lh = s.lineHeight || 1.4;
  return (
    <>
      <div
        className="absolute flex items-baseline"
        style={{ left: SAFE.left, top: "1.15in", gap: "0.4in" }}
      >
        <div
          style={{
            fontSize: "90pt", fontWeight: 300,
            letterSpacing: "-3px", lineHeight: 0.85,
          }}
        >
          {s.letter}<span style={{ color: "var(--accent)", fontWeight: 300 }}>/</span>
        </div>
        <div style={{ paddingTop: "0.5in" }}>
          <div
            style={{
              fontSize: "10pt", fontWeight: 500,
              letterSpacing: "2px", textTransform: "uppercase",
              color: "var(--ink-soft)", marginBottom: "0.08in",
            }}
          >
            {s.kicker}
          </div>
          <div
            style={{
              fontSize: "26pt", fontWeight: 400,
              letterSpacing: "-0.6px", lineHeight: 1.1,
              maxWidth: "7.5in",
            }}
          >
            {richText(s.title)}
          </div>
        </div>
      </div>
      <SafeBody topOffset="4.05in" isLandscape={isLandscape}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: isLandscape ? "1fr 1fr" : "1fr",
            columnGap: "0.5in", rowGap: "0.30in",
          }}
        >
          {s.items.map((it: any, i: number) => (
            <div key={i} style={{ borderTop: "0.6px solid var(--ink)", paddingTop: "0.16in" }}>
              <div
                style={{
                  fontSize: "11pt", fontWeight: 500,
                  letterSpacing: "0.3px", marginBottom: "0.08in",
                }}
              >
                {richText(it.title)}
              </div>
              <div style={{ fontSize: "10.5pt", lineHeight: lh, color: "var(--ink-soft)" }}>
                {richText(it.body)}
              </div>
            </div>
          ))}
        </div>
      </SafeBody>
    </>
  );
}

function BudgetBlock({ section: s, isLandscape }: any) {
  return (
    <>
      <div className="absolute" style={{ left: SAFE.left, top: "1.1in" }}>
        <div className="flex items-baseline" style={{ gap: "0.35in" }}>
          <div style={{ fontSize: "36pt", fontWeight: 300, letterSpacing: "-1.2px", lineHeight: 1 }}>
            {s.number.split(".")[0]}<span style={{ color: "var(--accent)" }}>.</span>{s.number.split(".")[1]}
          </div>
          <div
            style={{
              fontSize: "9pt", fontWeight: 500,
              letterSpacing: "2.5px", textTransform: "uppercase",
            }}
          >
            {s.label}
          </div>
        </div>
      </div>
      {s.tag && (
        <div
          className="absolute"
          style={{
            right: "0.7in", top: "1.2in",
            fontSize: "8.5pt", fontWeight: 500,
            letterSpacing: "1.5px", textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          {s.tag}
        </div>
      )}
      <SafeBody
        topOffset="2.0in"
        isLandscape={isLandscape}
        extraBottom={s.note ? "0.7in" : "0in"}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5pt" }}>
          <tbody>
            {s.groups.map((g: any, gi: number) => (
              <React.Fragment key={gi}>
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      padding: `${gi === 0 ? "0" : "0.13in"} 0 0.04in 0`,
                      fontWeight: 500, fontSize: "9pt",
                      letterSpacing: "1.8px", textTransform: "uppercase",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: "0.18in", height: "0.18in",
                        background: "var(--accent)",
                        marginRight: "0.12in", verticalAlign: "-2px",
                      }}
                    />
                    {g.title}
                  </td>
                </tr>
                {g.rows.map((r: any, ri: number) => (
                  <tr key={ri}>
                    <td style={{ padding: "0.05in 0", verticalAlign: "top" }}>{richText(r.concept)}</td>
                    <td
                      style={{
                        padding: "0.05in 0.5in 0.05in 0",
                        color: "var(--ink-mute)",
                        textAlign: "right",
                        width: "1.8in", fontSize: "10pt",
                      }}
                    >
                      {r.qty || ""}
                    </td>
                    <td
                      style={{
                        padding: "0.05in 0", textAlign: "right",
                        whiteSpace: "nowrap", width: "1.3in",
                      }}
                    >
                      {r.amount}
                    </td>
                  </tr>
                ))}
                {g.subtotal && (
                  <tr>
                    <td style={{ borderTop: "0.6px solid var(--ink)", fontWeight: 500, padding: "0.09in 0" }}>Subtotal</td>
                    <td style={{ borderTop: "0.6px solid var(--ink)", padding: "0.09in 0" }} />
                    <td
                      style={{
                        borderTop: "0.6px solid var(--ink)",
                        fontWeight: 500, padding: "0.09in 0",
                        textAlign: "right",
                      }}
                    >
                      {g.subtotal}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </SafeBody>
      {s.note && (
        <div
          className="absolute"
          style={{
            left: SAFE.left, right: SAFE.right, bottom: "0.5in",
            paddingTop: "0.18in", borderTop: "0.5px solid var(--rule)",
            fontSize: "8.5pt", color: "var(--ink-mute)", lineHeight: 1.5,
          }}
        >
          {s.note}
        </div>
      )}
    </>
  );
}

function BudgetSummaryBlock({ section: s, isLandscape }: any) {
  return (
    <>
      <SectionHead number={s.number} label={s.label} />
      <SafeBody
        topOffset="3.05in"
        isLandscape={isLandscape}
        extraBottom={s.note ? "0.8in" : "0in"}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5pt" }}>
          <tbody>
            {s.rows.map((r: any, i: number) => (
              <tr key={i}>
                <td
                  style={{
                    padding: r.isTotal ? "0.16in 0" : "0.11in 0",
                    borderTop: r.isTotal ? "1.4px solid var(--ink)" : "0.5px solid var(--rule)",
                    borderBottom: r.isTotal ? "1.4px solid var(--ink)" : undefined,
                    fontWeight: r.isTotal ? 500 : 400,
                    fontSize: r.isTotal ? "13pt" : "11.5pt",
                  }}
                >
                  {richText(r.concept)}
                </td>
                <td
                  style={{
                    padding: r.isTotal ? "0.16in 0" : "0.11in 0",
                    borderTop: r.isTotal ? "1.4px solid var(--ink)" : "0.5px solid var(--rule)",
                    borderBottom: r.isTotal ? "1.4px solid var(--ink)" : undefined,
                    color: "var(--ink-mute)", fontSize: "10.5pt",
                  }}
                >
                  {r.detail || ""}
                </td>
                <td
                  style={{
                    padding: r.isTotal ? "0.16in 0" : "0.11in 0",
                    borderTop: r.isTotal ? "1.4px solid var(--ink)" : "0.5px solid var(--rule)",
                    borderBottom: r.isTotal ? "1.4px solid var(--ink)" : undefined,
                    textAlign: "right", fontWeight: 500,
                    fontSize: r.isTotal ? "15pt" : "11.5pt",
                    whiteSpace: "nowrap",
                    color: r.isTotal ? "var(--accent)" : "var(--ink)",
                  }}
                >
                  {r.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SafeBody>
      {s.note && (
        <div
          className="absolute"
          style={{
            left: SAFE.left, right: SAFE.right, bottom: "0.45in",
            fontSize: "8.5pt", color: "var(--ink-mute)", lineHeight: 1.55,
          }}
        >
          {s.note}
        </div>
      )}
    </>
  );
}

function ProseBlock({ section: s, isLandscape }: any) {
  const lh = s.lineHeight || 1.5;
  return (
    <>
      {s.number ? (
        <SectionHead number={s.number} label={s.label} />
      ) : (
        <div
          className="absolute"
          style={{
            top: "1.1in", left: SAFE.left,
            fontSize: "11pt", fontWeight: 500,
            letterSpacing: "2.5px", textTransform: "uppercase",
          }}
        >
          {s.label}
        </div>
      )}
      <SafeBody topOffset={s.number ? "4.0in" : "1.7in"} isLandscape={isLandscape}>
        {s.title && (
          <div
            style={{
              fontSize: "22pt", fontWeight: 300,
              letterSpacing: "-0.5px", lineHeight: 1.2,
              marginBottom: "0.35in", maxWidth: "10in",
            }}
          >
            {richText(s.title)}
          </div>
        )}
        <div style={{ fontSize: "11.5pt", lineHeight: lh, maxWidth: "10in" }}>
          {(s.paragraphs || []).map((p: string, i: number) => (
            <p key={i} style={{ marginBottom: "0.14in" }}>
              {richText(p)}
            </p>
          ))}
        </div>
      </SafeBody>
    </>
  );
}

// ============================================================
// CIERRE
// ============================================================

function ClosingPage({ doc }: { doc: DocumentModel }) {
  const year = doc.meta.date?.match(/\d{4}/)?.[0] || "2026";
  return (
    <div
      className={`doc-page ${doc.orientation}`}
      style={{ background: "#111", color: "#FAFAFA" }}
    >
      <LogoHeader doc={doc} white />
      {/* Cuadrado naranja decorativo */}
      <div
        className="absolute"
        style={{
          right: "0.7in", top: "1.85in",
          width: "0.7in", height: "0.7in",
          background: "var(--accent)", opacity: 0.9,
        }}
      />
      <div
        className="absolute"
        style={{
          left: SAFE.left, top: "2.6in",
          fontSize: "10pt", fontWeight: 500,
          letterSpacing: "2px", textTransform: "uppercase",
          color: "#AAA",
        }}
      >
        Propuesta · {year}
      </div>
      <div
        className="absolute"
        style={{
          left: SAFE.left, right: SAFE.right, top: "3.05in",
          fontSize: "62pt", fontWeight: 300,
          letterSpacing: "-2.2px", lineHeight: 0.95,
        }}
      >
        Estamos preparados<br />
        para hacerlo<br />
        <span style={{ color: "var(--accent)", fontWeight: 500 }}>posible.</span>
      </div>
      <div
        className="absolute flex justify-between"
        style={{
          left: SAFE.left, right: SAFE.right, bottom: "0.7in",
          fontSize: "10pt", fontWeight: 500,
          letterSpacing: "1.5px", textTransform: "uppercase",
          color: "#888", paddingTop: "0.18in",
          borderTop: "0.5px solid #333",
        }}
      >
        <span>La Agencia x Navarra Capital</span>
        <span>{doc.meta.location || "Pamplona · Navarra"}</span>
        <span>{doc.meta.title}</span>
      </div>
    </div>
  );
}
