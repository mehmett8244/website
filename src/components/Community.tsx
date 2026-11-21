"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { shrink } from "@/lib/shrink";
import Avatar from "./Avatar"; import RoleBadge, { Rank } from "./RoleBadge"; import Rich from "./Rich"; import Zoomable from "./Zoomable";
type Ch = { id: string; name: string; kind: string; staff_only: boolean; position: number };
type Com = { id: string; name: string; description: string; is_default: boolean; is_public: boolean; channels: Ch[] };
type CP = { id: string; body: string; image_url: string | null; created_at: string; author_id: string; profiles: { username: string; avatar_url: string | null; role: string; ranks: Rank } };
export default function Community() {
  const sb = supabase(); const [me, setMe] = useState(""); const [staff, setStaff] = useState(false); const [all, setAll] = useState<Com[]>([]); const [mem, setMem] = useState<Set<string>>(new Set()); const coms = all.filter((c) => mem.has(c.id)); const [ci, setCi] = useState(0); const [chId, setChId] = useState("");
  const [posts, setPosts] = useState<CP[]>([]); const [text, setText] = useState(""); const [file, setFile] = useState<File | null>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [ready, setReady] = useState(false);
  useEffect(() => { (async () => { const { data: { user } } = await sb.auth.getUser(); setMe(user?.id ?? ""); const { data: s } = await sb.rpc("is_staff"); setStaff(!!s);
    const { data } = await sb.from("communities").select("id,name,description,is_default,is_public,channels(id,name,kind,staff_only,position)").order("is_default", { ascending: false }); const list = ((data as unknown as Com[]) ?? []).map((c) => ({ ...c, channels: [...c.channels].sort((a, b) => a.position - b.position) }));
    const { data: mm } = await sb.from("community_members").select("community_id").eq("user_id", user?.id ?? ""); const ms = new Set((mm ?? []).map((x) => x.community_id)); setAll(list); setMem(ms);
    const first = list.find((c) => ms.has(c.id)); if (first?.channels[0]) setChId(first.channels[0].id); setReady(true); })(); }, []);
  const loadPosts = useCallback(async () => { if (!chId) return; const { data } = await sb.from("channel_posts").select("id,body,image_url,created_at,author_id,profiles!channel_posts_author_id_fkey(username,avatar_url,role,ranks(name,color,emoji))").eq("channel_id", chId).order("created_at", { ascending: false }).limit(50); setPosts((data as unknown as CP[]) ?? []); }, [chId]);
  useEffect(() => { loadPosts(); if (!chId) return; const ch = sb.channel("cp-" + chId).on("postgres_changes", { event: "*", schema: "public", table: "channel_posts", filter: `channel_id=eq.${chId}` }, loadPosts).subscribe(); return () => { sb.removeChannel(ch); }; }, [chId, loadPosts]);
  const com = coms[ci]; const ch = com?.channels.find((c) => c.id === chId); const canPost = !!ch && (staff || !ch.staff_only);
  async function send() { if (!text.trim() || !ch) return; setBusy(true); setErr(""); let image_url: string | null = null;
    if (file) { const f = await shrink(file); if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 10 * 1024 * 1024) { setBusy(false); return setErr("Fotoğraf JPG, PNG veya WebP olmalı; en fazla 10 MB."); }
      const path = `${me}/cp-${crypto.randomUUID()}.${f.name.split(".").pop()}`; const { error } = await sb.storage.from("media").upload(path, f); if (error) { setBusy(false); return setErr("Fotoğraf yüklenemedi."); } image_url = sb.storage.from("media").getPublicUrl(path).data.publicUrl; }
    const { error } = await sb.from("channel_posts").insert({ channel_id: ch.id, author_id: me, body: text.trim(), image_url }); setBusy(false); if (error) return setErr("Paylaşılamadı: " + error.message); setText(""); setFile(null); loadPosts(); }
  const join = async (id: string) => { const { error } = await sb.rpc("join_community", { cid: id }); if (error) setErr(error.message); else location.reload(); };
  const leave = async (id: string) => { if (confirm("Topluluktan ayrılmak istiyor musun?")) { await sb.rpc("leave_community", { cid: id }); location.reload(); } };
  const del = async (id: string) => { if (confirm("Duyuru silinsin mi?")) { await sb.from("channel_posts").delete().eq("id", id); loadPosts(); } };
  if (ready && !com) return <p className="p-10 text-center opacity-60">Henüz bir topluluğa üye değilsin.</p>;
  return (<div className="mx-auto max-w-[560px] px-3 py-4"><div className="mb-3 flex items-center gap-3"><Link href="/mesajlar" aria-label="Geri"><ArrowLeft /></Link><div><h1 className="text-lg font-bold">{com?.name ?? "Topluluk"}</h1><p className="text-xs opacity-60">{com?.description}</p></div>{com && !com.is_default && <button onClick={() => leave(com.id)} className="ml-auto text-xs opacity-60 underline">Ayrıl</button>}</div>
    {all.some((c) => !mem.has(c.id) && c.is_public) && <div className="mb-3 space-y-2 rounded-2xl border border-line bg-card p-3"><b className="text-sm">Katılabileceğin topluluklar</b>{all.filter((c) => !mem.has(c.id) && c.is_public).map((c) => <div key={c.id} className="flex items-center justify-between gap-2 text-sm"><span><b>{c.name}</b> <span className="opacity-60">{c.description}</span></span><button onClick={() => join(c.id)} className="shrink-0 rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-on">Katıl</button></div>)}</div>}
    {coms.length > 1 && <div className="mb-2 flex gap-2 overflow-x-auto">{coms.map((c, i) => <button key={c.id} onClick={() => { setCi(i); setChId(c.channels[0]?.id ?? ""); }} className={`shrink-0 rounded-xl px-3 py-1.5 text-sm ${i === ci ? "bg-accent text-on" : "border border-line bg-card"}`}>{c.name}</button>)}</div>}
    <div className="mb-3 flex gap-2 overflow-x-auto">{com?.channels.map((c) => <button key={c.id} onClick={() => setChId(c.id)} className={`shrink-0 rounded-full px-3 py-1 text-sm ${c.id === chId ? "bg-accent/20 font-semibold text-accent" : "border border-line"}`}># {c.name}</button>)}</div>
    {canPost ? <div className="mb-4 space-y-2 rounded-2xl border border-line bg-card p-3"><textarea value={text} maxLength={4000} rows={3} onChange={(e) => setText(e.target.value)} placeholder={ch?.kind === "announce" ? "Duyuru yaz…" : "Mesaj yaz…"} className="w-full resize-none bg-transparent outline-none" />
      {err && <p role="alert" className="text-sm text-red-500">{err}</p>}<div className="flex items-center justify-between"><label className="flex cursor-pointer items-center gap-2 text-sm opacity-70"><ImagePlus size={18} />{file ? file.name.slice(0, 18) : "Fotoğraf"}<input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        <button disabled={busy} onClick={send} className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-on disabled:opacity-60">{busy ? "…" : "Paylaş"}</button></div></div>
      : ch && <p className="mb-4 rounded-xl bg-accent/10 p-3 text-sm">Bu kanala yalnızca yetkililer duyuru paylaşabilir. Üyeler okuyabilir.</p>}
    {ready && posts.length === 0 && <p className="py-10 text-center opacity-60">Henüz duyuru yok.</p>}
    <div className="space-y-3">{posts.map((p) => <article key={p.id} className="rounded-2xl border border-line bg-card p-4"><header className="mb-2 flex items-center gap-2"><Avatar url={p.profiles.avatar_url} name={p.profiles.username} size={32} /><b className="text-sm">{p.profiles.username}</b><RoleBadge role={p.profiles.role} rank={p.profiles.ranks} />
      <span className="ml-auto text-xs opacity-50">{new Date(p.created_at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>{(p.author_id === me || staff) && <button onClick={() => del(p.id)} aria-label="Sil" className="opacity-60"><Trash2 size={16} /></button>}</header>
      <p className="whitespace-pre-wrap break-words text-sm"><Rich text={p.body} /></p>{p.image_url && <Zoomable src={p.image_url} className="mt-3 w-full rounded-xl" />}</article>)}</div></div>);
}
