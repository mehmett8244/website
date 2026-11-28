"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Award, Crown, History, RefreshCw, Sparkles, Trophy, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Avatar from "./Avatar";

type Profile = { username: string; avatar_url: string | null };
type Stat = { user_id: string; total_xp: number; profiles: Profile | Profile[] | null };
type Achievement = { name: string; description: string; icon: string; xp_reward: number };
type Earned = { awarded_at: string; achievements: Achievement | Achievement[] | null };
type Transaction = { id: string; amount: number; reason: string; created_at: string };

function getLevel(xp: number) {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
  const currentFloor = 100 * (level - 1) ** 2;
  const nextFloor = 100 * level ** 2;
  return { level, currentFloor, nextFloor, progress: Math.min(100, Math.max(0, ((xp - currentFloor) / (nextFloor - currentFloor)) * 100)) };
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

export default function LeagueView() {
  const sb = useMemo(() => supabase(), []);
  const [userId, setUserId] = useState("");
  const [myTotalXp, setMyTotalXp] = useState(0);
  const [stats, setStats] = useState<Stat[]>([]);
  const [earned, setEarned] = useState<Earned[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) {
      setError("Topluluk Ligi'ni görmek için giriş yapmalısın.");
      setLoading(false);
      return;
    }
    setUserId(auth.user.id);

    const [leaderboard, ownStats, achievements, transactions] = await Promise.all([
      sb.from("league_stats").select("user_id,total_xp,profiles(username,avatar_url)").order("total_xp", { ascending: false }).order("user_id", { ascending: true }).limit(100),
      sb.from("league_stats").select("total_xp").eq("user_id", auth.user.id).maybeSingle(),
      sb.from("user_achievements").select("awarded_at,achievements(name,description,icon,xp_reward)").eq("user_id", auth.user.id).order("awarded_at", { ascending: false }),
      sb.from("xp_transactions").select("id,amount,reason,created_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(8)
    ]);

    if (leaderboard.error) setError("Lig sıralaması yüklenemedi: " + leaderboard.error.message);
    else setStats((leaderboard.data as unknown as Stat[]) ?? []);
    setMyTotalXp(Number(ownStats.data?.total_xp ?? 0));
    setEarned((achievements.data as unknown as Earned[]) ?? []);
    setHistory((transactions.data as Transaction[]) ?? []);
    setLoading(false);
  }, [sb]);

  useEffect(() => { void load(); }, [load]);

  const myXp = myTotalXp;
  const level = getLevel(myXp);
  const position = stats.findIndex((x) => x.user_id === userId) + 1;
  const podium = stats.slice(0, 3);
  const rest = stats.slice(3);
  const panel = "rounded-2xl border border-white/10 bg-[#29272E] p-4";
  const muted = "text-white/55";

  return (
    <main className="min-h-screen bg-[#222126] px-3 py-6 text-white sm:px-5">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C56AFF]">Son Kural Bükücü</p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Topluluk Ligi</h1>
            <p className={`mt-1 text-sm ${muted}`}>Katkı sağla, geliş, toplulukta yerini al.</p>
          </div>
          <button onClick={() => void load()} aria-label="Yenile" className="rounded-xl border border-white/10 p-3 text-[#D28AFF] transition hover:bg-white/5"><RefreshCw size={19} /></button>
        </header>

        {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        {loading ? (
          <div className={`${panel} animate-pulse py-12 text-center text-sm text-white/50`}>Lig bilgileri yükleniyor…</div>
        ) : (
          <>
            <section className={`${panel} overflow-hidden`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-white/60">Senin ilerlemen</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-4xl font-black text-[#D28AFF]">Seviye {level.level}</span>
                    <span className="text-sm text-white/50">· {myXp.toLocaleString("tr-TR")} XP</span>
                  </div>
                  <p className="mt-2 text-sm text-white/60">{Math.max(0, level.nextFloor - myXp).toLocaleString("tr-TR")} XP sonraki seviyeye kaldı.</p>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-[#35283D] px-4 py-3">
                  <Trophy className="text-[#D28AFF]" size={25} />
                  <div><p className="text-xs text-white/50">Genel sıralaman</p><p className="text-xl font-bold">{position ? `#${position}` : stats.length >= 100 ? "100+" : "—"}</p></div>
                </div>
              </div>
              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#C56AFF] transition-all" style={{ width: `${level.progress}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-white/45"><span>{level.currentFloor.toLocaleString("tr-TR")} XP</span><span>{level.nextFloor.toLocaleString("tr-TR")} XP</span></div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Liderlik tablosu</h2><span className={`text-xs ${muted}`}>Tüm zamanlar · İlk 100</span></div>
              <div className={`${panel} grid gap-3 sm:grid-cols-3`}>
                {podium.map((entry, index) => {
                  const profile = one(entry.profiles);
                  const colors = ["text-[#E6C6FF]", "text-white/75", "text-[#D99B72]"];
                  return (
                    <div key={entry.user_id} className={`flex items-center gap-3 rounded-xl bg-white/[0.035] p-3 ${index === 0 ? "sm:-translate-y-1" : ""}`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 font-black ${colors[index]}`}>{index === 0 ? <Crown size={18} /> : index + 1}</div>
                      <Avatar url={profile?.avatar_url ?? null} name={profile?.username ?? "?"} size={42} />
                      <div className="min-w-0 flex-1"><Link href={profile?.username ? `/${profile.username}` : "#"} className="block truncate text-sm font-bold hover:text-[#D28AFF]">@{profile?.username ?? "kullanıcı"}</Link><p className="text-xs text-white/50">Seviye {getLevel(Number(entry.total_xp)).level}</p></div>
                      <b className="whitespace-nowrap text-sm text-[#D28AFF]">{Number(entry.total_xp).toLocaleString("tr-TR")} XP</b>
                    </div>
                  );
                })}
                {podium.length === 0 && <p className="py-5 text-center text-sm text-white/50 sm:col-span-3">Henüz lig verisi yok.</p>}
              </div>
              <div className={`${panel} overflow-hidden p-0`}>
                {rest.map((entry, index) => {
                  const profile = one(entry.profiles);
                  return <div key={entry.user_id} className="flex items-center gap-3 border-b border-white/[0.06] px-3 py-3 last:border-0 sm:px-4">
                    <span className="w-7 text-center text-sm text-white/45">{index + 4}</span>
                    <Avatar url={profile?.avatar_url ?? null} name={profile?.username ?? "?"} size={36} />
                    <Link href={profile?.username ? `/${profile.username}` : "#"} className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-[#D28AFF]">@{profile?.username ?? "kullanıcı"}</Link>
                    <span className="text-xs text-white/45">Sv. {getLevel(Number(entry.total_xp)).level}</span>
                    <b className="text-sm text-[#D28AFF]">{Number(entry.total_xp).toLocaleString("tr-TR")} XP</b>
                  </div>;
                })}
                {stats.length > 0 && stats.length <= 3 && <p className="px-4 py-3 text-xs text-white/45">Şimdilik ilk üç üye listeleniyor.</p>}
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className={panel}>
                <div className="mb-3 flex items-center gap-2"><Award className="text-[#D28AFF]" size={19} /><h2 className="font-bold">Başarımlarım</h2></div>
                {earned.length ? <div className="grid grid-cols-2 gap-2">
                  {earned.map((item, index) => {
                    const achievement = one(item.achievements);
                    if (!achievement) return null;
                    return <div key={index} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                      <div className="text-2xl">{achievement.icon}</div><p className="mt-1 text-sm font-bold">{achievement.name}</p><p className="mt-1 text-xs text-white/50">{achievement.description}</p><p className="mt-2 text-[11px] text-[#D28AFF]">{dateLabel(item.awarded_at)}</p>
                    </div>;
                  })}
                </div> : <p className="py-6 text-center text-sm text-white/45">Henüz başarım kazanmadın. İlk gönderini paylaşarak başlayabilirsin.</p>}
              </section>

              <section className={panel}>
                <div className="mb-3 flex items-center gap-2"><History className="text-[#D28AFF]" size={19} /><h2 className="font-bold">Son XP hareketleri</h2></div>
                {history.length ? <div className="space-y-3">
                  {history.map((item) => <div key={item.id} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#35283D] text-[#D28AFF]"><Zap size={16} /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.reason}</p><p className="text-xs text-white/40">{dateLabel(item.created_at)}</p></div>
                    <b className={item.amount >= 0 ? "text-sm text-[#D28AFF]" : "text-sm text-red-300"}>{item.amount > 0 ? "+" : ""}{item.amount} XP</b>
                  </div>)}
                </div> : <p className="py-6 text-center text-sm text-white/45">Henüz XP hareketin bulunmuyor.</p>}
              </section>
            </div>

            <section className="flex items-center gap-3 rounded-2xl border border-[#C56AFF]/20 bg-[#35283D]/60 p-4">
              <Sparkles className="shrink-0 text-[#D28AFF]" />
              <p className="text-sm text-white/65">Paylaşımların, yorumların ve aldığın geçerli beğeniler lig seviyene katkı sağlar. Mevcut profil rütben bu sistemden bağımsızdır.</p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
