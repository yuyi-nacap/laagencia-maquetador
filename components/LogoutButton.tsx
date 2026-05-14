"use client";

import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs uppercase tracking-widest text-ink-mute hover:text-ink"
      style={{ letterSpacing: "1.5px" }}
    >
      Cerrar sesión
    </button>
  );
}
