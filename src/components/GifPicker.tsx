"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
const KEY = process.env.NEXT_PUBLIC_GIPHY_KEY;
export default function GifPicker({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [q, setQ] = useState(""); const [list, setList] = useState<{ id: string; url: string; thumb: string }[]>([]); const [msg, setMsg] = useState("");
  useEffect(() => { if (!KEY) { setMsg("GIF araması henüz yapılandırılmadı."); return; }
    const t = setTimeout(async () => { try { const base = q.trim() ? `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(q.trim())}&` : "https://api.giphy.com/v1/gifs/trending?";
      const d = await (await fetch(`${base}api_key=${KEY}&limit=18&rating=pg`)).json(); setList((d.data ?? []).map((g: any) => ({ id: g.id, url: g.images.fixed_height.url, thumb: g.images.fixed_height_small.url }))); setMsg(""); } catch { setMsg("GIF'ler yüklenemedi."); } }, 350);
    return () => clearTimeout(t); }, [q]);
  return (<div role="dialog" aria-label="GIF seç" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}><div onClick={(e) => e.stopPropagation()} className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-2xl border border-line bg-card">
    <div className="flex items-center justify-between p-4"><b>GIF</b><button onClick={onClose} aria-label="Kapat"><X /></button></div>
    <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="GIF ara" className="mx-4 rounded-xl border border-line bg-bg px-3 py-2 outline-none focus:border-accent" />
    {msg && <p className="px-4 pt-2 text-sm opacity-70">{msg}</p>}
    <div className="mt-2 grid grid-cols-3 gap-1 overflow-y-auto px-2">{list.map((g) => <button key={g.id} onClick={() => onPick(g.url)}><img src={g.thumb} alt="" className="aspect-square w-full rounded object-cover" /></button>)}</div>
    <p className="p-2 text-center text-[10px] opacity-50">Powered by GIPHY</p></div></div>);
}
