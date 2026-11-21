"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Grid3x3, Bookmark, Lock, BadgeCheck, Heart, MessageCircle, ArrowLeft, Pin } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Highlights from "./Highlights"; import Avatar from "./Avatar"; import RoleBadge, { Rank } from "./RoleBadge"; import { shrink } from "@/lib/shrink"; import ReportButton from "./ReportButton"; import FollowList from "./FollowList";
type P = { id: string; username: string; display_name: string | null; bio: string | null; avatar_url: string | null; cover_url: string | null; theme_color: string | null; is_private: boolean; is_verified: boolean; role: string; ranks: Rank };
type T = { id: string; body: string | null; media_url: string | null; media_type: string | null; likes: { user_id: string }[]; comments: { id: string }[]; pinned: boolean };
const COLORS = ["#7C3AED", "#DB2777", "#EA580C", "#059669", "#0284C7", "#475569"];
const SEL = "id,body,media_url,media_type,likes(user_id),comments(id),pinned";
export default function ProfileView({ username }: { username: string }) {
  const sb = supabase(); const [me, setMe] = useState(""); const [p, setP] = useState<P | null>(null); const [miss, setMiss] = useState(false);
  const [st, setSt] = useState({ posts: 0, followers: 0, following: 0 }); const [rel, setRel] = useState<string | null>(null); const [tab, setTab] = useState<"posts" | "saved">("posts");
  const [items, setItems] = useState<T[]>([]); const [edit, setEdit] = useState(false); const [reqs, setReqs] = useState<{ follower_id: string; profiles: { username: string } }[]>([]);
  const [msg, setMsg] = useState(""); const [blocked, setBlocked] = useState(false); const [muted, setMuted] = useState(false); const [lst, setLst] = useState<"followers" | "following" | null>(null); const router = useRouter(); const [f, setF] = useState({ display_name: "", bio: "", is_private: false });
  const load = useCallback(async () => {
    const { data: { user } } = await sb.auth.getUser(); const uid = user?.id ?? ""; setMe(uid);
    const { data } = await sb.from("profiles").select("id,username,display_name,bio,avatar_url,cover_url,theme_color,is_private,is_verified,role,ranks(name,color,emoji)").eq("username", username).maybeSingle();
    if (!data) return setMiss(true);
    setP(data as any); setF({ display_name: data.display_name ?? "", bio: data.bio ?? "", is_private: data.is_private });
    const { data: s } = await sb.rpc("profile_stats", { u: data.id }); if (s) setSt(s);
    if (uid !== data.id) { const { data: b } = await sb.from("blocks").select("blocked_id,muted_only").match({ blocker_id: uid, blocked_id: data.id }).maybeSingle(); setBlocked(!!b && !b.muted_only); setMuted(!!b && !!b.muted_only); const { data: r } = await sb.from("follows").select("status").match({ follower_id: uid, following_id: data.id }).maybeSingle(); setRel(r?.status ?? null); }
    else { const { data: q } = await sb.from("follows").select("follower_id,profiles!follows_follower_id_fkey(username)").eq("following_id", uid).eq("status", "pending"); setReqs((q as any) ?? []); }
  }, [username]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!p) return; (async () => {
    if (tab === "saved") { const { data } = await sb.from("saves").select(`posts(${SEL})`).eq("user_id", p.id); setItems(((data as any) ?? []).map((x: any) => x.posts).filter(Boolean)); }
    else { const { data } = await sb.from("posts").select(SEL).eq("author_id", p.id).eq("is_draft", false).order("pinned", { ascending: false }).order("created_at", { ascending: false }); setItems((data as any) ?? []); } })(); }, [p?.id, rel, tab]);
  if (miss) return <main className="p-10 text-center">Bu kullanıcı bulunamadı. <Link href="/" className="text-accent">Ana sayfa</Link></main>;
  if (!p) return <main className="p-10 text-center opacity-60">Yükleniyor…</main>;
  const mine = me === p.id; const canSee = mine || !p.is_private || rel === "accepted";
  const follow = async () => { setMsg("");
    if (rel) await sb.from("follows").delete().match({ follower_id: me, following_id: p.id });
    else { const { error } = await sb.from("follows").insert({ follower_id: me, following_id: p.id, status: p.is_private ? "pending" : "accepted" }); if (error) setMsg("İşlem başarısız."); }
    load(); };
  const save = async () => { const { error } = await sb.from("profiles").update({ display_name: f.display_name.trim().slice(0, 50), bio: f.bio.slice(0, 150), is_private: f.is_private }).eq("id", me);
    if (error) return setMsg("Profil kaydedilemedi."); setEdit(false); setMsg(""); load(); };
  const avatar = async (file0?: File) => { if (!file0) return; const file = await shrink(file0, 800);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) return setMsg("Profil fotoğrafı JPG, PNG veya WebP olmalı; en fazla 5 MB.");
    const path = `${me}/avatar-${crypto.randomUUID()}.${file.name.split(".").pop()}`; const { error } = await sb.storage.from("media").upload(path, file); if (error) return setMsg("Fotoğraf yüklenemedi.");
    await sb.from("profiles").update({ avatar_url: sb.storage.from("media").getPublicUrl(path).data.publicUrl }).eq("id", me); load(); };
  const answer = async (id: string, ok: boolean) => { const m = { follower_id: id, following_id: me };
    ok ? await sb.from("follows").update({ status: "accepted" }).match(m) : await sb.from("follows").delete().match(m); load(); };
  const delAcc = async () => { if (!confirm("Hesabın ve tüm verilerin kalıcı olarak silinecek. Emin misin?")) return; const r = await fetch("/api/hesap-sil", { method: "POST" }); if (r.ok) { await sb.auth.signOut(); location.href = "/giris"; } else setMsg("Hesap silinemedi."); };
  const cover = async (file0?: File) => { if (!file0) return; const file = await shrink(file0, 1600);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) return setMsg("Kapak fotoğrafı JPG, PNG veya WebP olmalı; en fazla 8 MB.");
    const path = `${me}/cover-${crypto.randomUUID()}.${file.name.split(".").pop()}`; const { error } = await sb.storage.from("media").upload(path, file); if (error) return setMsg("Kapak yüklenemedi.");
    await sb.from("profiles").update({ cover_url: sb.storage.from("media").getPublicUrl(path).data.publicUrl }).eq("id", me); load(); };
  const setTheme = async (c: string | null) => { await sb.from("profiles").update({ theme_color: c }).eq("id", me); load(); };
  const mute = async () => { if (muted) await sb.from("blocks").delete().match({ blocker_id: me, blocked_id: p.id }); else await sb.from("blocks").upsert({ blocker_id: me, blocked_id: p.id, muted_only: true }); load(); };
  const dm = async () => { const { data, error } = await sb.rpc("start_dm", { other: p.id }); if (error || !data) return setMsg("Mesaj başlatılamadı (engellenmiş olabilirsin)."); router.push(`/mesajlar/${data}`); };
  const block = async () => { if (blocked) await sb.from("blocks").delete().match({ blocker_id: me, blocked_id: p.id });
    else { await sb.from("blocks").upsert({ blocker_id: me, blocked_id: p.id, muted_only: false }); await sb.from("follows").delete().match({ follower_id: me, following_id: p.id }); } load(); };
  const btn = "rounded-xl px-5 py-2 text-sm font-semibold";
  return (<div style={p.theme_color ? ({ "--accent": p.theme_color, "--on": "#FFFFFF" } as React.CSSProperties) : undefined} className="mx-auto max-w-xl px-4 pb-8"><header className="flex items-center gap-3 py-4"><Link href="/" aria-label="Geri"><ArrowLeft /></Link><b>@{p.username}</b><RoleBadge role={p.role} rank={p.ranks} />{p.is_verified && <BadgeCheck className="text-accent" size={18} />}</header><div className="mb-4 h-36 overflow-hidden rounded-2xl bg-accent/20">{p.cover_url && <img src={p.cover_url} alt="" className="h-full w-full object-cover" />}</div>
    <section className="flex items-center gap-5"><Avatar url={p.avatar_url} name={p.username} size={88} />
      <div className="flex flex-1 justify-around text-center">{([["gönderi", st.posts], ["takipçi", st.followers], ["takip", st.following]] as const).map(([l, n]) => <button key={l} onClick={() => l !== "gönderi" && canSee && setLst(l === "takipçi" ? "followers" : "following")} className="text-center"><b className="block text-lg">{n}</b><span className="text-sm opacity-70">{l}</span></button>)}</div></section>
    <p className="mt-3 font-semibold">{p.display_name}</p>{p.bio && <p className="whitespace-pre-wrap text-sm">{p.bio}</p>}
    <div className="mt-4 flex flex-wrap gap-2">{mine ? <><button onClick={() => setEdit(!edit)} className={`${btn} flex-1 border border-line bg-card`}>Profili düzenle</button><Link href="/ayarlar" className={`${btn} border border-line bg-card`}>Ayarlar</Link></>
      : <button onClick={follow} className={`${btn} flex-1 ${rel ? "border border-line bg-card" : "bg-accent text-on"}`}>{rel === "accepted" ? "Takiptesin" : rel === "pending" ? "İstek gönderildi" : "Takip et"}</button>}{!mine && <><button onClick={dm} className={`${btn} border border-line bg-card`}>Mesaj</button><button onClick={block} className={`${btn} border border-line bg-card`}>{blocked ? "Engeli kaldır" : "Engelle"}</button>{!blocked && <button onClick={mute} className={`${btn} border border-line bg-card`}>{muted ? "Sessizi kaldır" : "Sessize al"}</button>}<ReportButton userId={p.id} /></>}</div>
    {msg && <p role="status" className="mt-2 text-sm text-red-500">{msg}</p>}
    {lst && <FollowList kind={lst} uid={p.id} onClose={() => setLst(null)} />}{edit && <div className="mt-4 space-y-3 rounded-2xl border border-line bg-card p-4">
      <label className="block text-sm">Profil fotoğrafı<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => avatar(e.target.files?.[0])} className="mt-1 block text-xs" /></label>
      <label className="block text-sm">Kapak fotoğrafı<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => cover(e.target.files?.[0])} className="mt-1 block text-xs" /></label>
      <div className="flex flex-wrap items-center gap-2 text-sm">Tema rengi{COLORS.map((c) => <button key={c} onClick={() => setTheme(c)} aria-label={`Tema rengi ${c}`} style={{ background: c }} className={`h-7 w-7 rounded-full ${p.theme_color === c ? "ring-2 ring-ink ring-offset-2" : ""}`} />)}<button onClick={() => setTheme(null)} className="text-xs underline">Sıfırla</button></div>
      <input value={f.display_name} maxLength={50} onChange={(e) => setF({ ...f, display_name: e.target.value })} placeholder="Ad" className="w-full rounded-xl border border-line bg-bg px-3 py-2 outline-none focus:border-accent" />
      <textarea value={f.bio} maxLength={150} rows={3} onChange={(e) => setF({ ...f, bio: e.target.value })} placeholder="Biyografi (150 karakter)" className="w-full rounded-xl border border-line bg-bg px-3 py-2 outline-none focus:border-accent" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_private} onChange={(e) => setF({ ...f, is_private: e.target.checked })} />Gizli hesap</label>
      <button onClick={save} className={`${btn} w-full bg-accent text-on`}>Kaydet</button><button onClick={delAcc} className="w-full text-sm text-red-500">Hesabımı sil</button></div>}
    {mine && reqs.length > 0 && <div className="mt-4 rounded-2xl border border-line bg-card p-4"><b className="text-sm">Takip istekleri</b>{reqs.map((r) => <div key={r.follower_id} className="mt-2 flex items-center justify-between text-sm">@{r.profiles.username}
      <span className="flex gap-2"><button onClick={() => answer(r.follower_id, true)} className="rounded-lg bg-accent px-3 py-1 text-on">Onayla</button><button onClick={() => answer(r.follower_id, false)} className="rounded-lg border border-line px-3 py-1">Sil</button></span></div>)}</div>}
    <Highlights uid={p.id} mine={mine} canSee={canSee} />
    <div className="mt-5 flex border-b border-line"><button onClick={() => setTab("posts")} aria-label="Gönderiler" className={`flex-1 py-3 ${tab === "posts" ? "border-b-2 border-accent text-accent" : "opacity-60"}`}><Grid3x3 className="mx-auto" size={20} /></button>
      {mine && <button onClick={() => setTab("saved")} aria-label="Kaydedilenler" className={`flex-1 py-3 ${tab === "saved" ? "border-b-2 border-accent text-accent" : "opacity-60"}`}><Bookmark className="mx-auto" size={20} /></button>}</div>
    {!canSee ? <div className="py-12 text-center"><Lock className="mx-auto mb-2" /><p className="font-semibold">Bu hesap gizli</p><p className="text-sm opacity-70">Gönderileri görmek için takip isteği gönder.</p></div>
      : items.length === 0 ? <p className="py-12 text-center opacity-60">{tab === "saved" ? "Henüz kaydettiğin gönderi yok." : "Henüz gönderi yok."}</p>
      : <div className="mt-1 grid grid-cols-3 gap-1">{items.map((t) => <div key={t.id} onClick={() => router.push(`/p/${t.id}`)} className="group relative aspect-square cursor-pointer overflow-hidden bg-card">{t.pinned && <Pin size={14} className="absolute right-1 top-1 z-10 text-white drop-shadow" />}
        {t.media_url ? (t.media_type === "video" ? <video src={t.media_url} className="h-full w-full object-cover" /> : <img src={t.media_url} alt="" className="h-full w-full object-cover" />) : <p className="line-clamp-5 p-2 text-xs">{t.body}</p>}
        <span className="absolute inset-0 flex items-center justify-center gap-3 bg-black/50 text-sm text-white opacity-0 transition group-hover:opacity-100"><span className="flex items-center gap-1"><Heart size={14} />{t.likes.length}</span><span className="flex items-center gap-1"><MessageCircle size={14} />{t.comments.length}</span></span></div>)}</div>}
    </div>);
}
