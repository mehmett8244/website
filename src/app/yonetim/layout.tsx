import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
export default async function Layout({ children }: { children: React.ReactNode }) {
  const sb = supabaseServer(); const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/giris");
  const { data: ok } = await sb.rpc("is_staff");
  if (!ok) redirect("/");
  return <>{children}</>;
}
