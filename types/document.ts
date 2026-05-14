// Modelo del documento del maquetador

export type DocType = "proposal" | "report";
export type Orientation = "landscape" | "portrait";
export type ExportFormat = "pdf" | "pptx" | "docx";

export interface LogoUpload {
  id: string;
  url: string;       // Public URL (Supabase Storage)
  name: string;
  tier: "primary" | "secondary"; // primer nivel o subnivel
}

export interface DocumentMeta {
  title: string;          // e.g. "CEIN Startup Day 2026"
  subtitle?: string;       // e.g. "Propuesta de servicios"
  client?: string;         // Cliente destinatario
  documentLabel?: string;  // "Organización y difusión", "Informe Q4"...
  date?: string;           // "19 · 20 OCTUBRE 2026"
  location?: string;       // "Pamplona · Navarra"
}

// ---- Bloques de contenido reutilizables ----

export interface IntroSection {
  type: "intro";
  number: string;          // "1.0"
  label: string;           // "Introducción"
  lede?: string;           // Frase destacada
  columns: string[];       // Hasta 3 columnas de texto
}

export interface ObjectivesSection {
  type: "objectives";
  number: string;
  label: string;
  items: { title: string; body: string }[];  // hasta 5 (apaisado) o 4 (vertical)
}

export interface StakeholdersSection {
  type: "stakeholders";
  number: string;
  label: string;
  items: { num?: string; title: string; body: string }[];
}

export interface PlanningSection {
  type: "planning";
  number: string;
  label: string;
  items: {
    dotColor: "orange" | "blue" | "beige";
    kicker: string;
    title: string;
    body: string;
  }[];
}

export interface ServicesIndexSection {
  type: "services-index";
  number: string;
  label: string;
  lede: string;
  blocks: { letter: string; title: string }[];   // A, B, C…
}

export interface ServiceBlockSection {
  type: "service-block";
  letter: string;          // "A"
  kicker: string;          // "BLOQUE 01 · OPERATIVA"
  title: string;           // "Conceptualización..."
  items: { title: string; body: string }[];
}

export interface BudgetSection {
  type: "budget";
  number: string;
  label: string;
  tag?: string;            // "Servicios directos de Navarra Capital"
  groups: {
    title: string;
    rows: { concept: string; qty?: string; amount: string }[];
    subtotal?: string;
  }[];
  note?: string;
}

export interface BudgetSummarySection {
  type: "budget-summary";
  number: string;
  label: string;
  rows: { concept: string; detail?: string; amount: string; isTotal?: boolean }[];
  note?: string;
}

export interface ProseSection {
  type: "prose";
  number: string;
  label: string;
  title?: string;
  paragraphs: string[];
}

export interface ClosingSection {
  type: "closing";
  kicker: string;          // "Propuesta · 2026"
  title: string;           // Frase grande (con [accent] markup p.ej.: "Estamos preparados para hacerlo [posible.]")
}

export type DocSection =
  | IntroSection
  | ObjectivesSection
  | StakeholdersSection
  | PlanningSection
  | ServicesIndexSection
  | ServiceBlockSection
  | BudgetSection
  | BudgetSummarySection
  | ProseSection
  | ClosingSection;

export interface DocumentModel {
  id?: string;
  doc_type: DocType;
  orientation: Orientation;
  meta: DocumentMeta;
  logos_primary: LogoUpload[];     // junto a LaAgencia y CEIN
  logos_secondary: LogoUpload[];   // subnivel (entidades financiadoras, etc.)
  sections: DocSection[];
}

// ---- Estados del maquetador conversacional ----

export type WizardStep =
  | "doc-type"
  | "orientation"
  | "meta"
  | "logos"
  | "sections"          // bucle de añadir secciones
  | "preview"
  | "export";

export interface WizardState {
  step: WizardStep;
  doc: Partial<DocumentModel>;
  format?: ExportFormat;
}
