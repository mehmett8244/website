"use client";
import { useState } from "react";
import { X, Search } from "lucide-react";
export type Track = { id: string; title: string; channel: string; thumb: string };
export default function MusicPicker({ onPick, onClose }: { onPick: (t: Track) => void; onClose: () => void }) {
  const [q, setQ] = useState(""); const [list, setList] = useState<Track[]>([]); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) { e.preventDefault(); if (q.trim().length < 2) return; setBusy(true); setMsg("");
    try { const r = await fetch(`/api/muzik-ara?q=${encodeURIComponent(q.trim())}`); const d = await r.json(); if (!r.ok) { setMsg(d.error ?? "Arama başarısız."); setList([]); } else { setList(d.items); if (!d.items.length) setMsg("Sonuç bulunamadı."); } } catch { setMsg("Bağlantı hatası."); }
    setBusy(false); }
  return (<div role="dialog" aria-label="Müzik ara" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}><div onClick={(e) => e.stopPropagation()} className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-2xl border border-line bg-card">
    <div className="flex items-center justify-between p-4"><b>Müzik ekle (YouTube)</b><button onClick={onClose} aria-label="Kapat"><X /></button></div>
    <form onSubmit={go} className="mx-4 flex gap-2"><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Şarkı veya sanatçı ara" className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 outline-none focus:border-accent" /><button disabled={busy} aria-label="Ara" className="rounded-xl bg-accent px-3 text-on"><Search size={18} /></button></form>
    {msg && <p role="status" className="px-4 pt-3 text-sm opacity-70">{msg}</p>}
    <div className="mt-2 overflow-y-auto px-2 pb-3">{list.map((t) => <button key={t.id} onClick={() => onPick(t)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-accent/10"><img src={t.thumb} alt="" className="h-12 w-16 rounded-lg object-cover" /><span className="min-w-0"><b className="block truncate text-sm">{t.title}</b><span className="block truncate text-xs opacity-60">{t.channel}</span></span></button>)}</div></div></div>);
}
