"use client";
import { useEffect, useRef, useState } from "react";
import { X, Type, Smile, Music, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import MusicPicker, { Track } from "./MusicPicker";
export type Overlay = { t: string; x: number; y: number; c: string; s: number };
const COLORS = ["#FFFFFF", "#000000", "#FACC15", "#F472B6", "#34D399", "#60A5FA"];
const EMOJIS = ["😂", "😍", "🔥", "💜", "😎", "🥳", "👀", "✨", "🎉", "😭", "👍", "💯"];
export default function StoryComposer({ userId, file, onClose, onDone }: { userId: string; file: File; onClose: () => void; onDone: () => void }) {
  const sb = supabase(); const box = useRef<HTMLDivElement>(null); const drag = useRef<number | null>(null); const video = file.type.startsWith("video");
  const [url, setUrl] = useState(""); const [ov, setOv] = useState<Overlay[]>([]); const [sel, setSel] = useState<number | null>(null);
  const [adding, setAdding] = useState(false); const [txt, setTxt] = useState(""); const [col, setCol] = useState(COLORS[0]); const [size, setSize] = useState(9);
  const [emo, setEmo] = useState(false); const [pick, setPick] = useState(false); const [music, setMusic] = useState<Track | null>(null); const [start, setStart] = useState(0);
  const [aud, setAud] = useState("all"); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);
  const move = (e: React.PointerEvent) => { if (drag.current === null || !box.current) return; const r = box.current.getBoundingClientRect(); const i = drag.current;
    const x = Math.min(95, Math.max(5, ((e.clientX - r.left) / r.width) * 100)), y = Math.min(95, Math.max(5, ((e.clientY - r.top) / r.height) * 100)); setOv((o) => o.map((v, k) => (k === i ? { ...v, x, y } : v))); };
  const addText = () => { if (!txt.trim()) return; setOv((o) => [...o, { t: txt.trim().slice(0, 80), x: 50, y: 50, c: col, s: size }].slice(0, 12)); setSel(ov.length); setTxt(""); setAdding(false); };
  const addEmoji = (e: string) => { setOv((o) => [...o, { t: e, x: 50, y: 50, c: "#fff", s: 18 }].slice(0, 12)); setSel(ov.length); setEmo(false); };
  const remove = () => { if (sel === null) return; setOv((o) => o.filter((_, i) => i !== sel)); setSel(null); };
  async function publish() { setBusy(true); setErr("");
    const path = `${userId}/story-${crypto.randomUUID()}.${file.name.split(".").pop()}`; const { error } = await sb.storage.from("media").upload(path, file);
    if (error) { setBusy(false); return setErr("Yüklenemedi: " + error.message); }
    const { error: e2 } = await sb.from("stories").insert({ author_id: userId, media_url: sb.storage.from("media").getPublicUrl(path).data.publicUrl, media_type: video ? "video" : "image", audience: aud, overlays: ov, music_id: music?.id ?? null, music_title: music?.title ?? null, music_start: start });
    setBusy(false); if (e2) return setErr("Paylaşılamadı: " + e2.message); onDone(); }
  const tb = "grid h-10 w-10 place-items-center rounded-full bg-white/15";
  return (<div role="dialog" aria-label="Hikâye oluştur" className="fixed inset-0 z-50 flex flex-col bg-black text-white">
    <div className="flex items-center justify-between p-3"><button onClick={onClose} aria-label="Vazgeç"><X /></button>
      <div className="flex gap-2"><button onClick={() => { setAdding(!adding); setEmo(false); }} aria-label="Yazı ekle" className={tb}><Type size={20} /></button><button onClick={() => { setEmo(!emo); setAdding(false); }} aria-label="Emoji ekle" className={tb}><Smile size={20} /></button>
        <button onClick={() => setPick(true)} aria-label="Müzik seç" className={tb}><Music size={20} /></button>{sel !== null && <button onClick={remove} aria-label="Seçili öğeyi sil" className={tb}><Trash2 size={20} /></button>}</div></div>
    <div className="flex min-h-0 flex-1 items-center justify-center" onClick={() => setSel(null)}>
      <div ref={box} className="relative overflow-hidden bg-black" style={{ width: "min(92vw, 40vh)", aspectRatio: "9/16", containerType: "inline-size" }}>
        {url && (video ? <video src={url} muted loop autoPlay playsInline className="h-full w-full object-contain" /> : <img src={url} alt="" className="h-full w-full object-contain" />)}
        {ov.map((o, i) => <div key={i} onPointerDown={(e) => { e.stopPropagation(); drag.current = i; setSel(i); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }} onPointerMove={move} onPointerUp={() => (drag.current = null)}
          style={{ left: `${o.x}%`, top: `${o.y}%`, color: o.c, fontSize: `${o.s}cqw`, transform: "translate(-50%,-50%)", touchAction: "none", maxWidth: "80cqw", textShadow: "0 1px 4px rgba(0,0,0,.6)" }}
          className={`absolute cursor-move select-none whitespace-pre-wrap break-words text-center font-bold leading-tight ${sel === i ? "outline-dashed outline-1 outline-white/70" : ""}`}>{o.t}</div>)}</div></div>
    <div className="space-y-2 p-3">
      {adding && <div className="space-y-2 rounded-2xl bg-white/10 p-3"><input autoFocus value={txt} maxLength={80} onChange={(e) => setTxt(e.target.value)} placeholder="Yazını yaz" className="w-full rounded-xl bg-black/50 px-3 py-2 outline-none" />
        <div className="flex items-center gap-2">{COLORS.map((c) => <button key={c} onClick={() => setCol(c)} aria-label={`Renk ${c}`} style={{ background: c }} className={`h-6 w-6 rounded-full border ${col === c ? "ring-2 ring-white" : "border-white/30"}`} />)}
          {[[6, "A"], [9, "A"], [13, "A"]].map(([s, l], i) => <button key={i} onClick={() => setSize(s as number)} style={{ fontSize: 12 + i * 4 }} className={`rounded px-2 ${size === s ? "bg-white text-black" : "bg-white/15"}`}>{l}</button>)}
          <button onClick={addText} className="ml-auto rounded-xl bg-white px-4 py-1.5 text-sm font-semibold text-black">Ekle</button></div></div>}
      {emo && <div className="grid grid-cols-6 gap-2 rounded-2xl bg-white/10 p-3 text-2xl">{EMOJIS.map((e) => <button key={e} onClick={() => addEmoji(e)}>{e}</button>)}</div>}
      {music && <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs"><Music size={14} /><span className="min-w-0 flex-1 truncate">{music.title}</span>
        <label className="flex items-center gap-1">Başlangıç (sn)<input type="number" min={0} max={7200} value={start} onChange={(e) => setStart(Math.max(0, Math.min(7200, +e.target.value || 0)))} className="w-14 rounded bg-black/50 px-1 py-0.5" /></label>
        <button onClick={() => setMusic(null)} aria-label="Müziği kaldır">✕</button></div>}
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      <div className="flex items-center gap-3"><select value={aud} onChange={(e) => setAud(e.target.value)} aria-label="Hikâye gizliliği" className="rounded-xl bg-white/15 px-3 py-2 text-sm"><option value="all" className="text-black">Herkes</option><option value="followers" className="text-black">Takipçiler</option></select>
        <button disabled={busy} onClick={publish} className="ml-auto rounded-xl bg-accent px-6 py-2.5 font-semibold text-on disabled:opacity-60">{busy ? "Paylaşılıyor…" : "Hikâyede paylaş"}</button></div></div>
    {pick && <MusicPicker onPick={(t) => { setMusic(t); setPick(false); }} onClose={() => setPick(false)} />}</div>);
}
