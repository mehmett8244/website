"use client";
import { useEffect, useRef, useState } from "react";
import { Heart, X } from "lucide-react";
export type Media = { url: string; type: string };
export default function MediaCarousel({ items, onDoubleLike }: { items: Media[]; onDoubleLike: () => void }) {
  const [i, setI] = useState(0); const [burst, setBurst] = useState(false); const [zoom, setZoom] = useState<string | null>(null);
  const last = useRef(0); const timer = useRef<any>(null); const el = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!zoom) return; const k = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [zoom]);
  const tap = (url: string) => { const now = Date.now();
    if (now - last.current < 300) { clearTimeout(timer.current); last.current = 0; onDoubleLike(); setBurst(true); setTimeout(() => setBurst(false), 700); }
    else { last.current = now; timer.current = setTimeout(() => setZoom(url), 300); } };
  return (<div className="relative">
    <div ref={el} onScroll={() => el.current && setI(Math.round(el.current.scrollLeft / el.current.clientWidth))} className="flex snap-x snap-mandatory overflow-x-auto rounded-md border border-line [scrollbar-width:none]">
      {items.map((m, k) => <div key={k} className="w-full shrink-0 snap-center">{m.type === "video" ? <video src={m.url} controls playsInline className="w-full" /> : <img src={m.url} alt="" loading="lazy" onClick={() => tap(m.url)} className="w-full cursor-zoom-in select-none" />}</div>)}</div>
    {items.length > 1 && <><span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{i + 1}/{items.length}</span>
      <div className="mt-2 flex justify-center gap-1">{items.map((_, k) => <span key={k} className={`h-1.5 w-1.5 rounded-full ${k === i ? "bg-accent" : "bg-line"}`} />)}</div></>}
    {burst && <Heart className="pointer-events-none absolute inset-0 m-auto h-24 w-24 animate-ping text-white" fill="currentColor" />}
    {zoom && <div role="dialog" aria-label="Fotoğraf" onClick={() => setZoom(null)} className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-2"><button aria-label="Kapat" className="absolute right-4 top-4 text-white"><X /></button><img src={zoom} alt="" className="max-h-full max-w-full object-contain" /></div>}</div>);
}
