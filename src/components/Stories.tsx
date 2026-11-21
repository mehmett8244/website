"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, X, Trash2, Star } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { shrink } from "@/lib/shrink";
import AddToHighlight from "./AddToHighlight";
import StoryComposer, { Overlay } from "./StoryComposer";
type S = { id: string; author_id: string; media_url: string; media_type: string; audio_url: string | null; music_id: string | null; music_title: string | null; music_start: number; overlays: Overlay[]; profiles: { username: string }; story_views: { user_id: string; reaction: string | null }[] };
const EMOJIS = ["❤️", "🔥", "😂", "😮", "👏"];
export default function Stories({ userId }: { userId: string }) {
  const sb = supabase(); const [list, setList] = useState<S[]>([]); const [view, setView] = useState<{ g: number; i: number } | null>(null); const [err, setErr] = useState(""); const [file, setFile] = useState<File | null>(null);
  const hold = useRef(false); const [hl, setHl] = useState(false); const [rp, setRp] = useState(""); const [rmsg, setRmsg] = useState("");
  const load = useCallback(async () => { const { data } = await sb.from("stories").select("id,author_id,media_url,media_type,audio_url,music_id,music_title,music_start,overlays,profiles!stories_author_id_fkey(username),story_views(user_id,reaction)").gt("expires_at", new Date().toISOString()).order("created_at"); setList((data as unknown as S[]) ?? []); }, []);
  useEffect(() => { load(); }, [load]);
  const groups = Object.values(list.reduce<Record<string, S[]>>((a, s) => { (a[s.author_id] ??= []).push(s); return a; }, {})).sort((a) => (a[0].author_id === userId ? -1 : 1));
  const cur = view ? groups[view.g]?.[view.i] : null;
  const next = useCallback(() => setView((v) => { if (!v) return v; const g = groups[v.g]; if (v.i + 1 < g.length) return { g: v.g, i: v.i + 1 }; return v.g + 1 < groups.length ? { g: v.g + 1, i: 0 } : null; }), [groups]);
  useEffect(() => { if (!cur) return; if (cur.author_id !== userId) sb.from("story_views").upsert({ story_id: cur.id, user_id: userId }, { ignoreDuplicates: true });
    if (cur.media_type === "image") { const t = setTimeout(() => { if (!hold.current) next(); }, 6000); return () => clearTimeout(t); } }, [cur?.id]);
  async function onFile(f0?: File) { if (!f0) return; setErr("");
    if (!/^(image\/(jpeg|png|webp)|video\/(mp4|webm))$/.test(f0.type) || f0.size > 25 * 1024 * 1024) return setErr("JPG, PNG, WebP, MP4 veya WebM; en fazla 25 MB.");
    setFile(await shrink(f0)); }
  const del = async () => { if (!cur || !confirm("Hikâye silinsin mi?")) return; const p = cur.media_url.split("/media/")[1];
    await sb.from("stories").delete().eq("id", cur.id); if (p) await sb.storage.from("media").remove([decodeURIComponent(p)]); setView(null); load(); };
  const reply = async (e: React.FormEvent) => { e.preventDefault(); if (!cur || !rp.trim()) return;
    const { data: cid, error } = await sb.rpc("start_dm", { other: cur.author_id }); if (error || !cid) return setRmsg("Yanıt gönderilemedi.");
    const { error: e2 } = await sb.from("messages").insert({ conversation_id: cid, sender_id: userId, body: `Hikâyene yanıt: ${rp.trim()}`, image_url: cur.media_type === "image" ? cur.media_url : null, read_by: [userId] });
    if (e2) return setRmsg("Yanıt gönderilemedi."); setRp(""); hold.current = false; setRmsg("Yanıt gönderildi ✓"); setTimeout(() => setRmsg(""), 1600); };
  const react = async (e: string) => { if (!cur) return; await sb.from("story_views").upsert({ story_id: cur.id, user_id: userId, reaction: e }); load(); };
  return (<section aria-label="Hikâyeler"><div className="flex items-center gap-3 overflow-x-auto pb-2">
    <label className="grid h-16 w-16 shrink-0 cursor-pointer place-items-center rounded-full border-2 border-dashed border-accent text-accent" aria-label="Hikâye ekle"><Plus /><input type="file" hidden accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} /></label>
    {groups.map((g, gi) => { const seen = g[0].author_id !== userId && g.every((s) => s.story_views.some((v) => v.user_id === userId)); return (<button key={g[0].author_id} onClick={() => setView({ g: gi, i: 0 })} className="shrink-0 text-center text-xs"><span className={`mb-1 block h-16 w-16 rounded-full border-[3px] bg-card p-0.5 ${seen ? "border-line" : "border-accent"}`}><span className="grid h-full w-full place-items-center rounded-full bg-accent/15 text-lg font-bold">{g[0].profiles.username[0].toUpperCase()}</span></span>{g[0].author_id === userId ? "Sen" : g[0].profiles.username}</button>); })}</div>
    {err && <p className="text-sm text-red-500">{err}</p>}
    {file && <StoryComposer userId={userId} file={file} onClose={() => setFile(null)} onDone={() => { setFile(null); load(); }} />}
    {cur && <div role="dialog" aria-label="Hikâye" className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between p-3"><b>@{cur.profiles.username}</b><span className="flex items-center gap-4">{cur.author_id === userId && <button onClick={() => { setHl(true); hold.current = true; }} aria-label="Öne çıkanlara ekle"><Star size={20} /></button>}{cur.author_id === userId && <button onClick={del} aria-label="Hikâyeyi sil"><Trash2 size={20} /></button>}<button onClick={() => setView(null)} aria-label="Kapat"><X /></button></span></div>
      <div className="flex min-h-0 flex-1 items-center justify-center"><div className="relative overflow-hidden bg-black" style={{ width: "min(92vw, 40vh)", aspectRatio: "9/16", containerType: "inline-size" }}>
        <button className="absolute inset-0" onClick={next} aria-label="Sonraki">{cur.media_type === "video" ? <video key={cur.id} src={cur.media_url} autoPlay playsInline onEnded={next} className="h-full w-full object-contain" /> : <img key={cur.id} src={cur.media_url} alt="" className="h-full w-full object-contain" />}</button>
        {(cur.overlays ?? []).map((o, i) => <div key={i} style={{ left: `${o.x}%`, top: `${o.y}%`, color: o.c, fontSize: `${o.s}cqw`, transform: "translate(-50%,-50%)", maxWidth: "80cqw", textShadow: "0 1px 4px rgba(0,0,0,.6)" }} className="pointer-events-none absolute whitespace-pre-wrap break-words text-center font-bold leading-tight">{o.t}</div>)}</div></div>
      {hl && <AddToHighlight story={cur} userId={userId} onClose={() => { setHl(false); hold.current = false; }} />}{cur.audio_url && <audio key={cur.id} src={cur.audio_url} autoPlay loop />}
      {cur.music_id && <div className="absolute bottom-28 left-3 z-10 overflow-hidden rounded-xl border border-white/20 bg-black"><iframe key={cur.id} title="Müzik" width="200" height="200" src={`https://www.youtube-nocookie.com/embed/${cur.music_id}?autoplay=1&playsinline=1&loop=1&playlist=${cur.music_id}&start=${cur.music_start ?? 0}&rel=0`} allow="autoplay; encrypted-media" /><p className="w-[200px] truncate bg-black/70 px-2 py-1 text-xs">🎵 {cur.music_title}</p></div>}
      <div className="p-3 text-center">{cur.author_id === userId ? <p>{cur.story_views.length} görüntülenme · {cur.story_views.filter((v) => v.reaction).map((v) => v.reaction).join(" ")}</p>
        : <><div className="flex justify-center gap-3 text-2xl">{EMOJIS.map((e) => <button key={e} onClick={() => react(e)} aria-label={`Tepki ${e}`}>{e}</button>)}</div><form onSubmit={reply} className="mt-3 flex gap-2"><input value={rp} maxLength={500} onChange={(e) => { setRp(e.target.value); hold.current = !!e.target.value; }} placeholder="Yanıt gönder…" className="min-w-0 flex-1 rounded-full border border-white/30 bg-transparent px-4 py-2 text-sm text-white outline-none" /><button className="rounded-full bg-white px-4 text-sm font-semibold text-black">Gönder</button></form>{rmsg && <p role="status" className="mt-1 text-xs">{rmsg}</p>}</>}</div></div>}</section>);
}
