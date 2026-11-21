"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Avatar from "./Avatar";
type L = { user_id: string; profiles: { username: string; avatar_url: string | null } };
export default function Likers({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [list, setList] = useState<L[] | null>(null);
  useEffect(() => { supabase().from("likes").select("user_id,profiles!likes_user_id_fkey(username,avatar_url)").eq("post_id", postId).limit(200).then(({ data }) => setList((data as any) ?? [])); }, [postId]);
  return (<div role="dialog" aria-label="Beğenenler" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}><div onClick={(e) => e.stopPropagation()} className="flex max-h-[70vh] w-full max-w-sm flex-col rounded-2xl border border-line bg-card">
    <div className="flex items-center justify-between p-4"><b>Beğenenler</b><button onClick={onClose} aria-label="Kapat"><X /></button></div>
    <div className="overflow-y-auto px-2 pb-3">{list === null && <p className="p-4 text-center opacity-60">Yükleniyor…</p>}{list?.length === 0 && <p className="p-4 text-center opacity-60">Henüz beğeni yok.</p>}
      {list?.map((l) => <Link key={l.user_id} href={`/${l.profiles.username}`} onClick={onClose} className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent/10"><Avatar url={l.profiles.avatar_url} name={l.profiles.username} size={40} /><b>{l.profiles.username}</b></Link>)}</div></div></div>);
}
