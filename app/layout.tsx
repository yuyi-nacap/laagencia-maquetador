import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Agencia x Navarra Capital · Maquetador",
  description: "Maquetador visual de propuestas e informes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
