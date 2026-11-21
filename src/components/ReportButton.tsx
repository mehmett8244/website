"use client";
import { useState } from "react";
import { Flag } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
const R = ["Spam", "Taciz veya zorbalık", "Şiddet", "Uygunsuz içerik", "Diğer"];
export default function ReportButton({ postId, userId }: { postId?: string; userId?: string }) {
  const [open, setOpen] = useState(false); const [done, setDone] = useState("");
  const send = async (reason: string) => { const sb = supabase(); const { data: { user } } = await sb.auth.getUser(); if (!user) return;
    const { error } = await sb.from("reports").insert({ reporter_id: user.id, post_id: postId ?? null, user_id: userId ?? null, reason });
    setDone(error ? "Gönderilemedi, biraz sonra dene." : "Şikâyetin alındı, teşekkürler."); setTimeout(() => { setOpen(false); setDone(""); }, 1800); };
  return (<span className="relative"><button onClick={() => setOpen(!open)} aria-label="Şikâyet et" aria-expanded={open} className="opacity-60"><Flag size={18} /></button>
    {open && <div role="menu" className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-line bg-card p-2 text-sm shadow-xl">{done ? <p className="p-2">{done}</p> : <><p className="px-3 py-1 text-xs opacity-60">Şikâyet nedeni</p>{R.map((r) => <button key={r} onClick={() => send(r)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-accent/10">{r}</button>)}</>}</div>}</span>);
}
