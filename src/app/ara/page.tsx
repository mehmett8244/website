"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar"; import RoleBadge, { Rank } from "@/components/RoleBadge";
type U = { id: string; username: string; display_name: string | null; avatar_url: string | null; role: string; ranks: Rank };
export default function Ara() {
  const sb = supabase(); const [q, setQ] = useState(""); const [list, setList] = useState<U[]>([]); const [done, setDone] = useState(false); const [tags, setTags] = useState<{ tag: string; n: number }[]>([]);
  useEffect(() => { sb.rpc("trending_tags").then(({ data }) => setTags((data as any) ?? [])); }, []);
  useEffect(() => { const s = q.trim().replace(/[%,()*\\]/g, ""); const t = setTimeout(async () => {
    let query = sb.from("profiles").select("id,username,display_name,avatar_url,role,ranks(name,color,emoji)").limit(25);
    query = s ? query.or(`username.ilike.%${s}%,display_name.ilike.%${s}%`) : query.order("created_at", { ascending: false });
    const { data } = await query; setList((data as any) ?? []); setDone(true); }, 250); return () => clearTimeout(t); }, [q]);
  return (<div className="mx-auto max-w-[470px] p-4"><div className="relative mb-4"><Search size={18} className="absolute left-3 top-3.5 opacity-60" />
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kullanıcı ara" aria-label="Kullanıcı ara" className="w-full rounded-xl border border-line bg-card py-3 pl-10 pr-3 outline-none focus:border-accent" /></div>
    {!q && tags.length > 0 && <div className="mb-5"><p className="mb-2 text-sm font-semibold opacity-70">Gündemdeki etiketler</p><div className="flex flex-wrap gap-2">{tags.map((t) => <Link key={t.tag} href={`/etiket/${encodeURIComponent(t.tag)}`} className="rounded-full border border-line bg-card px-3 py-1 text-sm">#{t.tag} <span className="opacity-50">{t.n}</span></Link>)}</div></div>}
    {!q && <p className="mb-2 text-sm font-semibold opacity-70">Yeni katılanlar</p>}
    {done && list.length === 0 && <p className="py-10 text-center opacity-60">Sonuç bulunamadı.</p>}
    {list.map((u) => <Link key={u.id} href={`/${u.username}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent/10"><Avatar url={u.avatar_url} name={u.username} size={48} /><span><b className="block">{u.username}<RoleBadge role={u.role} rank={u.ranks} /></b><span className="text-sm opacity-60">{u.display_name}</span></span></Link>)}</div>);
}
