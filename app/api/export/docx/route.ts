import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import type { DocumentModel, DocSection } from "@/types/document";

export const runtime = "nodejs";
export const maxDuration = 60;

const INK = "111111";
const INK_SOFT = "4A4A4A";
const INK_MUTE = "8A8A8A";
const ACCENT = "D9582B";

// Fuente: Word usará "Halyard" si la tiene el destinatario instalada, si no caerá a la fuente del sistema.
// El DOCX no embebe fuentes con la misma fiabilidad que PDF; documentamos esto al usuario.
const FONT = "Halyard";

function P(text: string, opts: any = {}): Paragraph {
  return new Paragraph({
    spacing: { after: opts.after ?? 200 },
    alignment: opts.alignment,
    children: [
      new TextRun({
        text,
        font: FONT,
        size: opts.size ?? 22, // half-points (22 = 11pt)
        color: opts.color ?? INK,
        bold: opts.bold,
        italics: opts.italic,
        characterSpacing: opts.charSpacing,
      }),
    ],
  });
}

function H(text: string, level: number, color = INK): Paragraph {
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: level === 1 ? 56 : level === 2 ? 36 : 24,
        bold: level !== 3,
        color,
      }),
    ],
  });
}

function Kicker(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        font: FONT,
        size: 16, // 8pt
        color: INK_MUTE,
        bold: true,
        characterSpacing: 30,
      }),
    ],
  });
}

function HRule(): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    border: { bottom: { color: "C4C2BC", style: BorderStyle.SINGLE, size: 4, space: 1 } },
    children: [new TextRun("")],
  });
}

export async function POST(req: NextRequest) {
  const { doc } = (await req.json()) as { doc: DocumentModel };

  const children: Paragraph[] = [];

  // ----- Portada -----
  children.push(Kicker(doc.meta.subtitle || "Propuesta de servicios"));
  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({ text: doc.meta.title.toUpperCase(), font: FONT, size: 22, color: INK, bold: true, characterSpacing: 60 }),
      ],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 480 },
      children: [
        new TextRun({ text: doc.meta.date?.match(/\d{4}/)?.[0] || "2026", font: FONT, size: 240, color: INK }),
        new TextRun({ text: ".", font: FONT, size: 240, color: ACCENT, bold: true }),
      ],
    })
  );
  children.push(HRule());

  if (doc.meta.documentLabel) {
    children.push(Kicker("Documento"));
    children.push(P(doc.meta.documentLabel, { size: 24, bold: true }));
  }
  if (doc.meta.client) {
    children.push(Kicker("Para"));
    children.push(P(doc.meta.client, { size: 24, bold: true }));
  }
  children.push(Kicker("De"));
  children.push(P("La Agencia x Navarra Capital", { size: 24, bold: true, after: 400 }));
  children.push(HRule());

  // ----- Secciones -----
  doc.sections.forEach((s) => {
    renderSectionDocx(s, children);
  });

  // ----- Cierre -----
  children.push(HRule());
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 480 },
      children: [
        new TextRun({ text: "Estamos preparados para hacerlo ", font: FONT, size: 56, color: INK }),
        new TextRun({ text: "posible.", font: FONT, size: 56, color: ACCENT, bold: true }),
      ],
    })
  );

  const document = new Document({
    creator: "La Agencia x Navarra Capital",
    title: doc.meta.title,
    styles: {
      default: {
        document: { run: { font: FONT } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children,
      },
    ],
  });

  const buf = await Packer.toBuffer(document);

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${doc.meta.title || "documento"}.docx"`,
    },
  });
}

function renderSectionDocx(section: DocSection, out: Paragraph[]) {
  switch (section.type) {
    case "intro": {
      out.push(H(`${section.number}  ${section.label}`, 1));
      if (section.lede) out.push(P(section.lede, { size: 28, bold: false }));
      section.columns.forEach((c) => out.push(P(c)));
      break;
    }
    case "objectives":
    case "stakeholders": {
      out.push(H(`${section.number}  ${section.label}`, 1));
      section.items.forEach((it: any) => {
        if (it.num) out.push(P(it.num, { size: 18, color: ACCENT, bold: true }));
        out.push(P(it.title, { size: 24, bold: true }));
        out.push(P(it.body, { color: INK_SOFT }));
      });
      break;
    }
    case "planning": {
      out.push(H(`${section.number}  ${section.label}`, 1));
      section.items.forEach((it: any) => {
        out.push(P(it.kicker.toUpperCase(), { size: 16, bold: true, color: INK_MUTE, charSpacing: 30 }));
        out.push(P(it.title, { size: 32 }));
        out.push(P(it.body));
      });
      break;
    }
    case "services-index": {
      out.push(H(`${section.number}  ${section.label}`, 1));
      out.push(P(section.lede.replace(/\[|\]/g, ""), { size: 28 }));
      section.blocks.forEach((b: any) => {
        out.push(P(`${b.letter} / ${b.title}`, { bold: true, color: ACCENT }));
      });
      break;
    }
    case "service-block": {
      out.push(H(`${section.letter} /  ${section.title}`, 1));
      out.push(Kicker(section.kicker));
      section.items.forEach((it: any) => {
        out.push(P(it.title, { bold: true }));
        out.push(P(it.body, { color: INK_SOFT }));
      });
      break;
    }
    case "budget": {
      out.push(H(`${section.number}  ${section.label}`, 1));
      if (section.tag) out.push(Kicker(section.tag));
      section.groups.forEach((g: any) => {
        out.push(P(g.title.toUpperCase(), { size: 18, bold: true, charSpacing: 30 }));
        g.rows.forEach((r: any) => {
          out.push(P(`${r.concept}     ${r.qty || ""}     ${r.amount}`));
        });
        if (g.subtotal) out.push(P(`Subtotal  ·  ${g.subtotal}`, { bold: true }));
      });
      if (section.note) out.push(P(section.note, { size: 16, color: INK_MUTE }));
      break;
    }
    case "budget-summary": {
      out.push(H(`${section.number}  ${section.label}`, 1));
      section.rows.forEach((r: any) => {
        const prefix = r.isTotal ? "▸ " : "";
        out.push(P(`${prefix}${r.concept}     ${r.detail || ""}     ${r.amount}`, {
          bold: r.isTotal, size: r.isTotal ? 28 : 22,
        }));
      });
      if (section.note) out.push(P(section.note, { size: 16, color: INK_MUTE }));
      break;
    }
    case "prose": {
      if (section.number) out.push(H(`${section.number}  ${section.label}`, 1));
      else out.push(H(section.label, 2));
      if (section.title) out.push(P(section.title, { size: 36 }));
      section.paragraphs.forEach((p) => out.push(P(p)));
      break;
    }
    case "closing": {
      out.push(P(section.title.replace(/\[|\]/g, ""), { size: 48 }));
      break;
    }
  }
}
