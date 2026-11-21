"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import Avatar from "./Avatar";
type U = { id: string; username: string; display_name: string | null; avatar_url: string | null; is_private: boolean };
export default function Suggestions() {
  const sb = supabase(); const [me, setMe] = useState(""); const [list, setList] = useState<U[]>([]);
  useEffect(() => { (async () => { const { data: { user } } = await sb.auth.getUser(); if (!user) return; setMe(user.id);
    const { data: f } = await sb.from("follows").select("following_id").eq("follower_id", user.id); const have = new Set((f ?? []).map((x) => x.following_id));
    const { data } = await sb.from("profiles").select("id,username,display_name,avatar_url,is_private").neq("id", user.id).order("created_at", { ascending: false }).limit(30);
    setList((data ?? []).filter((u) => !have.has(u.id)).slice(0, 5)); })(); }, []);
  const follow = async (u: U) => { await sb.from("follows").insert({ follower_id: me, following_id: u.id, status: u.is_private ? "pending" : "accepted" }); setList((l) => l.filter((x) => x.id !== u.id)); };
  return (<section><div className="mb-3 flex justify-between text-sm"><b>Senin için önerilenler</b><Link href="/ara" className="text-accent">Tümünü gör</Link></div>
    {list.length === 0 && <p className="text-sm opacity-60">Şimdilik öneri yok.</p>}
    {list.map((u) => <div key={u.id} className="flex items-center gap-3 py-2"><Link href={`/${u.username}`}><Avatar url={u.avatar_url} name={u.username} size={44} /></Link>
      <Link href={`/${u.username}`} className="min-w-0 flex-1 text-sm"><b className="block truncate">{u.username}</b><span className="block truncate opacity-60">{u.display_name}</span></Link>
      <button onClick={() => follow(u)} className="text-sm font-semibold text-accent">Takip Et</button></div>)}</section>);
}
