"use client";
import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
type It = { id: string; media_url: string; media_type: string; overlays: { t: string; x: number; y: number; c: string; s: number }[]; music_id: string | null; music_title: string | null; music_start: number; created_at: string };
type H = { id: string; title: string; highlight_items: It[] };
export default function Highlights({ uid, mine, canSee }: { uid: string; mine: boolean; canSee: boolean }) {
  const sb = supabase(); const [list, setList] = useState<H[]>([]); const [v, setV] = useState<{ h: number; i: number } | null>(null);
  const load = async () => { const { data } = await sb.from("highlights").select("id,title,highlight_items(id,media_url,media_type,overlays,music_id,music_title,music_start,created_at)").eq("user_id", uid).order("created_at");
    setList(((data as unknown as H[]) ?? []).map((h) => ({ ...h, highlight_items: [...h.highlight_items].sort((a, b) => a.created_at.localeCompare(b.created_at)) })).filter((h) => h.highlight_items.length || mine)); };
  useEffect(() => { if (canSee) load(); }, [uid, canSee]);
  const cur = v ? list[v.h]?.highlight_items[v.i] : null;
  const next = () => setV((x) => { if (!x) return x; const n = list[x.h].highlight_items.length; return x.i + 1 < n ? { h: x.h, i: x.i + 1 } : null; });
  const del = async () => { if (!v) return; const h = list[v.h]; if (!confirm(`"${h.title}" koleksiyonu silinsin mi?`)) return;
    const files = h.highlight_items.map((i) => decodeURIComponent((i.media_url.split("/media/")[1] ?? "").split("?")[0])).filter(Boolean);
    await sb.from("highlights").delete().eq("id", h.id); if (files.length) await sb.storage.from("media").remove(files); setV(null); load(); };
  if (!canSee || list.length === 0) return null;
  return (<><div className="mt-4 flex gap-4 overflow-x-auto pb-1" aria-label="Öne çıkanlar">{list.map((h, hi) => { const first = h.highlight_items[0];
    return <button key={h.id} onClick={() => first && setV({ h: hi, i: 0 })} className="shrink-0 text-center text-xs"><span className="mb-1 block h-16 w-16 overflow-hidden rounded-full border-2 border-line bg-card">{first && first.media_type === "image" ? <img src={first.media_url} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-lg font-bold">{h.title[0]}</span>}</span>{h.title}</button>; })}</div>
    {cur && <div role="dialog" aria-label="Öne çıkan" className="fixed inset-0 z-50 flex flex-col bg-black text-white"><div className="flex items-center justify-between p-3"><b>{list[v!.h].title}</b><span className="flex items-center gap-4">{mine && <button onClick={del} aria-label="Koleksiyonu sil"><Trash2 size={20} /></button>}<button onClick={() => setV(null)} aria-label="Kapat"><X /></button></span></div>
      <div className="flex min-h-0 flex-1 items-center justify-center"><div className="relative overflow-hidden bg-black" style={{ width: "min(92vw, 40vh)", aspectRatio: "9/16", containerType: "inline-size" }}>
        <button className="absolute inset-0" onClick={next} aria-label="Sonraki">{cur.media_type === "video" ? <video key={cur.id} src={cur.media_url} autoPlay playsInline onEnded={next} className="h-full w-full object-contain" /> : <img key={cur.id} src={cur.media_url} alt="" className="h-full w-full object-contain" />}</button>
        {(cur.overlays ?? []).map((o, i) => <div key={i} style={{ left: `${o.x}%`, top: `${o.y}%`, color: o.c, fontSize: `${o.s}cqw`, transform: "translate(-50%,-50%)", maxWidth: "80cqw", textShadow: "0 1px 4px rgba(0,0,0,.6)" }} className="pointer-events-none absolute whitespace-pre-wrap break-words text-center font-bold leading-tight">{o.t}</div>)}</div></div>
      {cur.music_id && <div className="absolute bottom-6 left-3 z-10 overflow-hidden rounded-xl border border-white/20 bg-black"><iframe key={cur.id} title="Müzik" width="200" height="200" src={`https://www.youtube-nocookie.com/embed/${cur.music_id}?autoplay=1&playsinline=1&loop=1&playlist=${cur.music_id}&start=${cur.music_start ?? 0}&rel=0`} allow="autoplay; encrypted-media" /><p className="w-[200px] truncate bg-black/70 px-2 py-1 text-xs">🎵 {cur.music_title}</p></div>}</div>}</>);
}
