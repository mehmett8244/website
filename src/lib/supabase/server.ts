import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export function supabaseServer() {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (c: any[]) => { try { c.forEach(({ name, value, options }: any) => store.set(name, value, options)); } catch {} } },
  });
}
