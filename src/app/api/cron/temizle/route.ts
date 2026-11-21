import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const pathOf = (u: string | null) => (u && u.includes("/media/") ? decodeURIComponent(u.split("/media/")[1].split("?")[0]) : null);
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "yetkisiz" }, { status: 401 });
  if (!key) return NextResponse.json({ error: "yapılandırma eksik" }, { status: 500 });
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();
  const { data: old } = await admin.from("stories").select("id,media_url,audio_url").lt("expires_at", now).limit(500);
  const rows = old ?? []; const files = rows.flatMap((s) => [pathOf(s.media_url), pathOf(s.audio_url)]).filter(Boolean) as string[];
  if (files.length) await admin.storage.from("media").remove(files);
  if (rows.length) await admin.from("stories").delete().in("id", rows.map((s) => s.id));
  await admin.from("notes").delete().lt("expires_at", now);
  return NextResponse.json({ silinenHikaye: rows.length, silinenDosya: files.length });
}
