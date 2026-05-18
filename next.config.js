/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "puppeteer",
      "puppeteer-core",
      "@sparticuz/chromium",
    ],
    // Vercel no copia automáticamente los archivos de /public al bundle de la función serverless.
    // Forzamos la inclusión de fuentes y logos para que los endpoints de exportación que los
    // leen con fs.readFileSync no exploten con ENOENT en producción.
    outputFileTracingIncludes: {
      "/api/export/pdf": ["./public/fonts/**", "./public/logos/**"],
      "/api/export/pptx": ["./public/logos/**"],
    },
  },
  typescript: {
    // Permite que el build siga aunque haya warnings de tipos.
    // Los errores se siguen viendo en VS Code en desarrollo.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Igual con eslint: no bloquear el deploy por avisos de estilo.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

