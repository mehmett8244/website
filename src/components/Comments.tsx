"use client";
import { useState } from "react";
import { MessageCircle, Trash2, Heart } from "lucide-react";
import Rich from "./Rich"; import RoleBadge, { Rank } from "./RoleBadge"; import MentionBox from "./MentionBox";
import { supabase } from "@/lib/supabase/client";
type C = { id: string; body: string; author_id: string; parent_id: string | null; profiles: { username: string; role: string; ranks: Rank }; comment_likes: { user_id: string }[] };
export default function Comments({ postId, userId, count, onChange }: { postId: string; userId: string; count: number; onChange: () => void }) {
  const sb = supabase(); const [open, setOpen] = useState(false); const [list, setList] = useState<C[]>([]); const [t, setT] = useState(""); const [rt, setRt] = useState<C | null>(null); const [msg, setMsg] = useState("");
  const load = async () => { const { data } = await sb.from("comments").select("id,body,author_id,parent_id,profiles!comments_author_id_fkey(username,role,ranks(name,color,emoji)),comment_likes(user_id)").eq("post_id", postId).order("created_at"); setList((data as unknown as C[]) ?? []); };
  const toggle = () => { if (!open) load(); setOpen(!open); };
  const send = async (e: React.FormEvent) => { e.preventDefault(); if (!t.trim()) return; setMsg("");
    const { error } = await sb.from("comments").insert({ post_id: postId, author_id: userId, body: t.trim(), parent_id: rt ? rt.parent_id ?? rt.id : null });
    if (error) return setMsg(error.message); setT(""); setRt(null); await load(); onChange(); };
  const del = async (id: string) => { await sb.from("comments").delete().eq("id", id); await load(); onChange(); };
  const like = async (c: C) => { const on = c.comment_likes.some((x) => x.user_id === userId);
    setList((l) => l.map((x) => (x.id !== c.id ? x : { ...x, comment_likes: on ? x.comment_likes.filter((y) => y.user_id !== userId) : [...x.comment_likes, { user_id: userId }] })));
    const { error } = on ? await sb.from("comment_likes").delete().match({ comment_id: c.id, user_id: userId }) : await sb.from("comment_likes").insert({ comment_id: c.id, user_id: userId }); if (error) load(); };
  const row = (c: C, reply = false) => { const liked = c.comment_likes.some((x) => x.user_id === userId);
    return (<div key={c.id} className={`flex items-start gap-2 ${reply ? "ml-8" : ""}`}><div className="min-w-0 flex-1"><p className="break-words"><b>@{c.profiles.username}<RoleBadge role={c.profiles.role} rank={c.profiles.ranks} /></b> <Rich text={c.body} /></p>
      <button onClick={() => { setRt(c); setT(`@${c.profiles.username} `); }} className="text-xs opacity-60">Yanıtla</button></div>
      <button onClick={() => like(c)} aria-label="Yorumu beğen" className={`flex items-center gap-1 text-xs ${liked ? "text-red-500" : "opacity-60"}`}><Heart size={14} fill={liked ? "currentColor" : "none"} />{c.comment_likes.length || ""}</button>
      {c.author_id === userId && <button onClick={() => del(c.id)} aria-label="Yorumu sil" className="opacity-60"><Trash2 size={14} /></button>}</div>); };
  const tops = list.filter((c) => !c.parent_id);
  return (<>
    <button onClick={toggle} aria-label="Yorumlar" className="flex items-center gap-1.5"><MessageCircle size={24} />{count}</button>
    {open && <div className="basis-full space-y-2 border-t border-line pt-3 text-sm">
      {list.length === 0 && <p className="opacity-60">İlk yorumu sen yaz.</p>}
      {tops.map((c) => <div key={c.id} className="space-y-2">{row(c)}{list.filter((r) => r.parent_id === c.id).map((r) => row(r, true))}</div>)}
      {rt && <p className="flex items-center gap-2 text-xs opacity-70">@{rt.profiles.username} kullanıcısına yanıt <button onClick={() => { setRt(null); setT(""); }} className="underline">iptal</button></p>}
      {msg && <p role="alert" className="text-xs text-red-500">{msg}</p>}
      <form onSubmit={send} className="flex gap-2"><input value={t} maxLength={1000} onChange={(e) => setT(e.target.value)} placeholder="Yorum yaz" className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 outline-none focus:border-accent" />
        <button className="rounded-xl bg-accent px-4 font-semibold text-on">Gönder</button></form><MentionBox text={t} onPick={setT} /></div>}</>);
}
