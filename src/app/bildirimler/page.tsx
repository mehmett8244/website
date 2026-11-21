"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
type N = { body: string | null; post_id: string | null; id: string; kind: string; read: boolean; created_at: string; profiles: { username: string; avatar_url: string | null } | null };
const TXT: Record<string, string> = { like: "gönderini beğendi.", comment: "gönderine yorum yaptı.", follow: "seni takip etmeye başladı.", request: "seni takip etmek istiyor.", message: "sana mesaj gönderdi.", mention: "seni etiketledi.", warning: "hesabına bir uyarı gönderildi. Ayarlar'dan okuyabilirsin." };
export default function Bildirimler() {
  const sb = supabase(); const [list, setList] = useState<N[]>([]); const [ready, setReady] = useState(false);
  const load = useCallback(async () => { const { data: { user } } = await sb.auth.getUser(); if (!user) return;
    const { data } = await sb.from("notifications").select("id,kind,read,created_at,post_id,body,profiles!notifications_actor_id_fkey(username,avatar_url)").order("created_at", { ascending: false }).limit(60);
    setList((data as unknown as N[]) ?? []); setReady(true); await sb.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false); }, []);
  useEffect(() => { let ch: any; load(); sb.auth.getUser().then(({ data }) => { if (data.user) ch = sb.channel("nl-" + data.user.id).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${data.user.id}` }, load).subscribe(); });
    return () => { if (ch) sb.removeChannel(ch); }; }, [load]);
  return (<div className="mx-auto max-w-[470px] p-4"><h1 className="mb-4 text-lg font-bold">Bildirimler</h1>
    {ready && list.length === 0 && <p className="py-16 text-center opacity-60">Henüz bildirimin yok.</p>}
    {list.map((n) => <Link key={n.id} href={n.kind === "warning" || n.kind === "system" ? "/ayarlar" : n.kind === "announcement" ? "/topluluk" : n.post_id ? `/p/${n.post_id}` : n.profiles ? `/${n.profiles.username}` : "/"} className={`flex items-center gap-3 rounded-xl p-3 hover:bg-accent/10 ${n.read ? "" : "bg-accent/10"}`}>
      <Avatar url={n.profiles?.avatar_url} name={n.profiles?.username ?? "?"} size={44} /><p className="flex-1 text-sm"><b>{n.kind === "warning" ? "Yönetim" : n.kind === "announcement" ? "📢 Duyuru" : n.kind === "system" ? "Son Kural Bükücü" : n.profiles?.username ?? "Biri"}</b> {n.kind === "announcement" || n.kind === "system" ? n.body : TXT[n.kind]}</p>
      <span className="text-xs opacity-50">{new Date(n.created_at).toLocaleDateString("tr-TR")}</span></Link>)}</div>);
}
