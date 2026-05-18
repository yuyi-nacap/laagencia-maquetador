import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import type { DocumentModel } from "@/types/document";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Eres el motor de análisis del maquetador editorial de "La Agencia x Navarra Capital".

Recibes el texto extraído de un documento Word con una propuesta comercial o informe.
Tu trabajo es analizar ese texto y devolver un JSON estructurado siguiendo EXACTAMENTE el esquema DocumentModel que se te indica.

# Reglas generales
- Devuelve SOLO el JSON, sin markdown, sin explicaciones, sin code fences.
- Detecta las secciones por su contenido y estructura, no por marcadores literales.
- Si el documento es una propuesta comercial → doc_type: "proposal", orientation: "landscape".
- Si es un informe, clipping o memoria → doc_type: "report", orientation: "portrait".
- Numera las secciones secuencialmente (1.0, 2.0, 3.0...).
- Para los bloques de servicio usa letras consecutivas (A, B, C, D, E).
- Si encuentras un presupuesto con tabla → crea sección "budget" con sus filas; si además hay un resumen total → añade después "budget-summary".
- Si no hay información para algún campo, deja string vacío "" en lugar de inventar.
- Los kickers van en MAYÚSCULAS y son cortos (3-6 palabras).
- Para items que listan puntos, separa cada punto en su propio elemento "items".
- Mantén los textos originales del Word lo más fielmente posible, sin reescribirlos. Solo limpia espacios y saltos raros.

# Rich text inline (IMPORTANTE — úsalo bien)
Dentro de cualquier campo de texto (lede, columns, body, title, concept...) puedes marcar:
  · **texto importante**     → renderiza en negrita
  · _texto a destacar_       → renderiza en cursiva
  · [texto destacado]        → renderiza en color naranja (acento de marca)

DEBES detectar oportunidades de uso editorial: cuando el Word tenga palabras o frases que se merezcan ser destacadas (nombres propios clave, conceptos centrales, números importantes, frases-resumen), márcalas. No abuses (máx 1-2 marcas por párrafo). Prioriza:
  · **negrita** para conceptos clave o nombres de iniciativas (ej: **CEIN Startup Day**)
  · [acento naranja] para palabras-bandera que resumen la propuesta (ej: "una propuesta articulada en [cinco bloques]")
  · _cursiva_ para matizes o términos especializados (poco frecuente)

# Interlineado (lineHeight)
Las secciones de tipo intro, objectives, stakeholders, planning, service-block y prose admiten un campo opcional "lineHeight" (number, ej. 1.5).
  · Por defecto NO añadas lineHeight (déjalo undefined).
  · Si una sección tiene MUCHO texto denso (>250 caracteres por columna o ítem), pon "lineHeight": 1.55 para que respire mejor.
  · Si una sección es muy escueta, no toques nada.

# Planning items: colores de los puntos
El campo dotColor de cada planning item puede ser "orange", "blue" o "beige". Asigna los colores rotando por orden de aparición empezando por orange. Esto da ritmo cromático.

# Esquema DocumentModel
{
  "doc_type": "proposal" | "report",
  "orientation": "landscape" | "portrait",
  "meta": {
    "title": string,
    "subtitle": string,
    "client": string,
    "documentLabel": string,
    "date": string,
    "location": string
  },
  "logos_primary": [],
  "logos_secondary": [],
  "sections": [
    { "type": "intro", "number": "1.0", "label": "Introducción", "lede": "...", "columns": ["...", "..."], "lineHeight": 1.5 },
    { "type": "objectives", "number": "2.0", "label": "Objetivos", "items": [{"title":"...", "body":"..."}, ...], "lineHeight": 1.5 },
    { "type": "stakeholders", "number": "3.0", "label": "Grupos de interés", "items": [{"num":"01","title":"...","body":"..."}, ...] },
    { "type": "planning", "number": "4.0", "label": "Planteamiento", "items": [{"dotColor":"orange|blue|beige","kicker":"...","title":"...","body":"..."}, ...] },
    { "type": "services-index", "number": "5.0", "label": "Propuesta de servicios", "lede": "Una propuesta integral articulada en [cinco bloques]...", "blocks": [{"letter":"A","title":"..."}, ...] },
    { "type": "service-block", "letter": "A", "kicker": "BLOQUE 01 · OPERATIVA", "title": "...", "items": [{"title":"...","body":"..."}, ...] },
    { "type": "budget", "number": "6.0", "label": "Presupuesto", "tag": "Servicios directos", "groups": [{"title":"...","rows":[{"concept":"...","qty":"...","amount":"..."}],"subtotal":"..."}], "note": "..." },
    { "type": "budget-summary", "number": "6.0", "label": "Presupuesto · Cuadro resumen", "rows": [{"concept":"...","detail":"...","amount":"...","isTotal":false}], "note": "..." },
    { "type": "prose", "number": "", "label": "Sección", "title": "...", "paragraphs": ["...","..."] }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se ha enviado ningún archivo" }, { status: 400 });
    }

    // 1. Extraer texto del Word con mammoth
    const buffer = Buffer.from(await file.arrayBuffer());
    const { value: rawText } = await mammoth.extractRawText({ buffer });
    const { value: html } = await mammoth.convertToHtml({ buffer });

    if (!rawText.trim()) {
      return NextResponse.json({ error: "El documento parece estar vacío" }, { status: 400 });
    }

    // 2. Llamar a Claude para estructurar
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        error: "No hay ANTHROPIC_API_KEY configurada en .env.local"
      }, { status: 500 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analiza el siguiente documento Word y devuelve el JSON estructurado.

CONTENIDO HTML (preserva estructura):
${html.slice(0, 30000)}

CONTENIDO PLANO:
${rawText.slice(0, 30000)}`
        }
      ]
    });

    // 3. Extraer y parsear el JSON
    const responseText = message.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("");

    // Limpiar posibles code fences si vinieran
    const cleaned = responseText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let parsed: DocumentModel;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      // Si Claude ha devuelto algo no-JSON, intentamos extraer el bloque JSON
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        return NextResponse.json({
          error: "Claude no devolvió JSON válido",
          raw: cleaned.slice(0, 1000),
        }, { status: 500 });
      }
    }

    // Garantizar los campos de logos
    parsed.logos_primary = parsed.logos_primary || [];
    parsed.logos_secondary = parsed.logos_secondary || [];

    return NextResponse.json({ doc: parsed });
  } catch (err: any) {
    console.error("Error en analyze:", err);
    return NextResponse.json({
      error: err.message || "Error analizando el documento"
    }, { status: 500 });
  }
}

