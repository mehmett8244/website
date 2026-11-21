"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { shrink } from "@/lib/shrink";
import Avatar from "./Avatar";
type M = { user_id: string; role: string; profiles: { username: string; avatar_url: string | null } };
export default function GroupInfo({ id, title, members, me, onClose, onChanged }: { id: string; title: string; members: M[]; me: string; onClose: () => void; onChanged: () => void }) {
  const sb = supabase(); const r = useRouter(); const [name, setName] = useState(title); const [q, setQ] = useState(""); const [found, setFound] = useState<{ id: string; username: string; avatar_url: string | null }[]>([]); const [msg, setMsg] = useState("");
  const admin = members.find((m) => m.user_id === me)?.role === "admin";
  useEffect(() => { const s = q.trim().replace(/[%,()*\\]/g, ""); if (!admin || s.length < 2) { setFound([]); return; } const t = setTimeout(async () => { const { data } = await sb.from("profiles").select("id,username,avatar_url").ilike("username", `${s}%`).limit(6); setFound((data ?? []).filter((u) => !members.some((m) => m.user_id === u.id))); }, 250); return () => clearTimeout(t); }, [q, members]);
  const call = async (fn: string, args: object, ok = "") => { const { error } = await sb.rpc(fn, args); setMsg(error ? error.message : ok); if (!error) onChanged(); };
  const photo = async (f0?: File) => { if (!f0) return; const f = await shrink(f0, 800); if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setMsg("Fotoğraf JPG, PNG veya WebP olmalı.");
    const path = `${me}/grp-${crypto.randomUUID()}.${f.name.split(".").pop()}`; const { error } = await sb.storage.from("media").upload(path, f); if (error) return setMsg("Fotoğraf yüklenemedi.");
    call("group_update", { cid: id, t: null, p: sb.storage.from("media").getPublicUrl(path).data.publicUrl }, "Fotoğraf güncellendi."); };
  const leave = async () => { if (!confirm("Gruptan ayrılmak istiyor musun?")) return; const { error } = await sb.rpc("group_leave", { cid: id }); if (error) return setMsg(error.message); onClose(); r.push("/mesajlar"); };
  const b = "rounded-lg border border-line px-2 py-1 text-xs";
  return (<div role="dialog" aria-label="Grup bilgisi" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}><div onClick={(e) => e.stopPropagation()} className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-2xl border border-line bg-card">
    <div className="flex items-center justify-between p-4"><b>Grup bilgisi</b><button onClick={onClose} aria-label="Kapat"><X /></button></div>
    <div className="space-y-3 overflow-y-auto px-4 pb-4">
      {admin && <><div className="flex gap-2"><input value={name} maxLength={50} onChange={(e) => setName(e.target.value)} aria-label="Grup adı" className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent" /><button onClick={() => call("group_update", { cid: id, t: name, p: null }, "Ad güncellendi.")} className="rounded-xl bg-accent px-3 text-sm font-semibold text-on">Kaydet</button></div>
        <label className="block text-sm">Grup fotoğrafı<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => photo(e.target.files?.[0])} className="mt-1 block text-xs" /></label>
        <div><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kişi ekle (kullanıcı adı)" className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent" />
          {found.map((u) => <button key={u.id} onClick={() => { call("group_add_members", { cid: id, members: [u.id] }, `@${u.username} eklendi.`); setQ(""); }} className="mt-1 flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-accent/10"><Avatar url={u.avatar_url} name={u.username} size={24} />@{u.username}<span className="ml-auto text-accent">Ekle</span></button>)}</div></>}
      {msg && <p role="status" className="text-sm text-accent">{msg}</p>}
      <p className="text-xs opacity-60">{members.length} üye</p>
      {members.map((m) => <div key={m.user_id} className="flex items-center gap-2 text-sm"><Avatar url={m.profiles.avatar_url} name={m.profiles.username} size={32} /><span className="flex-1">@{m.profiles.username}{m.role === "admin" && <span className="ml-2 rounded-full bg-accent/15 px-1.5 text-[10px] font-bold text-accent">yönetici</span>}</span>
        {admin && m.user_id !== me && <><button className={b} onClick={() => call("group_set_admin", { cid: id, u: m.user_id, v: m.role !== "admin" })}>{m.role === "admin" ? "Yöneticiliği al" : "Yönetici yap"}</button><button className={b} onClick={() => call("group_remove_member", { cid: id, u: m.user_id })}>Çıkar</button></>}</div>)}
      <button onClick={leave} className="w-full rounded-xl border border-red-500/50 py-2 text-sm text-red-500">Gruptan ayrıl</button></div></div></div>);
}
