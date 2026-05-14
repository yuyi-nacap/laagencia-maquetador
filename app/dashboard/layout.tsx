import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Usuario";

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-rule flex flex-col justify-between p-8 bg-bg">
        <div>
          <Link href="/dashboard" className="block mb-12">
            <img src="/logos/laagencia-logo.png" alt="LaAgencia" className="h-10" />
            <div className="kicker mt-3" style={{ fontSize: "8pt" }}>
              Maquetador
            </div>
          </Link>

          <nav className="space-y-1">
            <NavItem href="/dashboard" label="Mis documentos" />
            <NavItem href="/documento/nuevo" label="Nuevo documento" accent />
          </nav>
        </div>

        <div>
          <div
            className="label-mini"
            style={{ color: "var(--ink-mute)", marginBottom: "0.2rem" }}
          >
            Sesión
          </div>
          <div
            className="text-sm mb-3"
            style={{ fontWeight: 500, color: "var(--ink)" }}
          >
            {fullName}
          </div>
          <div
            className="text-xs mb-4"
            style={{ color: "var(--ink-mute)" }}
          >
            {user.email}
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function NavItem({
  href,
  label,
  accent,
}: {
  href: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="block py-2 text-sm hover:text-accent transition-colors"
      style={{
        color: accent ? "var(--accent)" : "var(--ink)",
        fontWeight: accent ? 500 : 400,
      }}
    >
      {accent ? "+ " : ""}
      {label}
    </Link>
  );
}
