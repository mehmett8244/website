"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Bookmark, Trash2, Repeat2, BadgeCheck, Pencil, Share2, Pin } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import RoleBadge, { Rank } from "./RoleBadge"; import Rich from "./Rich"; import ReportButton from "./ReportButton"; import Comments from "./Comments"; import Avatar from "./Avatar";
import MediaCarousel from "./MediaCarousel"; import Likers from "./Likers"; import ShareSheet from "./ShareSheet";
type Post = { id: string; body: string | null; media_url: string | null; media_type: string | null; created_at: string; edited_at: string | null; author_id: string; pinned: boolean;
  profiles: { username: string; is_verified: boolean; is_private: boolean; avatar_url: string | null; role: string; ranks: Rank }; post_media: { url: string; type: string; position: number }[];
  likes: { user_id: string }[]; saves: { user_id: string }[]; reposts: { user_id: string }[]; comments: { id: string }[] };
const SEL = "id,body,media_url,media_type,created_at,edited_at,author_id,pinned,profiles!posts_author_id_fkey(username,is_verified,is_private,avatar_url,role,ranks(name,color,emoji)),post_media(url,type,position),likes(user_id),saves(user_id),reposts(user_id),comments(id)";
const ago = (d: string) => { const s = (Date.now() - new Date(d).getTime()) / 1000; return s < 60 ? "şimdi" : s < 3600 ? `${~~(s / 60)} dk` : s < 86400 ? `${~~(s / 3600)} sa` : `${~~(s / 86400)} g`; };
export default function Feed({ userId, tab, postId, tag }: { userId: string; tab: "foryou" | "following"; postId?: string; tag?: string }) {
  const sb = supabase(); const [posts, setPosts] = useState<Post[]>([]); const [fol, setFol] = useState<Record<string, string>>({}); const [err, setErr] = useState(""); const [ready, setReady] = useState(false);
  const [ed, setEd] = useState<{ id: string; t: string } | null>(null); const [lk, setLk] = useState<string | null>(null); const [shr, setShr] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [{ data: f }, { data: bl }] = await Promise.all([sb.from("follows").select("following_id,status").eq("follower_id", userId), sb.from("blocks").select("blocked_id").eq("blocker_id", userId)]);
    const map: Record<string, string> = Object.fromEntries((f ?? []).map((x) => [x.following_id, x.status])); setFol(map); const hide = new Set((bl ?? []).map((x) => x.blocked_id));
    let q = sb.from("posts").select(SEL).eq("is_draft", false).order("created_at", { ascending: false }).limit(50);
    if (tab === "following") q = q.in("author_id", [...Object.keys(map).filter((k) => map[k] === "accepted"), userId]);
    if (postId) q = q.eq("id", postId);
    if (tag) q = q.ilike("body", `%#${tag}%`);
    const { data, error } = await q; setErr(error ? "Akış yüklenemedi: " + error.message : "");
    let list = ((data as unknown as Post[]) ?? []).filter((p) => postId || !hide.has(p.author_id));
    if (tag) { const re = new RegExp(`(^|[^\\p{L}\\p{N}_])#${tag}(?![\\p{L}\\p{N}_])`, "iu"); list = list.filter((p) => p.body && re.test(p.body)); }
    setPosts(list); setReady(true);
  }, [tab, userId, postId, tag]);
  useEffect(() => { load(); }, [load]);
  const toggle = async (t: "likes" | "saves" | "reposts", p: Post) => { const on = p[t].some((x) => x.user_id === userId);
    setPosts((ps) => ps.map((x) => (x.id !== p.id ? x : { ...x, [t]: on ? x[t].filter((y) => y.user_id !== userId) : [...x[t], { user_id: userId }] })));
    const { error } = on ? await sb.from(t).delete().match({ post_id: p.id, user_id: userId }) : await sb.from(t).insert({ post_id: p.id, user_id: userId }); if (error) load(); };
  const pin = async (p: Post) => { const { error } = await sb.from("posts").update({ pinned: !p.pinned }).eq("id", p.id); setErr(error ? (error.message.includes("En fazla") ? "En fazla 3 gönderi sabitleyebilirsin." : "İşlem başarısız.") : ""); load(); };
  const saveEdit = async (id: string) => { if (!ed) return; const { error } = await sb.from("posts").update({ body: ed.t.trim() || null, edited_at: new Date().toISOString() }).eq("id", id); if (error) return setErr(error.message); setEd(null); load(); };
  const del = async (id: string) => { if (confirm("Gönderi silinsin mi?")) { setPosts((ps) => ps.filter((x) => x.id !== id)); await sb.from("posts").delete().eq("id", id); } };
  const follow = async (p: Post) => { await sb.from("follows").insert({ follower_id: userId, following_id: p.author_id, status: p.profiles.is_private ? "pending" : "accepted" }); load(); };
  return (<div>{err && <p role="alert" className="text-sm text-red-500">{err}</p>}{!ready && !err && <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="h-72 animate-pulse rounded-md bg-card" />)}</div>}
    {ready && posts.length === 0 && !err && <p className="py-16 text-center opacity-60">{tab === "following" ? "Takip ettiklerinin gönderisi yok. Ara sayfasından kişileri takip et." : "Henüz gönderi yok. Artı simgesiyle ilkini paylaş."}</p>}
    {posts.map((p) => { const liked = p.likes.some((x) => x.user_id === userId); const saved = p.saves.some((x) => x.user_id === userId);
      const media = p.post_media?.length ? [...p.post_media].sort((a, b) => a.position - b.position) : p.media_url ? [{ url: p.media_url, type: p.media_type ?? "image" }] : [];
      return (<article key={p.id} className="border-b border-line pb-4">
        <header className="flex items-center gap-3 py-3"><Link href={`/${p.profiles.username}`}><Avatar url={p.profiles.avatar_url} name={p.profiles.username} size={38} /></Link>
          <Link href={`/${p.profiles.username}`} className="font-semibold">{p.profiles.username}</Link>{p.profiles.is_verified && <BadgeCheck size={16} className="text-accent" />}<RoleBadge role={p.profiles.role} rank={p.profiles.ranks} />
          <Link href={`/p/${p.id}`} className="text-sm opacity-60">· {ago(p.created_at)}</Link>{p.pinned && <Pin size={14} className="text-accent" aria-label="Sabit gönderi" />}
          {p.author_id === userId ? <span className="ml-auto flex gap-3 opacity-60"><button onClick={() => pin(p)} aria-label={p.pinned ? "Sabitlemeyi kaldır" : "Profilde sabitle"}><Pin size={18} className={p.pinned ? "text-accent" : ""} /></button><button onClick={() => setEd({ id: p.id, t: p.body ?? "" })} aria-label="Düzenle"><Pencil size={18} /></button><button onClick={() => del(p.id)} aria-label="Sil"><Trash2 size={18} /></button></span>
            : <span className="ml-auto flex items-center gap-3">{!fol[p.author_id] && <button onClick={() => follow(p)} className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-semibold">Takip Et</button>}<ReportButton postId={p.id} /></span>}</header>
        {media.length > 0 && <MediaCarousel items={media} onDoubleLike={() => { if (!liked) toggle("likes", p); }} />}
        <div className="mt-3 flex flex-wrap items-center gap-5 text-sm">
          <span className="flex items-center gap-1.5"><button onClick={() => toggle("likes", p)} aria-label="Beğen" className={liked ? "text-red-500" : ""}><Heart size={24} fill={liked ? "currentColor" : "none"} /></button><button onClick={() => p.likes.length && setLk(p.id)} aria-label="Beğenenleri gör">{p.likes.length}</button></span>
          <Comments postId={p.id} userId={userId} count={p.comments.length} onChange={load} />
          <button onClick={() => toggle("reposts", p)} aria-label="Yeniden paylaş" className={`flex items-center gap-1.5 ${p.reposts.some((x) => x.user_id === userId) ? "text-accent" : ""}`}><Repeat2 size={24} />{p.reposts.length}</button>
          <button onClick={() => setShr(p.id)} aria-label="Gönder"><Share2 size={24} /></button>
          <button onClick={() => toggle("saves", p)} aria-label="Kaydet" className={`ml-auto ${saved ? "text-accent" : ""}`}><Bookmark size={24} fill={saved ? "currentColor" : "none"} /></button></div>
        {ed?.id === p.id ? <div className="mt-2 space-y-2"><textarea value={ed.t} maxLength={2000} rows={3} onChange={(e) => setEd({ id: p.id, t: e.target.value })} className="w-full rounded-xl border border-line bg-card p-2 text-sm outline-none focus:border-accent" /><div className="flex gap-2"><button onClick={() => saveEdit(p.id)} className="rounded-lg bg-accent px-3 py-1 text-sm text-on">Kaydet</button><button onClick={() => setEd(null)} className="rounded-lg border border-line px-3 py-1 text-sm">Vazgeç</button></div></div>
          : p.body && <p className="mt-2 whitespace-pre-wrap break-words text-sm"><Link href={`/${p.profiles.username}`} className="mr-1 font-semibold">{p.profiles.username}</Link><Rich text={p.body} />{p.edited_at && <span className="ml-1 opacity-50">(düzenlendi)</span>}</p>}</article>); })}
    {lk && <Likers postId={lk} onClose={() => setLk(null)} />}{shr && <ShareSheet postId={shr} onClose={() => setShr(null)} />}</div>);
}
