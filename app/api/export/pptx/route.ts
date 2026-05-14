import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
import type { DocumentModel, DocSection } from "@/types/document";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 60;

// Paleta
const BG = "EEEDE8";
const INK = "111111";
const INK_SOFT = "4A4A4A";
const INK_MUTE = "8A8A8A";
const ACCENT = "D9582B";
const RULE = "C4C2BC";

function imgBase64(filename: string): string {
  const fp = path.join(process.cwd(), "public", "logos", filename);
  return fs.readFileSync(fp).toString("base64");
}

export async function POST(req: NextRequest) {
  const { doc } = (await req.json()) as { doc: DocumentModel };

  const pres = new PptxGenJS();
  pres.layout = doc.orientation === "landscape" ? "LAYOUT_16x9" : "LAYOUT_USER_PORTRAIT";

  if (doc.orientation === "portrait") {
    pres.defineLayout({ name: "LAYOUT_USER_PORTRAIT", width: 8.27, height: 11.69 });
    pres.layout = "LAYOUT_USER_PORTRAIT";
  }

  // Logos (usados en portada y contraportada)
  const logoLA = `data:image/png;base64,${imgBase64("laagencia-logo.png")}`;
  const logoLAW = `data:image/png;base64,${imgBase64("laagencia-logo-white.png")}`;

  // -------------------- PORTADA --------------------
  {
    const s = pres.addSlide();
    s.background = { color: BG };
    addLogoHeader(s, doc, logoLA, false);

    s.addText(doc.meta.subtitle || "Propuesta", {
      x: 0.7, y: 1.85, w: 6, h: 0.3,
      fontFace: "Halyard", fontSize: 10, color: INK_SOFT, bold: true,
      charSpacing: 1.5,
    });
    s.addText(doc.meta.location || "", {
      x: 6.5, y: 1.85, w: 6, h: 0.3,
      fontFace: "Halyard", fontSize: 10, color: INK_SOFT, bold: true,
      align: "right", charSpacing: 1.5,
    });
    s.addShape(pres.ShapeType.line, {
      x: 0.7, y: 2.4, w: 11.93, h: 0,
      line: { color: INK, width: 0.5 },
    });

    s.addText(doc.meta.title, {
      x: 0.7, y: 2.95, w: 12, h: 0.4,
      fontFace: "Halyard", fontSize: 11, color: INK, bold: true, charSpacing: 3,
    });
    const year = doc.meta.date?.match(/\d{4}/)?.[0] || "2026";
    s.addText([{ text: year, options: {} }, { text: ".", options: { color: ACCENT, bold: true } }], {
      x: 0.7, y: 3.4, w: 12, h: 3,
      fontFace: "Halyard", fontSize: 130, color: INK, charSpacing: -6,
    });

    // Foot row
    addCoverFoot(s, doc, pres);
  }

  // -------------------- SECCIONES --------------------
  doc.sections.forEach((section, idx) => {
    renderSectionSlide(pres, doc, section, idx + 2, doc.sections.length + 2);
  });

  // -------------------- CIERRE --------------------
  {
    const s = pres.addSlide();
    s.background = { color: "111111" };
    addLogoHeader(s, doc, logoLAW, true);
    s.addText("Propuesta · " + (doc.meta.date?.match(/\d{4}/)?.[0] || "2026"), {
      x: 0.7, y: 2.6, w: 6, h: 0.3, fontFace: "Halyard", fontSize: 10, color: "AAAAAA", bold: true, charSpacing: 2,
    });
    s.addText([
      { text: "Estamos preparados\npara hacerlo\n", options: { color: "FAFAFA" } },
      { text: "posible.", options: { color: ACCENT, bold: true } },
    ], {
      x: 0.7, y: 3.05, w: 12, h: 3,
      fontFace: "Halyard", fontSize: 56, charSpacing: -2,
    });
  }

  const buf = await pres.write({ outputType: "nodebuffer" }) as Buffer;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${doc.meta.title || "documento"}.pptx"`,
    },
  });
}

function addLogoHeader(s: any, doc: DocumentModel, laAgenciaB64: string, white: boolean) {
  s.addImage({ data: laAgenciaB64, x: 0.7, y: 0.55, w: 1.95, h: 0.6 });
  s.addShape("line", { x: 2.85, y: 0.6, w: 0, h: 0.5, line: { color: white ? "FAFAFA" : INK, width: 1 } });
  // (los logos primarios que añade el usuario se omiten en PPTX por simplicidad - se pueden añadir como añadido futuro)
  s.addText(doc.meta.date || "", {
    x: 8.5, y: 0.6, w: 4.2, h: 0.4,
    fontFace: "Halyard", fontSize: 10, color: white ? "FAFAFA" : INK,
    align: "right", charSpacing: 0.5,
  });
}

