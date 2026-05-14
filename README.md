# La Agencia x Navarra Capital — Maquetador editorial

App web para maquetar propuestas comerciales e informes con la identidad editorial de La Agencia x Navarra Capital. **Flujo: el usuario sube un Word, la IA analiza la estructura, y aparece un editor visual con preview en vivo para refinar el resultado antes de exportar a PDF, PowerPoint o Word.**

---

## Stack

- **Frontend / Backend:** Next.js 14 (App Router) + TypeScript + Tailwind
- **Auth + DB + Storage + Emails:** Supabase
- **Análisis con IA:** Anthropic Claude (Sonnet 4) + mammoth para extraer texto del .docx
- **Exportación:** Puppeteer (PDF), pptxgenjs (PPTX), docx (DOCX)
- **Tipografía:** Halyard Display Light / Regular / Medium (incluidas en `/public/fonts`)

---

## Despliegue paso a paso

### 1 · Crear el proyecto en Supabase

1. Entra en https://supabase.com y crea un proyecto nuevo.
2. Anota la **Project URL** y la **anon public key** (Settings → API).
3. En el SQL Editor, pega y ejecuta el contenido de `supabase/migrations/001_init.sql`. Esto crea la tabla `documents`, las políticas RLS y el bucket `logos`.
4. Comprueba en **Storage** que el bucket `logos` aparece marcado como público.

### 2 · Configurar emails de Supabase

En **Authentication → Email Templates**, personaliza al menos:

- **Confirm signup** — el correo que recibirá un usuario al registrarse.
- **Reset password** — el correo de recuperación de contraseña.

En **Authentication → URL Configuration**, define **Site URL** como la URL final de la app (en local: `http://localhost:3000`; en producción: tu dominio).

### 3 · Obtener tu API key de Anthropic

1. Entra en https://console.anthropic.com.
2. Settings → API Keys → "Create Key".
3. Copia la key (empieza por `sk-ant-api03-...`).
4. **Importante:** necesitas saldo en la cuenta. Cada análisis de Word cuesta unos pocos céntimos (depende de la longitud).

### 4 · Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
ANTHROPIC_API_KEY=sk-ant-api03-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5 · Instalar y arrancar en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

### 6 · Despliegue en Vercel

Push del proyecto a GitHub, importa el repo desde vercel.com, y configura en Vercel las mismas variables de entorno.

**Importante para PDF en Vercel:** Puppeteer completo no funciona en Vercel serverless. Opciones:

- **A · Cambiar a `@sparticuz/chromium`** (recomendado). En `app/api/export/pdf/route.ts`:

  ```ts
  import chromium from "@sparticuz/chromium";
  import puppeteer from "puppeteer-core";

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  ```

  Instala: `npm install @sparticuz/chromium puppeteer-core` y quita `puppeteer`.

- **B · Otro hosting** (Railway, Fly.io, VPS) — funciona sin tocar nada.

PPTX y DOCX no tienen este problema.

---

## Flujo de uso

1. **Registro / login** con email + contraseña. Recuperación de contraseña por email.
2. **Dashboard:** lista de documentos del usuario + botón "Nuevo documento".
3. **Nuevo documento → subir un .docx**: arrastra o haz clic. La IA analiza la estructura (10-30 segundos típicamente).
4. **Editor visual:** dos paneles:
   - **Izquierda:** tarjetas editables para cada sección detectada (metadatos, logos, intro, objetivos, presupuesto, etc.). Auto-guardado tras 1.2 s de inactividad.
   - **Derecha:** preview en vivo del documento maquetado.
5. **Exportar:** PDF, PowerPoint o Word desde la parte inferior del panel izquierdo.

---

## Qué detecta la IA

El prompt está diseñado para identificar los siguientes patrones en un Word:

- **Metadatos** de portada: título, subtítulo, cliente, fecha, ubicación.
- **Intro / Introducción** con frase destacada y columnas de texto.
- **Objetivos** como lista de items (título + descripción).
- **Grupos de interés / stakeholders** numerados.
- **Planteamiento** con bloques de color (cena previa, evento principal, prioridades).
- **Índice de servicios** con bloques A/B/C.
- **Bloques de servicio detallados** con sus items.
- **Presupuesto** con secciones, líneas (concepto, cantidad, importe) y subtotales.
- **Cuadro resumen** del presupuesto con fila de TOTAL.
- **Texto libre** para todo lo que no encaje en los patrones anteriores.

Si algo no se detecta correctamente, se puede editar o añadir manualmente desde el panel izquierdo.

---

## Estructura del proyecto

```
app/
├── api/
│   ├── analyze/route.ts                 → mammoth + Claude API
│   └── export/{pdf,pptx,docx}/route.ts  → exportación
├── auth/{callback,update-password}/      → flujos de Supabase Auth
├── dashboard/                            → listado de documentos
├── documento/{nuevo,[id]}/               → upload y editor
├── login/  register/  reset-password/   → auth UI
└── globals.css

components/
├── DocumentRenderer.tsx   → identidad editorial (preview)
├── Editor.tsx             → panel de edición visual
└── LogoutButton.tsx

lib/
├── supabase-browser.ts
└── supabase-server.ts

types/document.ts          → DocumentModel y tipos de sección

public/
├── fonts/                 → Halyard Display (Light, Regular, Medium)
└── logos/                 → logos de La Agencia y CEIN

supabase/migrations/001_init.sql
```

---

## Limitaciones conocidas

- **Word (DOCX):** la fuente Halyard se aplica por nombre. Si quien abre el documento no la tiene instalada, Word usará una sustitución automática. El layout editorial fiel solo está garantizado en PDF.
- **PowerPoint:** los logos del cliente subidos por el usuario no se renderizan dentro de las slides PPTX (solo en PDF). Mejora futura.
- **Puppeteer en Vercel:** requiere cambio a `@sparticuz/chromium`.
- **Coste de IA:** cada análisis de Word tiene un coste de céntimos en tu cuenta Anthropic.

---

## Próximos pasos sugeridos

- Plantillas guardadas (duplicar un documento existente como base).
- Re-analizar el mismo Word con prompts más específicos por tipo de documento.
- Importador desde Google Drive / Dropbox.
- Galería de portadas alternativas.  
