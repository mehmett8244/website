"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { enablePush, disablePush, pushEnabled, pushSupported } from "@/lib/push";
import { RESERVED } from "@/lib/reserved";
type Prefs = { likes: boolean; comments: boolean; follows: boolean; messages: boolean; mentions: boolean; announcements: boolean; push: boolean };
const LBL: [keyof Prefs, string][] = [["likes", "Beğeniler"], ["comments", "Yorumlar ve yanıtlar"], ["follows", "Takip ve takip istekleri"], ["messages", "Mesajlar (telefon bildirimi)"], ["mentions", "Etiketlenmeler"], ["announcements", "Topluluk duyuruları"], ["push", "Telefon bildirimleri (push)"]];
export default function Settings() {
  const sb = supabase(); const [uid, setUid] = useState(""); const [code, setCode] = useState(""); const [banned, setBanned] = useState(false); const [verified, setVerified] = useState(false); const [uname, setUname] = useState(""); const [recov, setRecov] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ likes: true, comments: true, follows: true, messages: true, mentions: true, announcements: true, push: true });
  const [warns, setWarns] = useState<{ id: string; reason: string; read: boolean; created_at: string }[]>([]); const [mutes, setMutes] = useState<{ blocked_id: string; muted_only: boolean; profiles: { username: string } }[]>([]);
  const [invited, setInvited] = useState<{ username: string }[]>([]); const [rewards, setRewards] = useState<{ invites_required: number; ranks: { name: string; emoji: string | null } }[]>([]);
  const [appeals, setAppeals] = useState<{ id: string; message: string; status: string }[]>([]); const [at, setAt] = useState(""); const [vreq, setVreq] = useState<{ status: string } | null>(null); const [vt, setVt] = useState("");
  const [cur, setCur] = useState(""); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [email, setEmail] = useState(""); const [pushOn, setPushOn] = useState(false); const [msg, setMsg] = useState("");
  const load = async () => { const { data: { user } } = await sb.auth.getUser(); if (!user) return; setUid(user.id);
    const { data: p } = await sb.from("profiles").select("username,invite_code,banned,is_verified").eq("id", user.id).maybeSingle(); setCode(p?.invite_code ?? ""); setBanned(!!p?.banned); setVerified(!!p?.is_verified); setUname(p?.username ?? "");
    const { data: n } = await sb.from("notification_prefs").select("likes,comments,follows,messages,mentions,announcements,push").eq("user_id", user.id).maybeSingle(); if (n) setPrefs(n);
    const { data: w } = await sb.from("warnings").select("id,reason,read,created_at").eq("user_id", user.id).order("created_at", { ascending: false }); setWarns(w ?? []);
    const { data: m } = await sb.from("blocks").select("blocked_id,muted_only,profiles!blocks_blocked_id_fkey(username)").eq("blocker_id", user.id); setMutes((m as any) ?? []);
    const { data: i } = await sb.from("profiles").select("username").eq("invited_by", user.id); setInvited(i ?? []);
    const { data: rw } = await sb.from("invite_rewards").select("invites_required,ranks(name,emoji)").order("invites_required"); setRewards((rw as any) ?? []);
    const { data: a } = await sb.from("appeals").select("id,message,status").eq("user_id", user.id).order("created_at", { ascending: false }); setAppeals(a ?? []);
    const { data: v } = await sb.from("verify_requests").select("status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(); setVreq(v); setPushOn(await pushEnabled());
    if ((w ?? []).some((x) => !x.read)) await sb.from("warnings").update({ read: true }).eq("user_id", user.id).eq("read", false); };
  useEffect(() => { load(); setRecov(location.search.includes("sifre")); }, []);
  const setP = async (k: keyof Prefs, v: boolean) => { setMsg(""); const next = { ...prefs, [k]: v }; setPrefs(next);
    if (k === "push") { if (v) { const e = await enablePush(); if (e) { setMsg(e); setPrefs({ ...next, push: false }); return; } setPushOn(true); } else { await disablePush(); setPushOn(false); } }
    await sb.from("notification_prefs").upsert({ user_id: uid, ...next }); };
  const unblock = async (id: string) => { await sb.from("blocks").delete().match({ blocker_id: uid, blocked_id: id }); load(); };
  const link = typeof window !== "undefined" ? `${location.origin}/giris?davet=${code}` : "";
  const copy = async () => { try { await navigator.clipboard.writeText(link); setMsg("Davet bağlantısı kopyalandı."); } catch { prompt("Davet bağlantın:", link); } };
  const appeal = async () => { const { error } = await sb.from("appeals").insert({ user_id: uid, message: at.trim() }); setMsg(error ? (error.message.includes("one_open") ? "Zaten bekleyen bir itirazın var." : "İtiraz gönderilemedi (en az 5 karakter yaz).") : "İtirazın yetkililere iletildi."); setAt(""); load(); };
  const changePw = async () => { setMsg("");
    if (pw.length < 8) return setMsg("Yeni şifre en az 8 karakter olmalı."); if (pw !== pw2) return setMsg("Yeni şifreler eşleşmiyor.");
    if (!recov) { if (!cur) return setMsg("Mevcut şifreni yaz."); const { data: { user } } = await sb.auth.getUser(); const { error: e0 } = await sb.auth.signInWithPassword({ email: user?.email ?? "", password: cur }); if (e0) return setMsg("Mevcut şifre hatalı."); }
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) { const m = error.message.toLowerCase();
      return setMsg(m.includes("different") || m.includes("same") ? "Yeni şifre eskisiyle aynı olamaz." : m.includes("weak") || m.includes("character") ? "Şifre çok zayıf; harf, rakam ve sembol kullan." : m.includes("reauth") ? "Güvenlik için çıkış yapıp yeniden giriş yap, sonra tekrar dene." : m.includes("session") ? "Oturum bulunamadı. Şifre sıfırlama bağlantısını yeniden iste." : "Şifre değiştirilemedi: " + error.message); }
    await sb.auth.signOut({ scope: "others" }); setCur(""); setPw(""); setPw2(""); setMsg("Şifren güncellendi. Diğer cihazlardaki oturumların kapatıldı."); };
  const changeEmail = async () => { if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg("Geçerli bir e-posta yaz."); const { error } = await sb.auth.updateUser({ email }, { emailRedirectTo: `${location.origin}/auth/callback?next=/ayarlar` }); setMsg(error ? "E-posta değiştirilemedi: " + error.message : "Onay bağlantısı e-postana gönderildi. Bağlantıya tıklayınca değişiklik tamamlanır."); if (!error) setEmail(""); };
  const changeName = async () => { const u = uname.trim().toLowerCase(); if (!/^[a-z0-9_]{3,20}$/.test(u)) return setMsg("Kullanıcı adı 3-20 karakter; küçük harf, rakam veya _ içermeli."); if (RESERVED.includes(u)) return setMsg("Bu kullanıcı adı kullanılamaz.");
    const { error } = await sb.from("profiles").update({ username: u }).eq("id", uid); setMsg(error ? (error.code === "23505" ? "Bu kullanıcı adı alınmış." : "Kullanıcı adı değiştirilemedi.") : "Kullanıcı adın güncellendi."); setUname(u); };
  const applyVerify = async () => { const { error } = await sb.from("verify_requests").insert({ user_id: uid, message: vt.trim() }); setMsg(error ? (error.message.includes("one_open") ? "Zaten bekleyen bir başvurun var." : "Başvuru gönderilemedi (en az 5 karakter yaz).") : "Başvurun alındı, yöneticiler inceleyecek."); setVt(""); load(); };
  const card = "space-y-3 rounded-2xl border border-line bg-card p-4"; const inp = "w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"; const btn = "rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on";
  return (<div className="mx-auto max-w-[560px] space-y-4 p-4"><div className="flex items-center gap-3"><Link href="/" aria-label="Geri"><ArrowLeft /></Link><h1 className="text-lg font-bold">Ayarlar</h1></div>
    {msg && <p role="status" className="rounded-xl bg-accent/10 p-3 text-sm">{msg}</p>}
    {banned && <section className={card}><b className="text-red-500">Hesabın askıya alındı</b><p className="text-sm opacity-70">Paylaşım yapamazsın. Karara itiraz edebilirsin.</p>
      {appeals.map((a) => <p key={a.id} className="text-sm">• {a.message} <span className="opacity-60">({a.status === "open" ? "inceleniyor" : a.status === "accepted" ? "kabul edildi" : "reddedildi"})</span></p>)}
      <textarea value={at} maxLength={1000} rows={3} onChange={(e) => setAt(e.target.value)} placeholder="İtiraz nedenini yaz" className={inp} /><button onClick={appeal} className={btn}>İtiraz gönder</button></section>}
    {warns.length > 0 && <section className={card}><b>Yetkili uyarıları</b>{warns.map((w) => <p key={w.id} className="text-sm">⚠️ {w.reason} <span className="opacity-50">· {new Date(w.created_at).toLocaleDateString("tr-TR")}</span></p>)}</section>}
    <section id="sifre" className={`${card} ${recov ? "ring-2 ring-accent" : ""}`}><b>Hesap</b>{recov && <p className="text-sm text-accent">Yeni şifreni aşağıdan belirle.</p>}
      <div className="space-y-2"><p className="text-sm opacity-70">Şifre değiştir</p>{!recov && <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="Mevcut şifre" autoComplete="current-password" className={inp} />}<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Yeni şifre (en az 8 karakter)" autoComplete="new-password" className={inp} /><input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Yeni şifre (tekrar)" autoComplete="new-password" className={inp} /><button onClick={changePw} className={btn}>Şifreyi güncelle</button></div>
      <div className="space-y-2"><p className="text-sm opacity-70">E-posta değiştir</p><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Yeni e-posta adresi" className={inp} /><button onClick={changeEmail} className={btn}>E-postayı değiştir</button></div>
      <div className="space-y-2"><p className="text-sm opacity-70">Kullanıcı adı</p><input value={uname} maxLength={20} onChange={(e) => setUname(e.target.value.toLowerCase())} className={inp} /><button onClick={changeName} className={btn}>Kullanıcı adını güncelle</button></div></section>
    <section className={card}><b>Doğrulama rozeti</b>{verified ? <p className="text-sm text-accent">Hesabın doğrulandı ✓</p> : vreq?.status === "open" ? <p className="text-sm opacity-70">Başvurun inceleniyor.</p> : <>
      {vreq?.status === "rejected" && <p className="text-sm opacity-70">Önceki başvurun kabul edilmedi, yeniden başvurabilirsin.</p>}
      <textarea value={vt} maxLength={1000} rows={3} onChange={(e) => setVt(e.target.value)} placeholder="Neden doğrulanmak istiyorsun? (tanınırlığın, bağlantıların…)" className={inp} /><button onClick={applyVerify} className={btn}>Başvur</button></>}</section>
    <section className={card}><b>Bildirimler</b>{LBL.map(([k, l]) => <label key={k} className="flex items-center justify-between text-sm">{l}<input type="checkbox" checked={prefs[k]} disabled={k === "push" && !pushSupported() && !prefs.push} onChange={(e) => setP(k, e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" /></label>)}
      {!pushSupported() && <p className="text-xs opacity-60">Telefon bildirimi için sitenin yapılandırılmış olması ve tarayıcının desteklemesi gerekir (iPhone'da siteyi ana ekrana ekleyin).</p>}{pushOn && <p className="text-xs text-accent">Bu cihazda bildirimler açık.</p>}</section>
    <section className={card}><b>Sessize alınanlar ve engelliler</b>{mutes.length === 0 && <p className="text-sm opacity-60">Kimse yok.</p>}
      {mutes.map((m) => <div key={m.blocked_id} className="flex items-center justify-between text-sm"><span>@{m.profiles.username} <span className="opacity-60">({m.muted_only ? "sessiz" : "engelli"})</span></span><button onClick={() => unblock(m.blocked_id)} className="rounded-lg border border-line px-3 py-1 text-xs">Kaldır</button></div>)}</section>
    <section className={card}><b>Arkadaşını davet et</b><p className="break-all rounded-xl bg-bg p-2 text-xs">{link}</p><button onClick={copy} className={btn}>Bağlantıyı kopyala</button>
      <p className="text-sm opacity-70">Seni kullanarak katılanlar: {invited.length}</p>
      {rewards.length > 0 && <div className="space-y-1 text-sm"><p className="opacity-70">Davet ödülleri</p>{rewards.map((r) => <p key={r.invites_required}>{invited.length >= r.invites_required ? "✅" : "🎯"} {r.invites_required} kişi davet et → <b>{r.ranks.emoji} {r.ranks.name}</b> rütbesi <span className="opacity-50">({Math.min(invited.length, r.invites_required)}/{r.invites_required})</span></p>)}</div>}
      {invited.map((i) => <Link key={i.username} href={`/${i.username}`} className="block text-sm text-accent">@{i.username}</Link>)}</section></div>);
}