function addCoverFoot(s: any, doc: DocumentModel, pres: PptxGenJS) {
  const baseY = 6.5;
  const colW = 4.0;
  s.addShape(pres.ShapeType.line, {
    x: 0.7, y: baseY - 0.05, w: 11.93, h: 0,
    line: { color: INK, width: 0.5 },
  });
  const cols = [
    { label: "Documento", text: doc.meta.documentLabel || "" },
    { label: "Para", text: doc.meta.client || "" },
    { label: "De", text: "La Agencia x\nNavarra Capital" },
  ];
  cols.forEach((c, i) => {
    s.addText(c.label, {
      x: 0.7 + i * colW, y: baseY + 0.05, w: colW, h: 0.2,
      fontFace: "Halyard", fontSize: 9, color: INK_MUTE, bold: true, charSpacing: 2,
    });
    s.addText(c.text, {
      x: 0.7 + i * colW, y: baseY + 0.3, w: colW - 0.2, h: 0.6,
      fontFace: "Halyard", fontSize: 12, color: INK, bold: true,
    });
  });
}

function renderSectionSlide(
  pres: PptxGenJS,
  doc: DocumentModel,
  section: DocSection,
  pageNum: number,
  total: number,
) {
  const s = pres.addSlide();
  s.background = { color: BG };

  // Topbar
  s.addText(doc.meta.title, {
    x: 0.7, y: 0.4, w: 8, h: 0.2,
    fontFace: "Halyard", fontSize: 9, color: INK_MUTE, charSpacing: 0.8,
  });
  s.addText(`${String(pageNum).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, {
    x: 9, y: 0.4, w: 3.6, h: 0.2,
    fontFace: "Halyard", fontSize: 9, color: INK_MUTE, align: "right", charSpacing: 0.8,
  });
  s.addShape(pres.ShapeType.line, {
    x: 0.7, y: 0.62, w: 11.93, h: 0,
    line: { color: INK, width: 0.4, transparency: 65 },
  });

  switch (section.type) {
    case "intro":
    case "objectives":
    case "stakeholders":
    case "planning":
    case "services-index":
    case "budget-summary":
    case "prose": {
      const numberStr = "number" in section ? section.number : "";
      const labelStr = "label" in section ? section.label : "";
      addSectionHead(s, pres, numberStr, labelStr);
      break;
    }
    case "service-block": {
      addServiceBlockHead(s, section);
      break;
    }
    case "budget": {
      addBudgetHead(s, section);
      break;
    }
    case "closing":
      break;
  }

  // Cuerpo por tipo
  if (section.type === "intro") renderIntroBody(s, section);
  else if (section.type === "objectives") renderItemsBody(s, section.items);
  else if (section.type === "stakeholders") renderItemsBody(s, section.items, true);
  else if (section.type === "planning") renderPlanningBody(s, section.items);
  else if (section.type === "services-index") renderServicesIndexBody(s, section);
  else if (section.type === "service-block") renderServiceBlockBody(s, section.items);
  else if (section.type === "budget") renderBudgetBody(s, pres, section);
  else if (section.type === "budget-summary") renderSummaryBody(s, pres, section);
  else if (section.type === "prose") renderProseBody(s, section);
}

function addSectionHead(s: any, pres: PptxGenJS, num: string, label: string) {
  const [n1, n2] = num.split(".");
  s.addText([
    { text: n1, options: {} },
    { text: ".", options: { color: ACCENT } },
    { text: n2 || "0", options: {} },
  ], {
    x: 0.7, y: 1.0, w: 6, h: 1.6,
    fontFace: "Halyard", fontSize: 90, color: INK, charSpacing: -3.5,
  });
  s.addText(label, {
    x: 0.7, y: 2.7, w: 6, h: 0.3,
    fontFace: "Halyard", fontSize: 11, color: INK, bold: true, charSpacing: 2.5,
  });
}

function addServiceBlockHead(s: any, section: any) {
  s.addText([
    { text: section.letter, options: {} },
    { text: "/", options: { color: ACCENT } },
  ], {
    x: 0.7, y: 1.0, w: 2.5, h: 1.5,
    fontFace: "Halyard", fontSize: 90, color: INK, charSpacing: -3,
  });
  s.addText(section.kicker, {
    x: 2.5, y: 1.5, w: 8, h: 0.3,
    fontFace: "Halyard", fontSize: 10, color: INK_SOFT, bold: true, charSpacing: 2,
  });
  s.addText(section.title, {
    x: 2.5, y: 1.85, w: 9, h: 1,
    fontFace: "Halyard", fontSize: 26, color: INK, charSpacing: -0.6,
  });
}

function addBudgetHead(s: any, section: any) {
  const [n1, n2] = section.number.split(".");
  s.addText([
    { text: n1, options: {} },
    { text: ".", options: { color: ACCENT } },
    { text: n2, options: {} },
  ], {
    x: 0.7, y: 1.0, w: 1.5, h: 0.7, fontFace: "Halyard", fontSize: 36, color: INK, charSpacing: -1.2,
  });
  s.addText(section.label, {
    x: 2.3, y: 1.25, w: 5, h: 0.3, fontFace: "Halyard", fontSize: 9, color: INK, bold: true, charSpacing: 2.5,
  });
  if (section.tag) {
    s.addText(section.tag, {
      x: 8, y: 1.25, w: 4.5, h: 0.3, fontFace: "Halyard", fontSize: 8.5, color: INK_MUTE,
      bold: true, align: "right", charSpacing: 1.5,
    });
  }
}

function renderIntroBody(s: any, section: any) {
  if (section.lede) {
    s.addText(section.lede, {
      x: 0.7, y: 4.0, w: 4.6, h: 2,
      fontFace: "Halyard", fontSize: 16, color: INK,
    });
  }
  section.columns.forEach((col: string, i: number) => {
    s.addText(col, {
      x: section.lede ? 5.5 + i * 3.7 : 0.7 + i * 4, y: 4.0,
      w: section.lede ? 3.5 : 3.8, h: 3,
      fontFace: "Halyard", fontSize: 11.5, color: INK,
    });
  });
}

function renderItemsBody(s: any, items: any[], withNum?: boolean) {
  const cols = Math.min(items.length, 5);
  const w = 12 / cols - 0.1;
  items.forEach((it, i) => {
    const x = 0.7 + i * (w + 0.1);
    s.addShape("line", { x, y: 3.95, w, h: 0, line: { color: INK, width: 0.6 } });
    let y = 4.1;
    if (withNum && it.num) {
      s.addText(it.num, { x, y, w, h: 0.2, fontFace: "Halyard", fontSize: 10, color: ACCENT, bold: true, charSpacing: 1.5 });
      y += 0.25;
    }
    s.addText(it.title, { x, y, w, h: 0.4, fontFace: "Halyard", fontSize: 11, color: INK, bold: true });
    s.addText(it.body, { x, y: y + 0.55, w, h: 2.5, fontFace: "Halyard", fontSize: 10.5, color: INK_SOFT });
  });
}

function renderPlanningBody(s: any, items: any[]) {
  const cols = Math.min(items.length, 3);
  const w = (12 - 0.45 * (cols - 1)) / cols;
  items.forEach((it, i) => {
    const x = 0.7 + i * (w + 0.45);
    const dotColor = it.dotColor === "orange" ? ACCENT : it.dotColor === "blue" ? "8FA9B3" : "C7C5A8";
    s.addShape("ellipse", { x, y: 3.95, w: 0.18, h: 0.18, fill: { color: dotColor }, line: { color: dotColor } });
    s.addText(it.kicker, { x: x + 0.25, y: 3.95, w: w - 0.25, h: 0.2, fontFace: "Halyard", fontSize: 9, color: INK, bold: true, charSpacing: 1.5 });
    s.addText(it.title, { x, y: 4.3, w, h: 0.5, fontFace: "Halyard", fontSize: 15, color: INK });
    s.addText(it.body, { x, y: 4.95, w, h: 2.5, fontFace: "Halyard", fontSize: 11, color: INK });
  });
}

function renderServicesIndexBody(s: any, section: any) {
  s.addText(section.lede.replace(/\[|\]/g, ""), {
    x: 0.7, y: 4.0, w: 11, h: 1,
    fontFace: "Halyard", fontSize: 23, color: INK, charSpacing: -0.5,
  });
  const cols = section.blocks.length;
  const w = (12 - 0.3 * (cols - 1)) / cols;
  section.blocks.forEach((b: any, i: number) => {
    const x = 0.7 + i * (w + 0.3);
    s.addShape("line", { x, y: 5.4, w, h: 0, line: { color: ACCENT, width: 1.5 } });
    s.addText(`${b.letter} /`, { x, y: 5.5, w, h: 0.2, fontFace: "Halyard", fontSize: 10, color: ACCENT, bold: true, charSpacing: 2 });
    s.addText(b.title, { x, y: 5.7, w, h: 0.5, fontFace: "Halyard", fontSize: 11, color: INK, bold: true });
  });
}

function renderServiceBlockBody(s: any, items: any[]) {
  const half = Math.ceil(items.length / 2);
  items.forEach((it, i) => {
    const col = i < half ? 0 : 1;
    const row = i % half;
    const x = 0.7 + col * 6;
    const y = 4.05 + row * 1;
    s.addShape("line", { x, y, w: 5.6, h: 0, line: { color: INK, width: 0.6 } });
    s.addText(it.title, { x, y: y + 0.1, w: 5.6, h: 0.3, fontFace: "Halyard", fontSize: 11, color: INK, bold: true });
    s.addText(it.body, { x, y: y + 0.4, w: 5.6, h: 0.6, fontFace: "Halyard", fontSize: 10.5, color: INK_SOFT });
  });
}

function renderBudgetBody(s: any, pres: PptxGenJS, section: any) {
  let y = 2.0;
  section.groups.forEach((g: any) => {
    s.addText(g.title, { x: 0.7, y, w: 11.9, h: 0.25, fontFace: "Halyard", fontSize: 9, color: INK, bold: true, charSpacing: 1.8 });
    y += 0.25;
    g.rows.forEach((r: any) => {
      s.addText(r.concept, { x: 0.7, y, w: 7.5, h: 0.2, fontFace: "Halyard", fontSize: 10.5, color: INK });
      s.addText(r.qty || "", { x: 8.2, y, w: 1.8, h: 0.2, fontFace: "Halyard", fontSize: 10, color: INK_MUTE, align: "right" });
      s.addText(r.amount, { x: 10.5, y, w: 2.1, h: 0.2, fontFace: "Halyard", fontSize: 10.5, color: INK, align: "right" });
      y += 0.22;
    });
    if (g.subtotal) {
      s.addShape(pres.ShapeType.line, { x: 0.7, y, w: 11.9, h: 0, line: { color: INK, width: 0.6 } });
      y += 0.05;
      s.addText("Subtotal", { x: 0.7, y, w: 7.5, h: 0.2, fontFace: "Halyard", fontSize: 10.5, color: INK, bold: true });
      s.addText(g.subtotal, { x: 10.5, y, w: 2.1, h: 0.2, fontFace: "Halyard", fontSize: 10.5, color: INK, bold: true, align: "right" });
      y += 0.3;
    }
  });
  if (section.note) {
    s.addText(section.note, { x: 0.7, y: 6.8, w: 11.9, h: 0.5, fontFace: "Halyard", fontSize: 8.5, color: INK_MUTE });
  }
}

function renderSummaryBody(s: any, pres: PptxGenJS, section: any) {
  let y = 3.05;
  section.rows.forEach((r: any) => {
    const isTotal = r.isTotal;
    s.addShape(pres.ShapeType.line, { x: 0.7, y, w: 11.9, h: 0, line: { color: isTotal ? INK : RULE, width: isTotal ? 1.4 : 0.5 } });
    y += 0.05;
    s.addText(r.concept, { x: 0.7, y, w: 6, h: 0.3, fontFace: "Halyard", fontSize: isTotal ? 13 : 11.5, color: INK, bold: isTotal });
    s.addText(r.detail || "", { x: 6.8, y, w: 4, h: 0.3, fontFace: "Halyard", fontSize: 10.5, color: INK_MUTE });
    s.addText(r.amount, { x: 10.5, y, w: 2.1, h: 0.3, fontFace: "Halyard", fontSize: isTotal ? 15 : 11.5, color: INK, bold: true, align: "right" });
    y += isTotal ? 0.4 : 0.32;
  });
  if (section.note) {
    s.addText(section.note, { x: 0.7, y: 6.8, w: 11.9, h: 0.6, fontFace: "Halyard", fontSize: 8.5, color: INK_MUTE });
  }
}

function renderProseBody(s: any, section: any) {
  let y = 4.0;
  if (section.title) {
    s.addText(section.title, { x: 0.7, y, w: 11.9, h: 0.8, fontFace: "Halyard", fontSize: 22, color: INK, charSpacing: -0.5 });
    y += 0.9;
  }
  s.addText(section.paragraphs.join("\n\n"), {
    x: 0.7, y, w: 11.9, h: 5, fontFace: "Halyard", fontSize: 11.5, color: INK,
  });
}
