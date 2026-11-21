"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Avatar from "./Avatar";
type U = { id: string; username: string; display_name: string | null; avatar_url: string | null };
export default function FollowList({ kind, uid, onClose }: { kind: "followers" | "following"; uid: string; onClose: () => void }) {
  const [list, setList] = useState<U[] | null>(null);
  useEffect(() => { supabase().rpc("follow_list", { u: uid, kind }).then(({ data }) => setList((data as U[]) ?? [])); }, [uid, kind]);
  return (<div role="dialog" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}><div onClick={(e) => e.stopPropagation()} className="flex max-h-[70vh] w-full max-w-sm flex-col rounded-2xl border border-line bg-card">
    <div className="flex items-center justify-between p-4"><b>{kind === "followers" ? "Takipçiler" : "Takip edilenler"}</b><button onClick={onClose} aria-label="Kapat"><X /></button></div>
    <div className="overflow-y-auto px-2 pb-3">{list === null && <p className="p-4 text-center opacity-60">Yükleniyor…</p>}{list?.length === 0 && <p className="p-4 text-center opacity-60">Kimse yok.</p>}
      {list?.map((u) => <Link key={u.id} href={`/${u.username}`} onClick={onClose} className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent/10"><Avatar url={u.avatar_url} name={u.username} size={40} /><span><b className="block">{u.username}</b><span className="text-sm opacity-60">{u.display_name}</span></span></Link>)}</div></div></div>);
}
