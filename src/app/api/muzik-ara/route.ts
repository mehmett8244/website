import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
const dec = (s: string) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
export async function GET(req: Request) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: "yetkisiz" }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ items: [] });
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: "Müzik araması henüz yapılandırılmadı." }, { status: 503 });
  const u = new URL("https://www.googleapis.com/youtube/v3/search");
  Object.entries({ part: "snippet", type: "video", videoCategoryId: "10", videoEmbeddable: "true", safeSearch: "moderate", maxResults: "8", q, key }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { next: { revalidate: 3600 } });
  if (!r.ok) return NextResponse.json({ error: r.status === 403 ? "Günlük arama kotası doldu, yarın tekrar dene." : "Arama başarısız." }, { status: 502 });
  const d = await r.json();
  return NextResponse.json({ items: (d.items ?? []).filter((i: any) => i.id?.videoId).map((i: any) => ({ id: i.id.videoId, title: dec(i.snippet.title), channel: dec(i.snippet.channelTitle), thumb: i.snippet.thumbnails?.default?.url ?? "" })) });
}
