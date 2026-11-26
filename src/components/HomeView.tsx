"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Heart, ChevronDown, LogOut, Gift } from "lucide-react";
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
    
<Link
  href="/dogum-gunu"
  className="group mb-5 flex items-center justify-between overflow-hidden rounded-2xl border border-pink-400/20 bg-gradient-to-r from-purple-600/20 via-pink-500/15 to-purple-600/20 p-4 transition-all duration-300 hover:border-pink-400/50 hover:shadow-lg hover:shadow-pink-500/10"
>
  <div className="flex items-center gap-3">
    <div className="rounded-xl bg-pink-500/15 p-3 text-pink-400 transition group-hover:scale-110">
      <Gift size={24} />
    </div>

    <div>
      <p className="font-bold text-pink-400">
        Özel Birinin Özel Bir Günü! 🎂
      </p>
      <p className="text-xs opacity-60">
        Senin için hazırlanmış özel bir sayfa var.
      </p>
    </div>
  </div>

  <span className="text-xl text-pink-400 transition group-hover:translate-x-1">
    →
  </span>
</Link>

    <Notes userId={userId} /><Stories userId={userId} /><Feed userId={userId} tab={tab} /></div>);
}
