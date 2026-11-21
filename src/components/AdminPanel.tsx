"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { WordsTab, AppealsTab, LogsTab, CommunitiesTab, VerifyTab, ChartsTab, RewardsTab } from "./ModTabs";
import RanksTab, { RankRow } from "./RanksTab";
type R = { id: string; reason: string; created_at: string; post_id: string | null; user_id: string | null; rep: { username: string } | null; tgt: { username: string } | null; posts: { id: string; body: string | null; media_url: string | null; profiles: { username: string } } | null };
type U = { id: string; username: string; role: string; is_verified: boolean; banned: boolean; rank_id: string | null };
type P = { id: string; body: string | null; media_url: string | null; profiles: { username: string } };
const LBL: Record<string, string> = { users: "Kullanıcı", new_users_7d: "Son 7 gün yeni", posts: "Gönderi", comments: "Yorum", messages: "Mesaj", active_stories: "Aktif hikâye", open_reports: "Açık şikâyet", banned: "Askıdaki hesap" };
export default function AdminPanel() {
  const sb = supabase(); const [tab, setTab] = useState<"stats" | "reports" | "users" | "posts" | "ranks" | "words" | "appeals" | "logs" | "communities" | "verify" | "charts" | "rewards">("stats"); const [role, setRole] = useState("moderator"); const [msg, setMsg] = useState("");
  const [stats, setStats] = useState<Record<string, number>>({}); const [reports, setReports] = useState<R[]>([]); const [users, setUsers] = useState<U[]>([]); const [posts, setPosts] = useState<P[]>([]); const [q, setQ] = useState(""); const [ranks, setRanks] = useState<RankRow[]>([]);
  const load = useCallback(async () => {
    const { data: { user } } = await sb.auth.getUser(); if (user) { const { data: me } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle(); if (me) setRole(me.role); }
    if (tab === "ranks" || tab === "users") { const { data } = await sb.from("ranks").select("*").order("priority", { ascending: false }); setRanks((data as RankRow[]) ?? []); }
    if (tab === "stats") { const { data } = await sb.rpc("admin_stats"); if (data) setStats(data); }
    if (tab === "reports") { const { data } = await sb.from("reports").select("id,reason,created_at,post_id,user_id,rep:profiles!reports_reporter_id_fkey(username),tgt:profiles!reports_user_id_fkey(username),posts(id,body,media_url,profiles!posts_author_id_fkey(username))").eq("status", "open").order("created_at"); setReports((data as any) ?? []); }
    if (tab === "users") { const s = q.trim().replace(/[%,()*\\]/g, ""); let x = sb.from("profiles").select("id,username,role,is_verified,banned,rank_id").order("created_at", { ascending: false }).limit(40); if (s) x = x.ilike("username", `%${s}%`); const { data } = await x; setUsers((data as U[]) ?? []); }
    if (tab === "posts") { const { data } = await sb.from("posts").select("id,body,media_url,profiles!posts_author_id_fkey(username)").order("created_at", { ascending: false }).limit(30); setPosts((data as any) ?? []); }
  }, [tab, q]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  const run = async (p: PromiseLike<{ error: any }>) => { const { error } = await p; setMsg(error ? "İşlem reddedildi: " + error.message : ""); load(); };
  const b = "rounded-lg border border-line bg-bg px-3 py-1 text-xs font-semibold hover:border-accent";
  const only = <p className="py-10 text-center opacity-60">Bu bölümü yalnızca yöneticiler kullanabilir.</p>;
  const tabs = [["stats", "İstatistik"], ["reports", "Şikâyetler"], ["users", "Kullanıcılar"], ["posts", "İçerik"], ["ranks", "Rütbeler"], ["words", "Kelime filtresi"], ["appeals", "İtirazlar"], ["logs", "İşlem kaydı"], ["charts", "Grafikler"], ["communities", "Topluluklar"], ["verify", "Doğrulama"], ["rewards", "Davet ödülleri"]] as const;
  return (<div className="mx-auto max-w-3xl p-4"><h1 className="mb-3 text-xl font-bold">Yönetim paneli <span className="text-sm font-normal opacity-60">({role === "admin" ? "yönetici" : "moderatör"})</span></h1>
    <div className="mb-4 flex gap-2 overflow-x-auto">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold ${tab === k ? "bg-accent text-on" : "border border-line bg-card"}`}>{l}</button>)}</div>
    {msg && <p role="alert" className="mb-3 text-sm text-red-500">{msg}</p>}
    {tab === "stats" && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(LBL).map(([k, l]) => <div key={k} className="rounded-2xl border border-line bg-card p-4"><b className="text-2xl">{stats[k] ?? "–"}</b><p className="text-xs opacity-60">{l}</p></div>)}</div>}
    {tab === "reports" && <div className="space-y-3">{reports.length === 0 && <p className="py-10 text-center opacity-60">Açık şikâyet yok.</p>}
      {reports.map((r) => <div key={r.id} className="rounded-2xl border border-line bg-card p-4 text-sm"><p><b>{r.reason}</b> · {r.rep?.username ?? "silinmiş kullanıcı"} bildirdi</p>
        {r.posts ? <p className="my-2 rounded-lg bg-bg p-2">@{r.posts.profiles.username}: {r.posts.body ?? "(medya)"} {r.posts.media_url && <a href={r.posts.media_url} target="_blank" rel="noreferrer" className="text-accent">medya</a>}</p> : <p className="my-2">Şikâyet edilen hesap: @{r.tgt?.username}</p>}
        <div className="flex flex-wrap gap-2">{r.post_id && <button className={b} onClick={() => run(sb.rpc("resolve_report", { rid: r.id, st: "resolved", del_post: true }))}>Gönderiyi sil + çöz</button>}
          <button className={b} onClick={() => run(sb.rpc("resolve_report", { rid: r.id, st: "resolved", del_post: false }))}>Çözüldü</button><button className={b} onClick={() => run(sb.rpc("resolve_report", { rid: r.id, st: "dismissed", del_post: false }))}>Reddet</button></div></div>)}</div>}
    {tab === "users" && <><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kullanıcı ara" className="mb-3 w-full rounded-xl border border-line bg-card px-3 py-2 outline-none focus:border-accent" />
      <div className="space-y-2">{users.map((u) => <div key={u.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card p-3 text-sm"><b className="flex-1">@{u.username}{u.is_verified && " ✓"}{u.banned && <span className="ml-2 text-red-500">askıda</span>}</b>
        {role === "admin" && <><button className={b} onClick={() => run(sb.rpc("admin_set_verified", { u: u.id, v: !u.is_verified }))}>{u.is_verified ? "Rozeti al" : "Doğrula"}</button>
          <select value={u.role} onChange={(e) => run(sb.rpc("admin_set_role", { u: u.id, r: e.target.value }))} aria-label="Rol" className={b}><option value="user">kullanıcı</option><option value="moderator">moderatör</option><option value="admin">yönetici</option></select>
          <select value={u.rank_id ?? ""} onChange={(e) => run(sb.rpc("admin_set_rank", { u: u.id, r: e.target.value || null }))} aria-label="Rütbe" className={b}><option value="">rütbe yok</option>{ranks.map((r) => <option key={r.id} value={r.id}>{r.emoji} {r.name}</option>)}</select></>}
        <button className={b} onClick={() => { const r = prompt("Uyarı metni:"); if (r) run(sb.rpc("warn_user", { u: u.id, reason: r })); }}>Uyar</button>
        {u.role !== "admin" && <button className={b} onClick={() => run(sb.rpc("admin_set_banned", { u: u.id, v: !u.banned }))}>{u.banned ? "Askıyı kaldır" : "Askıya al"}</button>}</div>)}</div></>}
    {tab === "ranks" && (role === "admin" ? <RanksTab ranks={ranks} reload={load} /> : <p className="py-10 text-center opacity-60">Rütbeleri yalnızca yöneticiler yönetebilir.</p>)}
    {tab === "charts" && <ChartsTab />}{tab === "communities" && (role === "admin" ? <CommunitiesTab /> : only)}{tab === "verify" && (role === "admin" ? <VerifyTab /> : only)}{tab === "rewards" && (role === "admin" ? <RewardsTab /> : only)}
    {tab === "words" && <WordsTab />}{tab === "appeals" && <AppealsTab />}{tab === "logs" && <LogsTab />}
    {tab === "posts" && <div className="space-y-2">{posts.map((p) => <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-card p-3 text-sm">
      {p.media_url && <img src={p.media_url} alt="" className="h-12 w-12 rounded-lg object-cover" />}<span className="min-w-0 flex-1 truncate"><b>@{p.profiles.username}</b> {p.body}</span>
      <button className={b} onClick={() => confirm("Gönderi silinsin mi?") && run(sb.from("posts").delete().eq("id", p.id))}>Sil</button></div>)}</div>}</div>);
}
