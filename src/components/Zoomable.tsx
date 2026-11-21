"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
export default function Zoomable({ src, className = "" }: { src: string; className?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [open]);
  return (<><img src={src} alt="" loading="lazy" onClick={(e) => { e.stopPropagation(); setOpen(true); }} className={`cursor-zoom-in ${className}`} />
    {open && <div role="dialog" aria-label="Fotoğraf" onClick={(e) => { e.stopPropagation(); setOpen(false); }} className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-2">
      <button aria-label="Kapat" className="absolute right-4 top-4 text-white"><X /></button><img src={src} alt="" className="max-h-full max-w-full object-contain" /></div>}</>);
}
