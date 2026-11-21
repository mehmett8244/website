import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
export async function GET(req: Request) {
  const url = new URL(req.url); const code = url.searchParams.get("code"); const hash = url.searchParams.get("token_hash"); const type = url.searchParams.get("type") as EmailOtpType | null; const next = url.searchParams.get("next") ?? "/";
  const jar = cookies(); const recovery = type === "recovery" || jar.get("skb_recovery")?.value === "1";
  let dest = next.startsWith("/") && !next.startsWith("//") ? next : "/"; if (recovery && dest === "/") dest = "/ayarlar?sifre=1";
  const sb = supabaseServer(); let error: unknown = null;
  if (hash && type) ({ error } = await sb.auth.verifyOtp({ type, token_hash: hash })); else if (code) ({ error } = await sb.auth.exchangeCodeForSession(code)); else error = new Error("eksik parametre");
  if (error) return NextResponse.redirect(new URL("/giris?hata=1", url.origin));
  const res = NextResponse.redirect(new URL(dest, url.origin)); if (jar.get("skb_recovery")) res.cookies.set("skb_recovery", "", { path: "/", maxAge: 0 }); return res;
}
