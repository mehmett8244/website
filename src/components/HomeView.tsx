"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Heart, ChevronDown, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Feed from "./Feed"; import Stories from "./Stories"; import Notes from "./Notes"; import ThemeToggle from "./ThemeToggle";
export default function HomeView({ userId }: { userId: string }) {
  const [tab, setTab] = useState<"foryou" | "following">("foryou"); const [menu, setMenu] = useState(false);
  const label = tab === "foryou" ? "Senin için" : "Takip ettiklerin"; const t = "rounded-lg px-3 py-2 text-left hover:bg-accent/10";
  const out = async () => { await supabase().auth.signOut(); location.href = "/giris"; };
  return (<div className="mx-auto w-full max-w-[470px] px-3 md:px-0">
    <div className="relative flex items-center justify-between py-3 md:hidden"><Link href="/olustur" aria-label="Oluştur"><Plus size={28} /></Link>
      <button onClick={() => setMenu(!menu)} aria-expanded={menu} className="flex items-center gap-1 text-lg font-bold">{label}<ChevronDown size={18} /></button><Link href="/bildirimler" aria-label="Bildirimler"><Heart size={26} /></Link>
      {menu && <div role="menu" className="absolute left-1/2 top-12 z-30 flex w-56 -translate-x-1/2 flex-col rounded-2xl border border-line bg-card p-2 shadow-xl">
        <button className={t} onClick={() => { setTab("foryou"); setMenu(false); }}>Senin için</button><button className={t} onClick={() => { setTab("following"); setMenu(false); }}>Takip ettiklerin</button>
        <Link href="/ayarlar" onClick={() => setMenu(false)} className={t}>Ayarlar</Link>
        <div className="flex items-center justify-between border-t border-line px-3 pt-2 text-sm">Tema<ThemeToggle /></div><button className={`${t} flex items-center gap-2`} onClick={out}><LogOut size={16} />Çıkış yap</button></div>}</div>
    <div className="hidden gap-5 py-5 font-semibold md:flex">{(["foryou", "following"] as const).map((k) => <button key={k} onClick={() => setTab(k)} className={tab === k ? "" : "opacity-50"}>{k === "foryou" ? "Senin için" : "Takip ettiklerin"}</button>)}</div>
    <Notes userId={userId} /><Stories userId={userId} /><Feed userId={userId} tab={tab} /></div>);
}
