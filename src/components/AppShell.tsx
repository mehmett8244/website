"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Home, Search, Heart, PlusSquare, LogOut, Send, Shield, Settings, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Logo from "./Logo"; import Avatar from "./Avatar"; import ThemeToggle from "./ThemeToggle"; import Suggestions from "./Suggestions";
export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const sb = supabase(); const auth = ["/giris", "/gizlilik", "/kosullar", "/kvkk"].some((x) => path.startsWith(x));
  const [me, setMe] = useState<{ id: string; username: string; avatar_url: string | null; role: string; banned?: boolean; ranks?: { can_moderate: boolean } | null } | null>(null); const pathRef = useRef(path); pathRef.current = path; const [unread, setUnread] = useState(0); const [dm, setDm] = useState(0);
  useEffect(() => { if (auth || me) return; sb.auth.getUser().then(async ({ data }) => { if (!data.user) return;
    const { data: p } = await sb.from("profiles").select("id,username,avatar_url,role,banned,ranks(can_moderate)").eq("id", data.user.id).maybeSingle(); if (p) setMe(p as any); }); }, [auth, me]);
  useEffect(() => { if (!me) return; const cnt = async () => { const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).eq("read", false); setUnread(pathRef.current.startsWith("/bildirimler") ? 0 : count ?? 0); };
    cnt(); const ch = sb.channel("notif-" + me.id).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${me.id}` }, cnt).subscribe(); return () => { sb.removeChannel(ch); }; }, [me?.id, path]);
  useEffect(() => { if (!me) return; const cnt = async () => { const { count } = await sb.from("messages").select("id", { count: "exact", head: true }).neq("sender_id", me.id).eq("deleted", false).not("read_by", "cs", `{${me.id}}`); setDm(count ?? 0); };
    cnt(); const ch = sb.channel("dmc-" + me.id).on("postgres_changes", { event: "*", schema: "public", table: "messages" }, cnt).subscribe(); return () => { sb.removeChannel(ch); }; }, [me?.id]);
  useEffect(() => { if (!me) return; const beat = () => sb.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", me.id).then(); beat(); const i = setInterval(beat, 60000); return () => clearInterval(i); }, [me?.id]);
  if (auth) return <>{children}</>;
  const items = [{ h: "/", l: "Ana Sayfa", i: <Home /> }, { h: "/ara", l: "Ara", i: <Search /> }, { h: "/mesajlar", l: "Mesajlar", i: <Send />, dot: dm > 0 }, { h: "/bildirimler", l: "Bildirimler", i: <Heart />, dot: unread > 0 },
    { h: "/olustur", l: "Oluştur", i: <PlusSquare /> }, { h: "/lig", l: "Lig", i: <Trophy /> }, { h: me ? `/${me.username}` : "/", l: "Profil", i: <Avatar url={me?.avatar_url} name={me?.username ?? "?"} size={26} /> }];
  if (me && (me.role !== "user" || me.ranks?.can_moderate)) items.push({ h: "/yonetim", l: "Yönetim", i: <Shield /> });
  const out = async () => { await sb.auth.signOut(); location.href = "/giris"; };
  return (<div className="mx-auto flex max-w-[1180px]">
    <aside className="sticky top-0 hidden h-screen w-[72px] shrink-0 flex-col border-r border-line px-3 py-6 md:flex xl:w-60 xl:px-4">
      <Link href="/" className="mb-6 px-1" aria-label="Son Kural Bükücü"><span className="hidden xl:block"><Logo /></span><span className="xl:hidden"><Logo size={36} /></span></Link>
      <nav className="flex flex-1 flex-col gap-1">{items.map((n) => <Link key={n.l} href={n.h} aria-label={n.l} className={`relative flex items-center gap-4 rounded-xl p-3 hover:bg-accent/10 ${path.startsWith(n.h) && (n.h !== "/" || path === "/") ? "font-bold text-accent" : ""}`}>{n.i}{n.dot && <span className="absolute left-7 top-2 h-2.5 w-2.5 rounded-full bg-red-500" />}<span className="hidden xl:inline">{n.l}</span></Link>)}</nav>
      <div className="flex flex-col gap-1"><ThemeToggle /><Link href="/ayarlar" aria-label="Ayarlar" className="flex items-center gap-4 rounded-xl p-3 hover:bg-accent/10"><Settings size={22} /><span className="hidden xl:inline">Ayarlar</span></Link><button onClick={out} aria-label="Çıkış yap" className="flex items-center gap-4 rounded-xl p-3 hover:bg-accent/10"><LogOut size={22} /><span className="hidden xl:inline">Çıkış yap</span></button></div></aside>
    <main className="min-w-0 flex-1 pb-20 md:pb-8">{me?.banned && <Link href="/ayarlar" className="block bg-red-600 p-2 text-center text-sm text-white">Hesabın askıya alındı. İtiraz etmek için dokun.</Link>}{children}</main>
    <aside className="sticky top-0 hidden h-screen w-80 shrink-0 px-4 py-8 xl:block"><Suggestions /><p className="mt-8 text-xs opacity-50">© 2026 SON KURAL BÜKÜCÜ<br /><Link href="/gizlilik">Gizlilik</Link> · <Link href="/kosullar">Koşullar</Link> · <Link href="/kvkk">KVKK</Link></p></aside>
    <nav aria-label="Ana gezinme" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur md:hidden"><div className="flex justify-around py-2">
      {items.map((n) => <Link key={n.l} href={n.h} aria-label={n.l} className={`relative p-2 ${path.startsWith(n.h) && (n.h !== "/" || path === "/") ? "text-accent" : "opacity-70"}`}>{n.i}{n.dot && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />}</Link>)}</div></nav></div>);
}
