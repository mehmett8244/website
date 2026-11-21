"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import MentionBox from "./MentionBox"; import { shrink } from "@/lib/shrink";
export default function Composer() {
  const sb = supabase(); const r = useRouter(); const [text, setText] = useState(""); const [files, setFiles] = useState<File[]>([]); const [prev, setPrev] = useState<string[]>([]); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { const u = files.map((f) => URL.createObjectURL(f)); setPrev(u); return () => u.forEach((x) => URL.revokeObjectURL(x)); }, [files]);
  async function add(list: FileList | null) { if (!list) return; setErr(""); const out = [...files];
    for (const f0 of Array.from(list)) { if (out.length >= 10) { setErr("En fazla 10 medya ekleyebilirsin."); break; }
      if (!/^(image\/(jpeg|png|webp)|video\/(mp4|webm))$/.test(f0.type) || f0.size > 25 * 1024 * 1024) { setErr("JPG, PNG, WebP, MP4 veya WebM; her biri en fazla 25 MB."); continue; } out.push(await shrink(f0)); }
    setFiles(out); }
  async function go() { setErr(""); if (!text.trim() && !files.length) return setErr("Bir şeyler yaz ya da medya ekle."); setBusy(true);
    const { data: { user } } = await sb.auth.getUser(); if (!user) { setBusy(false); return; }
    const media: { url: string; type: string }[] = [];
    for (const f of files) { const path = `${user.id}/${crypto.randomUUID()}.${f.name.split(".").pop()}`; const { error } = await sb.storage.from("media").upload(path, f);
      if (error) { setBusy(false); return setErr("Dosya yüklenemedi: " + error.message); } media.push({ url: sb.storage.from("media").getPublicUrl(path).data.publicUrl, type: f.type.startsWith("video") ? "video" : "image" }); }
    const { data: post, error } = await sb.from("posts").insert({ author_id: user.id, body: text.trim() || null, media_url: media[0]?.url ?? null, media_type: media[0]?.type ?? null }).select("id").single();
    if (error || !post) { setBusy(false); return setErr("Gönderi paylaşılamadı: " + (error?.message ?? "")); }
    if (media.length) { const { error: e2 } = await sb.from("post_media").insert(media.map((m, i) => ({ post_id: post.id, url: m.url, type: m.type, position: i }))); if (e2) { setBusy(false); return setErr("Medya eklenemedi: " + e2.message); } }
    setBusy(false); r.push("/"); r.refresh(); }
  return (<div className="mx-auto max-w-[470px] space-y-4 p-4"><h1 className="text-lg font-bold">Yeni gönderi</h1>
    <div className="grid grid-cols-3 gap-2">{prev.map((u, i) => <div key={u} className="relative aspect-square overflow-hidden rounded-xl border border-line bg-card">{files[i]?.type.startsWith("video") ? <video src={u} muted className="h-full w-full object-cover" /> : <img src={u} alt="" className="h-full w-full object-cover" />}
      <button onClick={() => setFiles(files.filter((_, k) => k !== i))} aria-label="Kaldır" className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X size={14} /></button></div>)}
      {files.length < 10 && <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line bg-card text-center text-xs opacity-70"><span className="flex flex-col items-center gap-1"><ImagePlus />{files.length ? "Ekle" : "Fotoğraf veya video seç (en fazla 10)"}</span>
        <input type="file" multiple hidden accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(e) => { add(e.target.files); e.target.value = ""; }} /></label>}</div>
    <textarea value={text} maxLength={2000} rows={4} onChange={(e) => setText(e.target.value)} placeholder="Bir açıklama yaz… (@ ile etiketle, # ile etiket ekle)" className="w-full rounded-xl border border-line bg-card p-3 outline-none focus:border-accent" />
    <MentionBox text={text} onPick={setText} />
    {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
    <button disabled={busy} onClick={go} className="w-full rounded-xl bg-accent py-3 font-semibold text-on disabled:opacity-60">{busy ? "Paylaşılıyor…" : "Paylaş"}</button></div>);
}
