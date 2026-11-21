"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, ImagePlus, Pin, Trash2, Search, SquarePen, X, CheckCheck, Mic, Square, Camera, Reply, Users, Forward } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import RoleBadge, { Rank } from "./RoleBadge"; import GroupInfo from "./GroupInfo"; import ShareSheet from "./ShareSheet"; import Avatar from "./Avatar"; import Zoomable from "./Zoomable"; import GifPicker from "./GifPicker"; import { shrink } from "@/lib/shrink";
type Mem = { user_id: string; role: string; profiles: { username: string; avatar_url: string | null; last_seen: string | null; role: string; ranks: Rank } };
type Conv = { id: string; title: string | null; is_group: boolean; photo_url: string | null; conversation_members: Mem[] };
type Msg = { id: string; conversation_id: string; sender_id: string; body: string | null; image_url: string | null; audio_url: string | null; reply_to: string | null; forwarded: boolean; pinned: boolean; read_by: string[]; reactions: Record<string, string[]>; deleted: boolean; created_at: string };
type U = { id: string; username: string; avatar_url: string | null };
const EMO = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
const other = (c: Conv, me: string) => c.conversation_members.filter((m) => m.user_id !== me);
const nameOf = (c: Conv, me: string) => (c.is_group ? c.title ?? "Grup" : other(c, me)[0]?.profiles.username ?? "Sohbet");
const hm = (d: string) => new Date(d).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export default function Messages({ activeId }: { activeId?: string }) {
  const sb = supabase(); const [me, setMe] = useState(""); const [convs, setConvs] = useState<Conv[]>([]); const [last, setLast] = useState<Record<string, Msg>>({});
  const [unread, setUnread] = useState<Record<string, number>>({}); const [online, setOnline] = useState<Set<string>>(new Set()); const [nw, setNw] = useState(false); const [ready, setReady] = useState(false);
  const loadList = useCallback(async (uid: string) => {
    const { data } = await sb.from("conversations").select("id,title,is_group,photo_url,conversation_members(user_id,role,profiles(username,avatar_url,last_seen,role,ranks(name,color,emoji)))"); setConvs((data as any) ?? []);
    const { data: ms } = await sb.from("messages").select("*").order("created_at", { ascending: false }).limit(300);
    const l: Record<string, Msg> = {}, u: Record<string, number> = {};
    ((ms as Msg[]) ?? []).forEach((m) => { if (!l[m.conversation_id]) l[m.conversation_id] = m; if (m.sender_id !== uid && !m.deleted && !m.read_by.includes(uid)) u[m.conversation_id] = (u[m.conversation_id] ?? 0) + 1; });
    setLast(l); setUnread(u); setReady(true); }, []);
  useEffect(() => { sb.auth.getUser().then(({ data }) => { if (data.user) { setMe(data.user.id); loadList(data.user.id); } }); }, []);
  useEffect(() => { if (!me) return;
    const ch = sb.channel("dm-list-" + me).on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => loadList(me)).subscribe();
    const pr = sb.channel("online", { config: { presence: { key: me } } }); pr.on("presence", { event: "sync" }, () => setOnline(new Set(Object.keys(pr.presenceState())))).subscribe(async (s) => { if (s === "SUBSCRIBED") await pr.track({ at: Date.now() }); });
    return () => { sb.removeChannel(ch); sb.removeChannel(pr); }; }, [me]);
  const sorted = [...convs].sort((a, b) => (last[b.id]?.created_at ?? "9").localeCompare(last[a.id]?.created_at ?? "9"));
  const active = convs.find((c) => c.id === activeId);
  return (<div className="mx-auto flex h-[calc(100dvh-5rem)] max-w-[935px] md:h-screen md:border-x md:border-line">
    <aside className={`${activeId ? "hidden md:flex" : "flex"} w-full flex-col border-r border-line md:w-80 md:shrink-0`}>
      <div className="flex items-center justify-between p-4"><b className="text-lg">Mesajlar</b><button onClick={() => setNw(true)} aria-label="Yeni mesaj"><SquarePen /></button></div>
      <div className="flex-1 overflow-y-auto"><Link href="/topluluk" className="flex items-center gap-3 px-4 py-3 hover:bg-accent/10"><span className="grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-xl">📢</span><span><b className="block">Genel Topluluk</b><span className="text-sm opacity-60">Duyurular</span></span></Link>{ready && sorted.length === 0 && <p className="p-6 text-center text-sm opacity-60">Henüz sohbet yok. Sağ üstteki simgeyle başlat.</p>}
        {sorted.map((c) => { const o = other(c, me)[0]; const m = last[c.id]; const on = !c.is_group && o && online.has(o.user_id);
          return (<Link key={c.id} href={`/mesajlar/${c.id}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-accent/10 ${c.id === activeId ? "bg-accent/10" : ""}`}>
            <span className="relative"><Avatar url={c.is_group ? c.photo_url : o?.profiles.avatar_url} name={nameOf(c, me)} size={48} />{on && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-green-500" />}</span>
            <span className="min-w-0 flex-1"><b className="block truncate">{nameOf(c, me)}</b><span className={`block truncate text-sm ${unread[c.id] ? "font-semibold" : "opacity-60"}`}>{m ? (m.deleted ? "Mesaj silindi" : (m.sender_id === me ? "Sen: " : "") + (m.image_url ? "📷 Fotoğraf" : m.audio_url ? "🎤 Ses" : m.body)) : "Sohbeti başlat"}</span></span>
            {!!unread[c.id] && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-on">{unread[c.id]}</span>}</Link>); })}</div></aside>
    <section className={`${activeId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
      {active ? <Thread key={active.id} c={active} me={me} online={online} reload={() => loadList(me)} /> : <p className="m-auto p-6 text-center opacity-60">{activeId && !ready ? "Yükleniyor…" : activeId ? "Sohbet bulunamadı." : "Bir sohbet seç ya da yeni mesaj başlat."}</p>}</section>
    {nw && <NewChat me={me} onClose={() => setNw(false)} />}</div>);
}

function Thread({ c, me, online, reload }: { c: Conv; me: string; online: Set<string>; reload: () => void }) {
  const sb = supabase(); const [msgs, setMsgs] = useState<Msg[]>([]); const [t, setT] = useState(""); const [q, setQ] = useState(""); const [sch, setSch] = useState(false); const [menu, setMenu] = useState<string | null>(null); const [err, setErr] = useState(""); const end = useRef<HTMLDivElement>(null);
  const os = other(c, me); const markRead = () => sb.rpc("mark_read", { cid: c.id });
  useEffect(() => { let on = true;
    (async () => { const { data } = await sb.from("messages").select("*").eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(150); if (on) setMsgs(((data as Msg[]) ?? []).reverse()); markRead(); })();
    const ch = sb.channel("thr-" + c.id).on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${c.id}` }, (p: any) => { const m = p.new as Msg;
      setMsgs((ms) => p.eventType === "INSERT" ? (ms.some((x) => x.id === m.id) ? ms : [...ms, m]) : ms.map((x) => (x.id === m.id ? m : x))); if (p.eventType === "INSERT" && m.sender_id !== me) markRead(); }).subscribe();
    return () => { on = false; sb.removeChannel(ch); }; }, [c.id]);
  useEffect(() => { if (skip.current) { skip.current = false; return; } end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);
  async function send(img0?: File, snd?: File) { setErr(""); const img = img0 ? await shrink(img0) : undefined; let image_url: string | null = null; let audio_url: string | null = null;
    if (img) { if (!/^image\/(jpeg|png|webp)$/.test(img.type) || img.size > 10 * 1024 * 1024) return setErr("Fotoğraf JPG, PNG veya WebP olmalı; en fazla 10 MB.");
      const path = `${me}/dm-${crypto.randomUUID()}.${img.name.split(".").pop()}`; const { error } = await sb.storage.from("media").upload(path, img); if (error) return setErr("Fotoğraf yüklenemedi."); image_url = sb.storage.from("media").getPublicUrl(path).data.publicUrl; }
    else if (snd) { const path = `${me}/dm-${crypto.randomUUID()}.${snd.name.split(".").pop()}`; const { error } = await sb.storage.from("media").upload(path, snd); if (error) return setErr("Ses yüklenemedi."); audio_url = sb.storage.from("media").getPublicUrl(path).data.publicUrl; }
    else if (!t.trim()) return;
    const body = img || snd ? null : t.trim(); if (!img && !snd) setT("");
    const { data, error } = await sb.from("messages").insert({ conversation_id: c.id, sender_id: me, body, image_url, audio_url, reply_to: replyTo?.id ?? null, read_by: [me] }).select().single();
    if (error) return setErr("Mesaj gönderilemedi."); setReplyTo(null); setMsgs((ms) => (ms.some((x) => x.id === data.id) ? ms : [...ms, data as Msg])); }
  const react = (id: string, e: string) => { setMenu(null); sb.rpc("react", { mid: id, e }); };
  const pin = (m: Msg) => { setMenu(null); sb.from("messages").update({ pinned: !m.pinned }).eq("id", m.id).then(); };
  const del = (m: Msg) => { setMenu(null); sb.from("messages").update({ deleted: true, body: null, image_url: null, audio_url: null, pinned: false }).eq("id", m.id).then(); };
  const skip = useRef(false); const [done, setDone] = useState(false); const [res, setRes] = useState<Msg[] | null>(null); const [info, setInfo] = useState(false); const [fwd, setFwd] = useState<Msg | null>(null);
  useEffect(() => { const s = q.trim(); if (s.length < 2) { setRes(null); return; } setRes(null); const t = setTimeout(async () => { const { data } = await sb.rpc("search_messages", { cid: c.id, q: s }); setRes((data as Msg[]) ?? []); }, 350); return () => clearTimeout(t); }, [q]);
  async function loadOlder() { const first = msgs[0]; if (!first) return; const { data } = await sb.from("messages").select("*").eq("conversation_id", c.id).lt("created_at", first.created_at).order("created_at", { ascending: false }).limit(100);
    const rows = ((data as Msg[]) ?? []).reverse(); if (rows.length < 100) setDone(true); skip.current = true; setMsgs((ms) => [...rows, ...ms]); }
  const [gif, setGif] = useState(false); const [replyTo, setReplyTo] = useState<Msg | null>(null); const [typing, setTyping] = useState(false); const tch = useRef<any>(null); const tt = useRef<any>(null); const lastT = useRef(0);
  useEffect(() => { const ch = sb.channel("typing-" + c.id); ch.on("broadcast", { event: "typing" }, (p: any) => { if (p.payload?.u === me) return; setTyping(true); clearTimeout(tt.current); tt.current = setTimeout(() => setTyping(false), 2500); }).subscribe(); tch.current = ch; return () => { sb.removeChannel(ch); }; }, [c.id]);
  const notifyTyping = () => { if (Date.now() - lastT.current < 1500) return; lastT.current = Date.now(); tch.current?.send({ type: "broadcast", event: "typing", payload: { u: me } }); };
  const sendGif = async (url: string) => { setGif(false); const { data, error } = await sb.from("messages").insert({ conversation_id: c.id, sender_id: me, image_url: url, read_by: [me] }).select().single();
    if (error) return setErr("GIF gönderilemedi."); setMsgs((ms) => (ms.some((x) => x.id === data.id) ? ms : [...ms, data as Msg])); };
  const [rec, setRec] = useState(false); const mr = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]);
  async function toggleRec() { if (rec) { mr.current?.stop(); return; }
    try { const st = await navigator.mediaDevices.getUserMedia({ audio: true }); const r = new MediaRecorder(st); chunks.current = []; r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = () => { st.getTracks().forEach((x) => x.stop()); setRec(false); const type = (r.mimeType || "audio/webm").split(";")[0]; const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm"; send(undefined, new File(chunks.current, `ses.${ext}`, { type })); };
      r.start(); mr.current = r; setRec(true); } catch { setErr("Ses kaydı için mikrofon izni gerekli."); } }
  const shown = msgs;
  const pinned = msgs.filter((m) => m.pinned && !m.deleted).slice(-1)[0]; const lastMine = [...msgs].reverse().find((m) => m.sender_id === me && !m.deleted);
  const allRead = !!lastMine && os.every((o) => lastMine.read_by.includes(o.user_id));
  const sub = c.is_group ? `${c.conversation_members.length} üye` : os[0] && online.has(os[0].user_id) ? "Çevrimiçi" : os[0]?.profiles.last_seen ? "Son görülme: " + new Date(os[0].profiles.last_seen).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  return (<>
    <header className="flex items-center gap-3 border-b border-line p-3"><Link href="/mesajlar" aria-label="Geri" className="md:hidden"><ArrowLeft /></Link>
      {sch ? <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mesajlarda ara" className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 outline-none focus:border-accent" />
        : <><Avatar url={c.is_group ? c.photo_url : os[0]?.profiles.avatar_url} name={nameOf(c, me)} size={40} /><span className="min-w-0 flex-1"><b className="block truncate">{nameOf(c, me)}{!c.is_group && os[0] && <RoleBadge role={os[0].profiles.role} rank={os[0].profiles.ranks} />}</b><span className="text-xs opacity-60">{typing ? "yazıyor…" : sub}</span></span></>}
      {c.is_group && <button onClick={() => setInfo(true)} aria-label="Grup bilgisi"><Users /></button>}<button onClick={() => { setSch(!sch); setQ(""); }} aria-label="Ara">{sch ? <X /> : <Search />}</button></header>
    {info && c.is_group && <GroupInfo id={c.id} title={c.title ?? ""} members={c.conversation_members as any} me={me} onClose={() => setInfo(false)} onChanged={reload} />}
    {pinned && <div className="flex items-center gap-2 border-b border-line bg-accent/10 px-3 py-2 text-sm"><Pin size={14} className="shrink-0 text-accent" /><span className="truncate">{pinned.body ?? "📷 Fotoğraf"}</span></div>}
    <div className="flex-1 space-y-2 overflow-y-auto p-3" onClick={() => setMenu(null)}>
      {msgs.length >= 150 && !done && <button onClick={loadOlder} className="mx-auto block rounded-full border border-line px-3 py-1 text-xs">Daha eski mesajlar</button>}
      {q.trim().length >= 2 && <div className="space-y-1 rounded-xl border border-line bg-card p-2 text-sm">{res === null ? <p className="opacity-60">Aranıyor…</p> : res.length === 0 ? <p className="opacity-60">Sonuç yok.</p> : res.map((r) => <button key={r.id} onClick={() => { const el = document.getElementById(`m-${r.id}`); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); setSch(false); setQ(""); } }} className="block w-full rounded-lg p-2 text-left hover:bg-accent/10"><span className="text-xs opacity-60">{new Date(r.created_at).toLocaleDateString("tr-TR")} · </span>{r.body}</button>)}</div>}
      {shown.map((m) => { const mine = m.sender_id === me; const who = os.find((o) => o.user_id === m.sender_id)?.profiles.username;
        return (<div key={m.id} id={`m-${m.id}`} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
          {c.is_group && !mine && <span className="px-1 text-xs opacity-60">{who}</span>}
          <div role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setMenu(menu === m.id ? null : m.id); }} className={`max-w-[80%] cursor-pointer break-words rounded-2xl px-3 py-2 text-left text-sm ${m.deleted ? "italic opacity-50 border border-line" : mine ? "bg-accent text-on" : "bg-card border border-line"}`}>
            {m.deleted ? "Mesaj silindi" : <>{m.forwarded && <span className="mb-1 block text-[10px] opacity-70">↪ İletildi</span>}{m.reply_to && (() => { const q = msgs.find((x) => x.id === m.reply_to); return <span onClick={(e) => { e.stopPropagation(); document.getElementById(`m-${m.reply_to}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="mb-1 block cursor-pointer rounded-lg border-l-2 border-current bg-black/10 px-2 py-1 text-xs opacity-80">{!q ? "Mesaj" : q.deleted ? "Mesaj silindi" : q.body ?? (q.image_url ? "📷 Fotoğraf" : "🎤 Ses")}</span>; })()}{m.image_url && <Zoomable src={m.image_url} className="mb-1 max-h-64 rounded-xl" />}{m.audio_url && <audio controls src={m.audio_url} className="max-w-full" />}{m.body && <Linkify text={m.body} />}</>}{m.pinned && !m.deleted && <Pin size={11} className="ml-1 inline" />}</div>
          {Object.keys(m.reactions ?? {}).length > 0 && <span className="-mt-1 flex gap-1">{Object.entries(m.reactions).map(([e, u]) => <button key={e} onClick={() => react(m.id, e)} className={`rounded-full border px-1.5 text-xs ${u.includes(me) ? "border-accent bg-accent/15" : "border-line bg-card"}`}>{e} {u.length}</button>)}</span>}
          {menu === m.id && !m.deleted && <div onClick={(e) => e.stopPropagation()} className="my-1 flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 shadow">{EMO.map((e) => <button key={e} onClick={() => react(m.id, e)} className="text-lg">{e}</button>)}
            <button onClick={() => { setFwd(m); setMenu(null); }} aria-label="İlet"><Forward size={16} /></button>
            <button onClick={() => { setReplyTo(m); setMenu(null); }} aria-label="Yanıtla"><Reply size={16} /></button>
            <button onClick={() => pin(m)} aria-label="Sabitle"><Pin size={16} className={m.pinned ? "text-accent" : ""} /></button>{mine && <button onClick={() => del(m)} aria-label="Sil"><Trash2 size={16} /></button>}</div>}
          <span className="px-1 text-[10px] opacity-50">{hm(m.created_at)}{mine && m.id === lastMine?.id && <CheckCheck size={12} className={`ml-1 inline ${allRead ? "text-accent" : ""}`} />}{mine && m.id === lastMine?.id && allRead && " Okundu"}</span></div>); })}<div ref={end} /></div>
    {err && <p role="alert" className="px-3 text-sm text-red-500">{err}</p>}
    {replyTo && <div className="flex items-center gap-2 border-t border-line bg-accent/10 px-3 py-2 text-xs"><Reply size={14} /><span className="min-w-0 flex-1 truncate">{replyTo.body ?? (replyTo.image_url ? "📷 Fotoğraf" : "🎤 Ses")}</span><button onClick={() => setReplyTo(null)} aria-label="Yanıtı iptal et"><X size={14} /></button></div>}
    <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-line p-3">
      <label className="cursor-pointer opacity-70" aria-label="Fotoğraf gönder"><ImagePlus /><input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; send(f); }} /></label>
      <button type="button" onClick={() => setGif(true)} aria-label="GIF gönder" className="rounded-md border border-line px-1.5 text-xs font-bold opacity-70">GIF</button>
      <label className="cursor-pointer opacity-70" aria-label="Kamerayla fotoğraf çek"><Camera /><input type="file" hidden accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; send(f); }} /></label>
      <input value={t} onChange={(e) => { setT(e.target.value); notifyTyping(); }} maxLength={2000} placeholder={rec ? "Kaydediliyor… (göndermek için ■)" : "Mesaj yaz…"} className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2.5 outline-none focus:border-accent" />
      <button type="button" onClick={toggleRec} aria-label={rec ? "Kaydı bitir ve gönder" : "Ses kaydet"} className={`rounded-full p-2.5 ${rec ? "animate-pulse bg-red-500 text-white" : "border border-line"}`}>{rec ? <Square size={18} /> : <Mic size={18} />}</button><button aria-label="Gönder" className="rounded-full bg-accent p-2.5 text-on"><Send size={18} /></button></form>{fwd && <ShareSheet forward={{ body: fwd.body, image_url: fwd.image_url, audio_url: fwd.audio_url }} onClose={() => setFwd(null)} />}{gif && <GifPicker onPick={sendGif} onClose={() => setGif(false)} />}</>);
}

function NewChat({ me, onClose }: { me: string; onClose: () => void }) {
  const sb = supabase(); const router = useRouter(); const [q, setQ] = useState(""); const [list, setList] = useState<U[]>([]); const [sel, setSel] = useState<U[]>([]); const [title, setTitle] = useState(""); const [err, setErr] = useState("");
  useEffect(() => { if (!me) return; const s = q.trim().replace(/[%,()*\\]/g, ""); const tm = setTimeout(async () => { let x = sb.from("profiles").select("id,username,avatar_url").neq("id", me).limit(15); if (s) x = x.ilike("username", `%${s}%`); const { data } = await x; setList((data as U[]) ?? []); }, 200); return () => clearTimeout(tm); }, [q, me]);
  const tog = (u: U) => setSel((s) => (s.some((x) => x.id === u.id) ? s.filter((x) => x.id !== u.id) : [...s, u]));
  const go = async () => { if (!sel.length) return; const r = sel.length === 1 ? await sb.rpc("start_dm", { other: sel[0].id }) : await sb.rpc("create_group", { t: title, members: sel.map((x) => x.id) });
    if (r.error || !r.data) return setErr("Sohbet başlatılamadı (engellenmiş olabilirsin)."); onClose(); router.push(`/mesajlar/${r.data}`); };
  return (<div role="dialog" aria-label="Yeni mesaj" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}><div onClick={(e) => e.stopPropagation()} className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-2xl border border-line bg-card">
    <div className="flex items-center justify-between p-4"><b>Yeni mesaj</b><button onClick={onClose} aria-label="Kapat"><X /></button></div>
    <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kullanıcı ara" className="mx-4 rounded-xl border border-line bg-bg px-3 py-2 outline-none focus:border-accent" />
    {sel.length > 1 && <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={50} placeholder="Grup adı" className="mx-4 mt-2 rounded-xl border border-line bg-bg px-3 py-2 outline-none focus:border-accent" />}
    <div className="mt-2 flex-1 overflow-y-auto px-2">{list.map((u) => <button key={u.id} onClick={() => tog(u)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-accent/10"><Avatar url={u.avatar_url} name={u.username} size={40} /><span className="flex-1">{u.username}</span>{sel.some((x) => x.id === u.id) && <span className="text-accent">✓</span>}</button>)}</div>
    {err && <p className="px-4 text-sm text-red-500">{err}</p>}
    <button onClick={go} disabled={!sel.length} className="m-4 rounded-xl bg-accent py-2.5 font-semibold text-on disabled:opacity-50">{sel.length > 1 ? `Grup oluştur (${sel.length})` : "Sohbet et"}</button></div></div>);
}

function Linkify({ text }: { text: string }) {
  return <>{text.split(/(https?:\/\/[^\s]+)/g).map((p, i) => { if (!/^https?:\/\//.test(p)) return p;
    const post = /\/p\/([0-9a-f-]{36})/i.exec(p); if (post) return <a key={i} href={`/p/${post[1]}`} onClick={(e) => e.stopPropagation()} className="font-semibold underline">📎 Gönderiyi aç</a>;
    return <a key={i} href={p} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="underline">{p}</a>; })}</>;
}
