import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { DocumentModel, DocSection } from "@/types/document";

export const runtime = "nodejs";
export const maxDuration = 60;

// Lanzador de Puppeteer adaptado al entorno:
//   · En Vercel/serverless: puppeteer-core + @sparticuz/chromium (ligero)
//   · En local: puppeteer completo (descarga su propio Chromium)
async function launchBrowser() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = await import("puppeteer-core");
    return puppeteerCore.default.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } else {
    const puppeteer = await import("puppeteer");
    return puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
}

// ============================================================
// HTML del documento como string puro.
// Soporta:
//   · rich text inline: **negrita**, _cursiva_, [acento]
//   · paginación automática de secciones que no caben
// ============================================================

// ============================================================
// PAGINACIÓN AUTOMÁTICA
// Si una sección tiene más contenido del que cabe en una página,
// la dividimos en varias secciones consecutivas del mismo tipo.
// Las reglas (maxRowsPerPage, maxItems) están calibradas
// empíricamente para 16:9 a 7.5in y A4 a 11.69in.
// ============================================================

function expandSections(sections: DocSection[], isLandscape: boolean): DocSection[] {
  const out: DocSection[] = [];
  for (const s of sections) {
    out.push(...splitSection(s, isLandscape));
  }
  return out;
}

function splitSection(s: DocSection, isLandscape: boolean): DocSection[] {
  if (s.type === "budget") {
    const maxRowsPerPage = isLandscape ? 24 : 32;
    const groups = s.groups || [];
    const totalRows = groups.reduce(
      (acc, g) => acc + 1 + g.rows.length + (g.subtotal ? 1 : 0),
      0
    );
    if (totalRows <= maxRowsPerPage) return [s];

    const pages: DocSection[] = [];
    let currentGroups: typeof groups = [];
    let currentCount = 0;
    for (const g of groups) {
      const gRows = 1 + g.rows.length + (g.subtotal ? 1 : 0);
      if (currentCount + gRows > maxRowsPerPage && currentGroups.length > 0) {
        pages.push({ ...s, groups: currentGroups, note: undefined });
        currentGroups = [];
        currentCount = 0;
      }
      if (gRows > maxRowsPerPage) {
        const chunkSize = maxRowsPerPage - 2;
        for (let i = 0; i < g.rows.length; i += chunkSize) {
          const slice = g.rows.slice(i, i + chunkSize);
          const isLast = i + chunkSize >= g.rows.length;
          pages.push({
            ...s,
            groups: [{
              title: i === 0 ? g.title : g.title + " (cont.)",
              rows: slice,
              subtotal: isLast ? g.subtotal : undefined,
            }],
            note: undefined,
          });
        }
        currentGroups = [];
        currentCount = 0;
      } else {
        currentGroups.push(g);
        currentCount += gRows;
      }
    }
    if (currentGroups.length > 0) {
      pages.push({ ...s, groups: currentGroups });
    } else if (s.note && pages.length > 0) {
      pages[pages.length - 1] = { ...pages[pages.length - 1], note: s.note } as any;
    }
    return pages.length > 0 ? pages : [s];
  }

  if (s.type === "budget-summary") {
    const maxRows = isLandscape ? 12 : 18;
    if ((s.rows?.length || 0) <= maxRows) return [s];
    const pages: DocSection[] = [];
    for (let i = 0; i < s.rows.length; i += maxRows) {
      const slice = s.rows.slice(i, i + maxRows);
      const isLast = i + maxRows >= s.rows.length;
      pages.push({ ...s, rows: slice, note: isLast ? s.note : undefined });
    }
    return pages;
  }

  if (s.type === "objectives") {
    const maxItems = isLandscape ? 5 : 4;
    if ((s.items?.length || 0) <= maxItems) return [s];
    const pages: DocSection[] = [];
    for (let i = 0; i < s.items.length; i += maxItems) {
      pages.push({ ...s, items: s.items.slice(i, i + maxItems) });
    }
    return pages;
  }

  if (s.type === "stakeholders") {
    const maxItems = isLandscape ? 4 : 4;
    if ((s.items?.length || 0) <= maxItems) return [s];
    const pages: DocSection[] = [];
    for (let i = 0; i < s.items.length; i += maxItems) {
      pages.push({ ...s, items: s.items.slice(i, i + maxItems) });
    }
    return pages;
  }

  if (s.type === "service-block") {
    const maxItems = isLandscape ? 6 : 5;
    if ((s.items?.length || 0) <= maxItems) return [s];
    const pages: DocSection[] = [];
    for (let i = 0; i < s.items.length; i += maxItems) {
      pages.push({ ...s, items: s.items.slice(i, i + maxItems) });
    }
    return pages;
  }

  if (s.type === "prose") {
    const maxParagraphs = isLandscape ? 8 : 14;
    if ((s.paragraphs?.length || 0) <= maxParagraphs) return [s];
    const pages: DocSection[] = [];
    for (let i = 0; i < s.paragraphs.length; i += maxParagraphs) {
      pages.push({
        ...s,
        title: i === 0 ? s.title : undefined,
        paragraphs: s.paragraphs.slice(i, i + maxParagraphs),
      });
    }
    return pages;
  }

  if (s.type === "planning") {
    const maxItems = isLandscape ? 3 : 2;
    if ((s.items?.length || 0) <= maxItems) return [s];
    const pages: DocSection[] = [];
    for (let i = 0; i < s.items.length; i += maxItems) {
      pages.push({ ...s, items: s.items.slice(i, i + maxItems) });
    }
    return pages;
  }

  return [s];
}

