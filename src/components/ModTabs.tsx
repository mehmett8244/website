"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
const card = "rounded-xl border border-line bg-card p-3 text-sm";
export function WordsTab() {
  const sb = supabase(); const [list, setList] = useState<string[]>([]); const [w, setW] = useState(""); const [msg, setMsg] = useState("");
  const load = async () => { const { data } = await sb.from("banned_words").select("word").order("word"); setList((data ?? []).map((x) => x.word)); }; useEffect(() => { load(); }, []);
  const add = async () => { const word = w.trim().toLowerCase(); if (!word) return; const { error } = await sb.from("banned_words").insert({ word }); setMsg(error ? "Eklenemedi (yalnızca harf, rakam ve boşluk; 2-40 karakter)." : ""); setW(""); load(); };
  return (<div className="space-y-3"><p className="text-sm opacity-70">Gönderi ve yorumlarda bu kelimeler geçen içerik paylaşılamaz. Yetkililer etkilenmez.</p>
    <div className="flex gap-2"><input value={w} onChange={(e) => setW(e.target.value)} placeholder="Yasaklı kelime" className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent" /><button onClick={add} className="rounded-xl bg-accent px-4 text-sm font-semibold text-on">Ekle</button></div>
    {msg && <p role="alert" className="text-sm text-red-500">{msg}</p>}<div className="flex flex-wrap gap-2">{list.map((x) => <span key={x} className="flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-sm">{x}<button aria-label={`${x} kelimesini kaldır`} onClick={async () => { await sb.from("banned_words").delete().eq("word", x); load(); }}>✕</button></span>)}</div></div>);
}
export function AppealsTab() {
  const sb = supabase(); const [list, setList] = useState<{ id: string; message: string; created_at: string; profiles: { username: string } }[]>([]);
  const load = async () => { const { data } = await sb.from("appeals").select("id,message,created_at,profiles(username)").eq("status", "open").order("created_at"); setList((data as any) ?? []); }; useEffect(() => { load(); }, []);
  const res = async (id: string, accept: boolean) => { await sb.rpc("resolve_appeal", { aid: id, accept }); load(); };
  return (<div className="space-y-3">{list.length === 0 && <p className="py-10 text-center opacity-60">Bekleyen itiraz yok.</p>}
    {list.map((a) => <div key={a.id} className={card}><p><b>@{a.profiles.username}</b> <span className="opacity-50">· {new Date(a.created_at).toLocaleDateString("tr-TR")}</span></p><p className="my-2 whitespace-pre-wrap">{a.message}</p>
      <div className="flex gap-2"><button onClick={() => res(a.id, true)} className="rounded-lg border border-line px-3 py-1 text-xs font-semibold">Kabul et (askıyı kaldır)</button><button onClick={() => res(a.id, false)} className="rounded-lg border border-line px-3 py-1 text-xs font-semibold">Reddet</button></div></div>)}</div>);
}
export function LogsTab() {
  const sb = supabase(); const [list, setList] = useState<{ id: string; action: string; details: string | null; created_at: string; actor: { username: string } | null; target: { username: string } | null }[]>([]);
  useEffect(() => { sb.from("admin_logs").select("id,action,details,created_at,actor:profiles!admin_logs_actor_id_fkey(username),target:profiles!admin_logs_target_user_fkey(username)").order("created_at", { ascending: false }).limit(100).then(({ data }) => setList((data as any) ?? [])); }, []);
  return (<div className="space-y-2">{list.length === 0 && <p className="py-10 text-center opacity-60">Henüz işlem kaydı yok.</p>}
    {list.map((l) => <div key={l.id} className={card}><b>{l.action}</b> · @{l.actor?.username ?? "?"}{l.target && <> → @{l.target.username}</>}{l.details && <span className="opacity-70"> · {l.details}</span>}<span className="float-right text-xs opacity-50">{new Date(l.created_at).toLocaleString("tr-TR")}</span></div>)}</div>);
}
type Ch = { id: string; name: string; kind: string; staff_only: boolean };
type Com = { id: string; name: string; description: string; is_default: boolean; is_public: boolean; channels: Ch[] };
export function CommunitiesTab() {
  const sb = supabase(); const [list, setList] = useState<Com[]>([]); const [f, setF] = useState({ name: "", description: "", is_public: false }); const [chf, setChf] = useState<Record<string, { name: string; kind: string }>>({}); const [mem, setMem] = useState<Record<string, string>>({}); const [msg, setMsg] = useState("");
  const load = async () => { const { data } = await sb.from("communities").select("id,name,description,is_default,is_public,channels(id,name,kind,staff_only)").order("created_at"); setList((data as unknown as Com[]) ?? []); }; useEffect(() => { load(); }, []);
  const done = (error: any, ok = "") => { setMsg(error ? "İşlem başarısız: " + error.message : ok); load(); };
  const create = async () => { if (f.name.trim().length < 2) return setMsg("Topluluk adı en az 2 karakter olmalı."); const { error } = await sb.rpc("create_community", { n: f.name.trim(), d: f.description.trim(), pub: f.is_public }); if (!error) setF({ name: "", description: "", is_public: false }); done(error, "Topluluk oluşturuldu."); };
  const addCh = async (c: Com) => { const v = chf[c.id]; if (!v?.name.trim()) return; const { error } = await sb.from("channels").insert({ community_id: c.id, name: v.name.trim(), kind: v.kind || "chat", staff_only: (v.kind || "chat") === "announce" }); if (!error) setChf({ ...chf, [c.id]: { name: "", kind: v.kind } }); done(error); };
  const addMem = async (c: Com) => { const u = (mem[c.id] ?? "").trim().toLowerCase().replace("@", ""); if (!u) return; const { data: p } = await sb.from("profiles").select("id").eq("username", u).maybeSingle(); if (!p) return setMsg("Kullanıcı bulunamadı."); const { error } = await sb.rpc("community_add_member", { cid: c.id, u: p.id }); setMem({ ...mem, [c.id]: "" }); done(error, `@${u} topluluğa eklendi.`); };
  const inp = "rounded-lg border border-line bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent";
  return (<div className="space-y-4"><div className="space-y-2 rounded-2xl border border-line bg-card p-4"><b className="text-sm">Yeni topluluk</b>
    <div className="flex flex-wrap gap-2"><input value={f.name} maxLength={40} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ad" className={inp} /><input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Açıklama" className={`${inp} min-w-0 flex-1`} /></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_public} onChange={(e) => setF({ ...f, is_public: e.target.checked })} />Herkese açık (herkes katılabilir). İşaretlenmezse yalnızca eklediğiniz üyeler girer.</label>
    {msg && <p role="status" className="text-sm text-accent">{msg}</p>}<button onClick={create} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on">Topluluk oluştur</button></div>
    {list.map((c) => <div key={c.id} className={`${card} space-y-2`}><p><b>{c.name}</b> <span className="text-xs opacity-60">{c.is_default ? "varsayılan (herkes üye)" : c.is_public ? "herkese açık" : "özel"}</span></p>{c.description && <p className="text-xs opacity-60">{c.description}</p>}
      <div className="flex flex-wrap gap-2">{c.channels.map((ch) => <span key={ch.id} className="flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs"># {ch.name} <span className="opacity-50">{ch.kind === "announce" ? "duyuru" : "sohbet"}</span><button aria-label={`${ch.name} kanalını sil`} onClick={async () => { if (confirm("Kanal ve mesajları silinsin mi?")) { const { error } = await sb.from("channels").delete().eq("id", ch.id); done(error); } }}>✕</button></span>)}</div>
      <div className="flex flex-wrap gap-2"><input value={chf[c.id]?.name ?? ""} maxLength={40} onChange={(e) => setChf({ ...chf, [c.id]: { name: e.target.value, kind: chf[c.id]?.kind ?? "chat" } })} placeholder="Yeni kanal adı" className={inp} />
        <select value={chf[c.id]?.kind ?? "chat"} onChange={(e) => setChf({ ...chf, [c.id]: { name: chf[c.id]?.name ?? "", kind: e.target.value } })} aria-label="Kanal türü" className={inp}><option value="chat">Sohbet (üyeler yazar)</option><option value="announce">Duyuru (yalnızca yetkililer)</option></select><button onClick={() => addCh(c)} className="rounded-lg border border-line px-3 text-xs font-semibold">Kanal ekle</button></div>
      {!c.is_default && <div className="flex flex-wrap gap-2"><input value={mem[c.id] ?? ""} onChange={(e) => setMem({ ...mem, [c.id]: e.target.value })} placeholder="Üye ekle (kullanıcı adı)" className={inp} /><button onClick={() => addMem(c)} className="rounded-lg border border-line px-3 text-xs font-semibold">Üye ekle</button>
        <button onClick={async () => { if (confirm("Topluluk ve tüm kanalları silinsin mi?")) { const { error } = await sb.from("communities").delete().eq("id", c.id); done(error); } }} className="ml-auto rounded-lg border border-red-500/50 px-3 text-xs text-red-500">Topluluğu sil</button></div>}</div>)}</div>);
}
export function VerifyTab() {
  const sb = supabase(); const [list, setList] = useState<{ id: string; message: string; created_at: string; profiles: { username: string } }[]>([]);
  const load = async () => { const { data } = await sb.from("verify_requests").select("id,message,created_at,profiles(username)").eq("status", "open").order("created_at"); setList((data as any) ?? []); }; useEffect(() => { load(); }, []);
  const res = async (id: string, approve: boolean) => { await sb.rpc("resolve_verify", { rid: id, approve }); load(); };
  return (<div className="space-y-3">{list.length === 0 && <p className="py-10 text-center opacity-60">Bekleyen doğrulama başvurusu yok.</p>}
    {list.map((v) => <div key={v.id} className={card}><p><b>@{v.profiles.username}</b> <span className="opacity-50">· {new Date(v.created_at).toLocaleDateString("tr-TR")}</span></p><p className="my-2 whitespace-pre-wrap">{v.message}</p>
      <div className="flex gap-2"><button onClick={() => res(v.id, true)} className="rounded-lg border border-line px-3 py-1 text-xs font-semibold">Onayla (rozet ver)</button><button onClick={() => res(v.id, false)} className="rounded-lg border border-line px-3 py-1 text-xs font-semibold">Reddet</button></div></div>)}</div>);
}
function Bars({ title, data, color }: { title: string; data: { day: string; v: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.v)); const w = 100 / Math.max(1, data.length); const sum = data.reduce((a, d) => a + d.v, 0);
  return (<div className={card}><p><b>{title}</b> <span className="opacity-60">(toplam {sum})</span></p>
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label={title} className="mt-2 h-24 w-full">{data.map((d, i) => <rect key={i} x={i * w + w * 0.1} y={40 - (d.v / max) * 38} width={w * 0.8} height={Math.max(0.6, (d.v / max) * 38)} fill={color}><title>{d.day}: {d.v}</title></rect>)}</svg>
    <div className="flex justify-between text-[10px] opacity-50"><span>{data[0]?.day}</span><span>en yüksek {max}</span><span>{data[data.length - 1]?.day}</span></div></div>);
}
export function ChartsTab() {
  const sb = supabase(); const [days, setDays] = useState(30); const [rows, setRows] = useState<{ day: string; new_users: number; posts: number; reports: number }[]>([]);
  useEffect(() => { sb.rpc("admin_daily_stats", { days }).then(({ data }) => setRows((data as any) ?? [])); }, [days]);
  const f = (k: "new_users" | "posts" | "reports") => rows.map((r) => ({ day: new Date(r.day).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }), v: Number(r[k]) }));
  return (<div className="space-y-3"><div className="flex gap-2">{[7, 30, 90].map((d) => <button key={d} onClick={() => setDays(d)} className={`rounded-xl px-3 py-1.5 text-sm ${days === d ? "bg-accent text-on" : "border border-line bg-card"}`}>Son {d} gün</button>)}</div>
    <Bars title="Yeni üyeler" data={f("new_users")} color="#7C3AED" /><Bars title="Gönderiler" data={f("posts")} color="#059669" /><Bars title="Şikâyetler" data={f("reports")} color="#DC2626" /></div>);
}
export function RewardsTab() {
  const sb = supabase(); const [ranks, setRanks] = useState<{ id: string; name: string; emoji: string | null; can_moderate: boolean }[]>([]); const [list, setList] = useState<{ id: string; invites_required: number; ranks: { name: string; emoji: string | null; color: string } }[]>([]);
  const [n, setN] = useState(5); const [rid, setRid] = useState(""); const [msg, setMsg] = useState("");
  const load = async () => { const { data: r } = await sb.from("ranks").select("id,name,emoji,can_moderate").eq("can_moderate", false).order("priority", { ascending: false }); setRanks(r ?? []); const { data } = await sb.from("invite_rewards").select("id,invites_required,ranks(name,emoji,color)").order("invites_required"); setList((data as any) ?? []); }; useEffect(() => { load(); }, []);
  const add = async () => { if (!rid) return setMsg("Bir rütbe seç."); const { error } = await sb.from("invite_rewards").insert({ invites_required: n, rank_id: rid }); setMsg(error ? (error.code === "23505" ? "Bu davet sayısı için zaten bir ödül var." : "Eklenemedi: " + error.message) : ""); load(); };
  return (<div className="space-y-3"><p className="text-sm opacity-70">Belirli sayıda kişi davet eden kullanıcıya otomatik rütbe verilir. Elle verilmiş rütbeler ezilmez. Moderasyon yetkili rütbeler ödül olamaz. Rütbeleri "Rütbeler" sekmesinde tasarlayın.</p>
    <div className="flex flex-wrap items-center gap-2"><input type="number" min={1} max={1000} value={n} onChange={(e) => setN(+e.target.value)} aria-label="Davet sayısı" className="w-20 rounded-lg border border-line bg-card px-2 py-1.5 text-sm" /><span className="text-sm">kişi davet edene</span>
      <select value={rid} onChange={(e) => setRid(e.target.value)} aria-label="Rütbe" className="rounded-lg border border-line bg-card px-2 py-1.5 text-sm"><option value="">rütbe seç</option>{ranks.map((r) => <option key={r.id} value={r.id}>{r.emoji} {r.name}</option>)}</select>
      <button onClick={add} className="rounded-xl bg-accent px-4 py-1.5 text-sm font-semibold text-on">Ödül ekle</button></div>
    {msg && <p role="alert" className="text-sm text-red-500">{msg}</p>}
    {list.map((r) => <div key={r.id} className={`${card} flex items-center gap-3`}><span>{r.invites_required} kişi →</span><b style={{ color: r.ranks.color }}>{r.ranks.emoji} {r.ranks.name}</b><button onClick={async () => { await sb.from("invite_rewards").delete().eq("id", r.id); load(); }} className="ml-auto rounded-lg border border-line px-3 py-1 text-xs">Sil</button></div>)}</div>);
}
