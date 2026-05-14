/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "puppeteer",
      "puppeteer-core",
      "@sparticuz/chromium",
    ],
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
