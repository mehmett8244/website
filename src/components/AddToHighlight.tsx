"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
type St = { media_url: string; media_type: string; overlays: any[]; music_id: string | null; music_title: string | null; music_start: number };
export default function AddToHighlight({ story, userId, onClose }: { story: St; userId: string; onClose: () => void }) {
  const sb = supabase(); const [list, setList] = useState<{ id: string; title: string }[]>([]); const [title, setTitle] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { sb.from("highlights").select("id,title").eq("user_id", userId).order("created_at").then(({ data }) => setList(data ?? [])); }, []);
  async function add(hid: string) { setBusy(true); setMsg("");
    const from = decodeURIComponent((story.media_url.split("/media/")[1] ?? "").split("?")[0]); const to = `${userId}/hl-${crypto.randomUUID()}.${from.split(".").pop()}`;
    const { error } = await sb.storage.from("media").copy(from, to); if (error) { setBusy(false); return setMsg("Dosya kopyalanamadı."); }
    const { error: e2 } = await sb.from("highlight_items").insert({ highlight_id: hid, media_url: sb.storage.from("media").getPublicUrl(to).data.publicUrl, media_type: story.media_type, overlays: story.overlays ?? [], music_id: story.music_id, music_title: story.music_title, music_start: story.music_start ?? 0 });
    setBusy(false); if (e2) return setMsg("Eklenemedi: " + e2.message); setMsg("Öne çıkanlara eklendi ✓"); setTimeout(onClose, 900); }
  async function create() { if (!title.trim()) return; const { data, error } = await sb.from("highlights").insert({ user_id: userId, title: title.trim() }).select("id").single(); if (error || !data) return setMsg("Oluşturulamadı: " + (error?.message ?? "")); add(data.id); }
  return (<div role="dialog" aria-label="Öne çıkanlara ekle" className="absolute inset-0 z-20 grid place-items-center bg-black/70 p-4" onClick={onClose}><div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs space-y-2 rounded-2xl bg-card p-4 text-ink">
    <div className="flex items-center justify-between"><b>Öne çıkanlara ekle</b><button onClick={onClose} aria-label="Kapat"><X /></button></div>
    {list.map((h) => <button key={h.id} disabled={busy} onClick={() => add(h.id)} className="block w-full rounded-xl border border-line px-3 py-2 text-left hover:border-accent">{h.title}</button>)}
    <div className="flex gap-2"><input value={title} maxLength={20} onChange={(e) => setTitle(e.target.value)} placeholder="Yeni koleksiyon adı" className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent" /><button disabled={busy} onClick={create} className="rounded-xl bg-accent px-3 text-sm font-semibold text-on">Oluştur</button></div>
    {msg && <p role="status" className="text-sm">{msg}</p>}</div></div>);
}