function fontBase64(filename: string): string {
  const fp = path.join(process.cwd(), "public", "fonts", filename);
  return fs.readFileSync(fp).toString("base64");
}
function logoBase64(filename: string): string {
  const fp = path.join(process.cwd(), "public", "logos", filename);
  return fs.readFileSync(fp).toString("base64");
}

function esc(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// rich text inline → HTML
function rt(text: string | undefined | null): string {
  if (!text) return "";
  // Primero hacemos escape global de < y >, pero respetamos los marcadores luego
  let s = esc(text);
  // **negrita**
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight:500;">$1</strong>');
  // _cursiva_
  s = s.replace(/_([^_]+)_/g, '<em style="font-style:italic;">$1</em>');
  // [acento]
  s = s.replace(/\[([^\]]+)\]/g, '<span style="color:var(--accent);font-weight:500;">$1</span>');
  return s;
}

function paragraphs(text: string, lineHeight: number = 1.45): string {
  if (!text) return "";
  return text
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((p) => `<p style="margin-bottom:0.14in;line-height:${lineHeight};">${rt(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function safeBodyStyle(topOffset: string, isLandscape: boolean, extraBottom: string = "0in"): string {
  // El split garantiza que el contenido cabe; solo posicionamos.
  return `position:absolute;left:0.7in;right:0.7in;top:${topOffset};`;
}

// ============================================================
// Bloques
// ============================================================

function renderCover(doc: DocumentModel, assets: Assets): string {
  const isLandscape = doc.orientation === "landscape";
  const year = doc.meta.date?.match(/\d{4}/)?.[0] || "2026";

  return `
<section class="doc-page ${doc.orientation}">
  ${renderLogoHeader(doc, assets, false)}
  <div style="position:absolute;display:flex;justify-content:space-between;top:${isLandscape ? "1.85in" : "2.2in"};left:0.7in;right:0.7in;font-size:10pt;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-soft);font-weight:500;">
    <span>${esc(doc.meta.subtitle || "Propuesta")}</span>
    <span>${esc(doc.meta.location || "")}</span>
  </div>
  <div style="position:absolute;top:${isLandscape ? "2.4in" : "2.75in"};left:0.7in;right:0.7in;height:0.5px;background:var(--ink);"></div>
  <div style="position:absolute;left:0.7in;right:0.7in;top:${isLandscape ? "2.95in" : "3.5in"};">
    <div style="font-size:11pt;font-weight:500;letter-spacing:3px;text-transform:uppercase;margin-bottom:0.4in;">${esc(doc.meta.title)}</div>
    <div style="font-size:${isLandscape ? "148pt" : "110pt"};font-weight:300;letter-spacing:${isLandscape ? "-6px" : "-4px"};line-height:0.85;">
      ${year}<span style="color:var(--accent);font-weight:500;">.</span>
    </div>
  </div>
  <div style="position:absolute;left:0.7in;right:0.7in;bottom:0.65in;padding-top:0.22in;border-top:0.5px solid var(--ink);display:grid;grid-template-columns:1fr 1fr 1fr;column-gap:0.5in;">
    ${footCol("Documento", doc.meta.documentLabel || "")}
    ${footCol("Para", doc.meta.client || "")}
    ${footCol("De", "La Agencia x<br/>Navarra Capital")}
  </div>
</section>`;
}

function footCol(label: string, text: string): string {
  return `
<div>
  <div style="font-size:9pt;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:var(--ink-mute);margin-bottom:0.1in;">${esc(label)}</div>
  <div style="font-size:12.5pt;font-weight:500;line-height:1.3;">${text}</div>
</div>`;
}

function renderLogoHeader(doc: DocumentModel, assets: Assets, white: boolean): string {
  const la = white ? assets.logoLAW : assets.logoLA;
  const sepColor = white ? "#FAFAFA" : "var(--ink)";
  const primaryHtml = (doc.logos_primary || []).map((l) =>
    `<div style="width:1.1px;height:0.5in;background:${sepColor};flex-shrink:0;"></div>
     <img src="${esc(l.url)}" alt="${esc(l.name)}" style="height:0.66in;"/>`
  ).join("");
  const secondaryHtml = (doc.logos_secondary || []).length > 0
    ? `<div style="width:1.1px;height:0.4in;background:${sepColor};flex-shrink:0;opacity:0.5;"></div>` +
      (doc.logos_secondary || []).map((l) =>
        `<img src="${esc(l.url)}" alt="${esc(l.name)}" style="height:0.5in;opacity:0.85;"/>`
      ).join("")
    : "";

  return `
<div style="position:absolute;display:flex;justify-content:space-between;align-items:center;top:0.55in;left:0.7in;right:0.7in;height:0.75in;">
  <div style="display:flex;align-items:center;gap:0.28in;height:100%;">
    <img src="${la}" alt="LaAgencia" style="height:0.6in;"/>
    ${primaryHtml}
    ${secondaryHtml}
  </div>
  <div style="font-size:10.5pt;color:${white ? "#FAFAFA" : "var(--ink)"};letter-spacing:0.5px;">
    ${esc(doc.meta.date || "")}
  </div>
</div>`;
}

function renderTopbar(folio: string, pageNum: number, total: number): string {
  return `
<div style="position:absolute;display:flex;justify-content:space-between;top:0.4in;left:0.7in;right:0.7in;font-size:9pt;color:var(--ink-mute);letter-spacing:0.8px;text-transform:uppercase;">
  <span>${esc(folio)}</span>
  <span>${String(pageNum).padStart(2, "0")} / ${String(total).padStart(2, "0")}</span>
</div>
<div style="position:absolute;top:0.62in;left:0.7in;right:0.7in;height:0.4px;background:var(--ink);opacity:0.35;"></div>`;
}

function renderSectionHead(number: string, label: string): string {
  const [n1, n2] = number.split(".");
  return `
<div style="position:absolute;top:1.05in;left:0.7in;right:0.7in;">
  <div style="font-weight:300;font-size:90pt;line-height:0.85;letter-spacing:-3.5px;">
    ${esc(n1)}<span style="color:var(--accent);">.</span>${esc(n2 || "0")}
  </div>
  <div style="font-weight:500;font-size:11pt;letter-spacing:2.5px;text-transform:uppercase;margin-top:0.15in;">
    ${esc(label)}
  </div>
</div>`;
}

function renderIntro(s: any, isLandscape: boolean): string {
  const numCols = s.columns.length;
  const grid = numCols === 1 ? "1fr" : s.lede ? "4.6in 1fr 1fr" : `repeat(${Math.min(numCols, 3)}, 1fr)`;
  const lh = s.lineHeight || 1.45;
  return `
${renderSectionHead(s.number, s.label)}
<div style="${safeBodyStyle(isLandscape ? "4.0in" : "5.0in", isLandscape)}">
  <div style="display:grid;grid-template-columns:${grid};column-gap:0.5in;">
    ${s.lede ? `<div style="font-size:16pt;font-weight:400;line-height:1.35;letter-spacing:-0.2px;">${rt(s.lede)}</div>` : ""}
    ${s.columns.map((col: string) => `<div style="font-size:11.5pt;line-height:${lh};">${paragraphs(col, lh)}</div>`).join("")}
  </div>
</div>`;
}

function renderObjectives(s: any, isLandscape: boolean): string {
  const cols = isLandscape ? Math.min(s.items.length, 5) : Math.min(s.items.length, 2);
  const lh = s.lineHeight || 1.4;
  const palette = ["var(--accent)", "var(--dot-blue)", "var(--dot-beige)"];

  return `
${renderSectionHead(s.number, s.label)}
<div style="${safeBodyStyle("3.95in", isLandscape)}">
  <div style="display:grid;grid-template-columns:repeat(${cols},1fr);column-gap:0.35in;row-gap:0.45in;">
    ${s.items.map((it: any, i: number) => {
      const barColor = palette[i % palette.length];
      return `
      <div style="position:relative;padding-top:0.16in;">
        <div style="position:absolute;top:0;left:0;width:0.3in;height:2px;background:${barColor};"></div>
        <div style="position:absolute;top:0;left:0.35in;right:0;border-top:0.6px solid var(--ink);"></div>
        <div style="font-size:11pt;font-weight:500;line-height:1.3;margin-bottom:0.15in;letter-spacing:0.3px;">${rt(it.title)}</div>
        <div style="font-size:10.5pt;line-height:${lh};color:var(--ink-soft);">${rt(it.body)}</div>
      </div>`;
    }).join("")}
  </div>
</div>`;
}

function renderStakeholders(s: any, isLandscape: boolean): string {
  const cols = isLandscape ? Math.min(s.items.length, 4) : 2;
  const lh = s.lineHeight || 1.4;
  return `
${renderSectionHead(s.number, s.label)}
<div style="${safeBodyStyle("4.0in", isLandscape)}">
  <div style="display:grid;grid-template-columns:repeat(${cols},1fr);column-gap:0.4in;row-gap:0.5in;">
    ${s.items.map((it: any) => `
      <div style="border-top:0.6px solid var(--ink);padding-top:0.16in;">
        ${it.num ? `<div style="font-size:10pt;font-weight:500;color:var(--accent);letter-spacing:1.5px;margin-bottom:0.1in;">${esc(it.num)}</div>` : ""}
        <div style="font-size:11pt;font-weight:500;line-height:1.3;margin-bottom:0.15in;">${rt(it.title)}</div>
        <div style="font-size:10.5pt;line-height:${lh};color:var(--ink-soft);">${rt(it.body)}</div>
      </div>`).join("")}
  </div>
</div>`;
}

function renderPlanning(s: any, isLandscape: boolean): string {
  const cols = isLandscape ? Math.min(s.items.length, 3) : 1;
  const lh = s.lineHeight || 1.4;
  return `
${renderSectionHead(s.number, s.label)}
<div style="${safeBodyStyle("3.95in", isLandscape)}">
  <div style="display:grid;grid-template-columns:repeat(${cols},1fr);column-gap:0.45in;row-gap:0.5in;">
    ${s.items.map((it: any) => {
      const dotColor = it.dotColor === "orange" ? "var(--accent)" : it.dotColor === "blue" ? "var(--dot-blue)" : "var(--dot-beige)";
      return `
      <div>
        <div style="display:flex;align-items:center;gap:0.15in;margin-bottom:0.15in;">
          <div style="width:0.22in;height:0.22in;background:${dotColor};"></div>
          <div style="font-size:9pt;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;">${esc(it.kicker)}</div>
        </div>
        <div style="font-size:15pt;font-weight:400;line-height:1.2;margin-bottom:0.18in;letter-spacing:-0.3px;">${rt(it.title)}</div>
        <div style="font-size:11pt;line-height:${lh};">${paragraphs(it.body, lh)}</div>
      </div>`;
    }).join("")}
  </div>
</div>`;
}

function renderServicesIndex(s: any, isLandscape: boolean): string {
  const palette = ["var(--accent)", "var(--dot-blue)", "var(--dot-beige)", "var(--accent)", "var(--dot-blue)"];
  return `
${renderSectionHead(s.number, s.label)}
<div style="${safeBodyStyle(isLandscape ? "4.0in" : "5.0in", isLandscape)}">
  <div style="font-size:23pt;font-weight:300;line-height:1.2;letter-spacing:-0.5px;max-width:8.5in;margin-bottom:0.45in;">
    ${rt(s.lede)}
  </div>
  <div style="display:grid;grid-template-columns:repeat(${s.blocks.length},1fr);column-gap:0.3in;">
    ${s.blocks.map((b: any, i: number) => {
      const color = palette[i % palette.length];
      return `
      <div style="border-top:1.5px solid ${color};padding-top:0.16in;">
        <div style="font-size:10pt;font-weight:500;letter-spacing:2px;color:${color};margin-bottom:0.06in;">${esc(b.letter)} /</div>
        <div style="font-size:11pt;font-weight:500;line-height:1.25;">${rt(b.title)}</div>
      </div>`;
    }).join("")}
  </div>
</div>`;
}

function renderServiceBlock(s: any, isLandscape: boolean): string {
  const lh = s.lineHeight || 1.4;
  return `
<div style="position:absolute;display:flex;align-items:baseline;left:0.7in;top:1.15in;gap:0.4in;">
  <div style="font-size:90pt;font-weight:300;letter-spacing:-3px;line-height:0.85;">
    ${esc(s.letter)}<span style="color:var(--accent);font-weight:300;">/</span>
  </div>
  <div style="padding-top:0.5in;">
    <div style="font-size:10pt;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:var(--ink-soft);margin-bottom:0.08in;">${esc(s.kicker)}</div>
    <div style="font-size:26pt;font-weight:400;letter-spacing:-0.6px;line-height:1.1;max-width:7.5in;">${rt(s.title)}</div>
  </div>
</div>
<div style="${safeBodyStyle("4.05in", isLandscape)}">
  <div style="display:grid;grid-template-columns:${isLandscape ? "1fr 1fr" : "1fr"};column-gap:0.5in;row-gap:0.30in;">
    ${s.items.map((it: any) => `
      <div style="border-top:0.6px solid var(--ink);padding-top:0.16in;">
        <div style="font-size:11pt;font-weight:500;letter-spacing:0.3px;margin-bottom:0.08in;">${rt(it.title)}</div>
        <div style="font-size:10.5pt;line-height:${lh};color:var(--ink-soft);">${rt(it.body)}</div>
      </div>`).join("")}
  </div>
</div>`;
}

function renderBudget(s: any, isLandscape: boolean): string {
  const [n1, n2] = s.number.split(".");
  const bottomExtra = s.note ? "0.7in" : "0in";
  return `
<div style="position:absolute;left:0.7in;top:1.1in;">
  <div style="display:flex;align-items:baseline;gap:0.35in;">
    <div style="font-size:36pt;font-weight:300;letter-spacing:-1.2px;line-height:1;">
      ${esc(n1)}<span style="color:var(--accent);">.</span>${esc(n2 || "0")}
    </div>
    <div style="font-size:9pt;font-weight:500;letter-spacing:2.5px;text-transform:uppercase;">${esc(s.label)}</div>
  </div>
</div>
${s.tag ? `<div style="position:absolute;right:0.7in;top:1.2in;font-size:8.5pt;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-mute);">${esc(s.tag)}</div>` : ""}

<div style="${safeBodyStyle("2.0in", isLandscape, bottomExtra)}">
  <table style="width:100%;border-collapse:collapse;font-size:10.5pt;">
    <tbody>
      ${s.groups.map((g: any, gi: number) => `
        <tr><td colspan="3" style="padding:${gi === 0 ? "0" : "0.13in"} 0 0.04in 0;font-weight:500;font-size:9pt;letter-spacing:1.8px;text-transform:uppercase;">
          <span style="display:inline-block;width:0.18in;height:0.18in;background:var(--accent);margin-right:0.12in;vertical-align:-2px;"></span>${esc(g.title)}
        </td></tr>
        ${g.rows.map((r: any) => `
          <tr>
            <td style="padding:0.05in 0;vertical-align:top;">${rt(r.concept)}</td>
            <td style="padding:0.05in 0.5in 0.05in 0;color:var(--ink-mute);text-align:right;width:1.8in;font-size:10pt;">${esc(r.qty || "")}</td>
            <td style="padding:0.05in 0;text-align:right;white-space:nowrap;width:1.3in;">${esc(r.amount)}</td>
          </tr>`).join("")}
        ${g.subtotal ? `
          <tr>
            <td style="border-top:0.6px solid var(--ink);font-weight:500;padding:0.09in 0;">Subtotal</td>
            <td style="border-top:0.6px solid var(--ink);padding:0.09in 0;"></td>
            <td style="border-top:0.6px solid var(--ink);font-weight:500;padding:0.09in 0;text-align:right;">${esc(g.subtotal)}</td>
          </tr>` : ""}
      `).join("")}
    </tbody>
  </table>
</div>

${s.note ? `
<div style="position:absolute;left:0.7in;right:0.7in;bottom:0.5in;padding-top:0.18in;border-top:0.5px solid var(--rule);font-size:8.5pt;color:var(--ink-mute);line-height:1.5;">
  ${esc(s.note)}
</div>` : ""}`;
}

function renderBudgetSummary(s: any, isLandscape: boolean): string {
  const bottomExtra = s.note ? "0.8in" : "0in";
  return `
${renderSectionHead(s.number, s.label)}
<div style="${safeBodyStyle("3.05in", isLandscape, bottomExtra)}">
  <table style="width:100%;border-collapse:collapse;font-size:11.5pt;">
    <tbody>
      ${s.rows.map((r: any) => `
        <tr>
          <td style="padding:${r.isTotal ? "0.16in" : "0.11in"} 0;border-top:${r.isTotal ? "1.4px" : "0.5px"} solid ${r.isTotal ? "var(--ink)" : "var(--rule)"};${r.isTotal ? "border-bottom:1.4px solid var(--ink);" : ""}font-weight:${r.isTotal ? 500 : 400};font-size:${r.isTotal ? "13pt" : "11.5pt"};">${rt(r.concept)}</td>
          <td style="padding:${r.isTotal ? "0.16in" : "0.11in"} 0;border-top:${r.isTotal ? "1.4px" : "0.5px"} solid ${r.isTotal ? "var(--ink)" : "var(--rule)"};${r.isTotal ? "border-bottom:1.4px solid var(--ink);" : ""}color:var(--ink-mute);font-size:10.5pt;">${esc(r.detail || "")}</td>
          <td style="padding:${r.isTotal ? "0.16in" : "0.11in"} 0;border-top:${r.isTotal ? "1.4px" : "0.5px"} solid ${r.isTotal ? "var(--ink)" : "var(--rule)"};${r.isTotal ? "border-bottom:1.4px solid var(--ink);" : ""}text-align:right;font-weight:500;font-size:${r.isTotal ? "15pt" : "11.5pt"};white-space:nowrap;color:${r.isTotal ? "var(--accent)" : "var(--ink)"};">${esc(r.amount)}</td>
        </tr>`).join("")}
    </tbody>
  </table>
</div>
${s.note ? `<div style="position:absolute;left:0.7in;right:0.7in;bottom:0.45in;font-size:8.5pt;color:var(--ink-mute);line-height:1.55;">${esc(s.note)}</div>` : ""}`;
}

function renderProse(s: any, isLandscape: boolean): string {
  const lh = s.lineHeight || 1.5;
  return `
${s.number
    ? renderSectionHead(s.number, s.label)
    : `<div style="position:absolute;top:1.1in;left:0.7in;font-size:11pt;font-weight:500;letter-spacing:2.5px;text-transform:uppercase;">${esc(s.label)}</div>`}
<div style="${safeBodyStyle(s.number ? "4.0in" : "1.7in", isLandscape)}">
  ${s.title ? `<div style="font-size:22pt;font-weight:300;letter-spacing:-0.5px;line-height:1.2;margin-bottom:0.35in;max-width:10in;">${rt(s.title)}</div>` : ""}
  <div style="font-size:11.5pt;line-height:${lh};max-width:10in;">
    ${(s.paragraphs || []).map((p: string) => `<p style="margin-bottom:0.14in;">${rt(p)}</p>`).join("")}
  </div>
</div>`;
}

function renderClosing(doc: DocumentModel, assets: Assets): string {
  const year = doc.meta.date?.match(/\d{4}/)?.[0] || "2026";
  return `
<section class="doc-page ${doc.orientation}" style="background:#111;color:#FAFAFA;">
  ${renderLogoHeader(doc, assets, true)}
  <div style="position:absolute;left:0.7in;top:2.6in;font-size:10pt;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:#AAA;">Propuesta · ${year}</div>
  <div style="position:absolute;left:0.7in;right:0.7in;top:3.05in;font-size:62pt;font-weight:300;letter-spacing:-2.2px;line-height:0.95;">
    Estamos preparados<br/>para hacerlo<br/>
    <span style="color:var(--accent);font-weight:500;">posible.</span>
  </div>
  <div style="position:absolute;display:flex;justify-content:space-between;left:0.7in;right:0.7in;bottom:0.7in;font-size:10pt;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;color:#888;padding-top:0.18in;border-top:0.5px solid #333;">
    <span>La Agencia x Navarra Capital</span>
    <span>${esc(doc.meta.location || "Pamplona · Navarra")}</span>
    <span>${esc(doc.meta.title)}</span>
  </div>
</section>`;
}

function renderSection(doc: DocumentModel, section: DocSection, pageNum: number, total: number): string {
  const isLandscape = doc.orientation === "landscape";
  let inner = "";
  switch (section.type) {
    case "intro": inner = renderIntro(section, isLandscape); break;
    case "objectives": inner = renderObjectives(section, isLandscape); break;
    case "stakeholders": inner = renderStakeholders(section, isLandscape); break;
    case "planning": inner = renderPlanning(section, isLandscape); break;
    case "services-index": inner = renderServicesIndex(section, isLandscape); break;
    case "service-block": inner = renderServiceBlock(section, isLandscape); break;
    case "budget": inner = renderBudget(section, isLandscape); break;
    case "budget-summary": inner = renderBudgetSummary(section, isLandscape); break;
    case "prose": inner = renderProse(section, isLandscape); break;
    case "closing": inner = ""; break;
  }
  return `
<section class="doc-page ${doc.orientation}">
  ${renderTopbar(doc.meta.title, pageNum, total)}
  ${inner}
</section>`;
}

interface Assets {
  logoLA: string;
  logoLAW: string;
  fLight: string;
  fReg: string;
  fMed: string;
}

function buildHTML(doc: DocumentModel): string {
  const assets: Assets = {
    logoLA: `data:image/png;base64,${logoBase64("laagencia-logo.png")}`,
    logoLAW: `data:image/png;base64,${logoBase64("laagencia-logo-white.png")}`,
    fLight: `data:font/ttf;base64,${fontBase64("HalyardDisplayLight-Regular.ttf")}`,
    fReg: `data:font/ttf;base64,${fontBase64("HalyardDisplay-Regular.ttf")}`,
    fMed: `data:font/ttf;base64,${fontBase64("HalyardDisplayMedium-Regular.ttf")}`,
  };

  const isLandscape = doc.orientation === "landscape";
  const pageSize = isLandscape ? "13.333in 7.5in" : "8.27in 11.69in";

  // Expandir secciones que no caben en una página (mismas reglas que el renderer)
  const expanded = expandSections(doc.sections || [], isLandscape);
  const total = expanded.length + 2;

  const sectionsHTML = expanded
    .map((s, i) => renderSection(doc, s, i + 2, total))
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<style>
@font-face { font-family: 'Halyard'; src: url('${assets.fLight}') format('truetype'); font-weight: 300; }
@font-face { font-family: 'Halyard'; src: url('${assets.fReg}')   format('truetype'); font-weight: 400; }
@font-face { font-family: 'Halyard'; src: url('${assets.fMed}')   format('truetype'); font-weight: 500; }

@page { size: ${pageSize}; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #EEEDE8; --ink: #111; --ink-soft: #4A4A4A; --ink-mute: #8A8A8A;
  --rule: #C4C2BC; --accent: #D9582B; --dot-blue: #8FA9B3; --dot-beige: #C7C5A8;
}
html, body { font-family: 'Halyard', sans-serif; color: var(--ink); background: var(--bg); -webkit-font-smoothing: antialiased; }
.doc-page { position: relative; background: var(--bg); overflow: hidden; page-break-after: always; }
.doc-page.landscape { width: 13.333in; height: 7.5in; }
.doc-page.portrait { width: 8.27in; height: 11.69in; }
.doc-page:last-child { page-break-after: auto; }
table { border-collapse: collapse; }
</style>
</head>
<body>
${renderCover(doc, assets)}
${sectionsHTML}
${renderClosing(doc, assets)}
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const { doc } = (await req.json()) as { doc: DocumentModel };

  const html = buildHTML(doc);

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");

    const pdf = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
    });

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${doc.meta.title || "documento"}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
