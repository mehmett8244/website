"use client";
import { useEffect, useState } from "react";
import { X, Link2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Avatar from "./Avatar";
type Conv = { id: string; title: string | null; is_group: boolean; conversation_members: { user_id: string; profiles: { username: string; avatar_url: string | null } }[] };
export default function ShareSheet({ postId, forward, onClose }: { postId?: string; forward?: { body: string | null; image_url: string | null; audio_url: string | null }; onClose: () => void }) {
  const sb = supabase(); const [me, setMe] = useState(""); const [convs, setConvs] = useState<Conv[]>([]); const [sent, setSent] = useState<Set<string>>(new Set()); const [msg, setMsg] = useState("");
  useEffect(() => { (async () => { const { data: { user } } = await sb.auth.getUser(); setMe(user?.id ?? "");
    const { data } = await sb.from("conversations").select("id,title,is_group,conversation_members(user_id,profiles(username,avatar_url))"); setConvs((data as any) ?? []); })(); }, []);
  const url = `${location.origin}/p/${postId}`;
  const name = (c: Conv) => (c.is_group ? c.title ?? "Grup" : c.conversation_members.find((m) => m.user_id !== me)?.profiles.username ?? "Sohbet");
  const send = async (c: Conv) => { const { error } = await sb.from("messages").insert({ conversation_id: c.id, sender_id: me, body: forward ? forward.body : url, image_url: forward?.image_url ?? null, audio_url: forward?.audio_url ?? null, forwarded: !!forward, read_by: [me] }); if (error) setMsg("Gönderilemedi: " + error.message); else setSent((s) => new Set(s).add(c.id)); };
  const copy = async () => { if (navigator.share) { try { await navigator.share({ url }); return; } catch { /* iptal */ } } try { await navigator.clipboard.writeText(url); setMsg("Bağlantı kopyalandı."); } catch { prompt("Bağlantı:", url); } };
  return (<div role="dialog" aria-label="Gönderiyi paylaş" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}><div onClick={(e) => e.stopPropagation()} className="flex max-h-[75vh] w-full max-w-sm flex-col rounded-2xl border border-line bg-card">
    <div className="flex items-center justify-between p-4"><b>{forward ? "Mesajı ilet" : "Gönderiyi paylaş"}</b><button onClick={onClose} aria-label="Kapat"><X /></button></div>
    {!forward && <button onClick={copy} className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"><Link2 size={16} />Bağlantıyı kopyala / paylaş</button>}
    {msg && <p role="status" className="px-4 pb-2 text-sm text-accent">{msg}</p>}
    <p className="px-4 text-xs opacity-60">Sohbete gönder</p>
    <div className="overflow-y-auto px-2 pb-3">{convs.length === 0 && <p className="p-4 text-center text-sm opacity-60">Henüz sohbetin yok.</p>}
      {convs.map((c) => <button key={c.id} disabled={sent.has(c.id)} onClick={() => send(c)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-accent/10"><Avatar url={c.is_group ? null : c.conversation_members.find((m) => m.user_id !== me)?.profiles.avatar_url} name={name(c)} size={40} /><span className="flex-1">{name(c)}</span><span className="text-sm text-accent">{sent.has(c.id) ? "Gönderildi ✓" : "Gönder"}</span></button>)}</div></div></div>);
}
