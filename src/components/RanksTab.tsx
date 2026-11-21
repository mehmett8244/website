"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import RoleBadge from "./RoleBadge";
export type RankRow = { id: string; name: string; color: string; emoji: string | null; priority: number; can_moderate: boolean };
export default function RanksTab({ ranks, reload }: { ranks: RankRow[]; reload: () => void }) {
  const sb = supabase(); const [f, setF] = useState({ name: "", emoji: "", color: "#7C3AED", priority: 0, can_moderate: false }); const [msg, setMsg] = useState("");
  const add = async () => { if (!f.name.trim()) return setMsg("Rütbe adı gerekli.");
    const { error } = await sb.from("ranks").insert({ name: f.name.trim(), emoji: f.emoji.trim() || null, color: f.color, priority: f.priority, can_moderate: f.can_moderate });
    setMsg(error ? "Eklenemedi: " + error.message : ""); if (!error) setF({ ...f, name: "", emoji: "" }); reload(); };
  const del = async (id: string) => { if (confirm("Rütbe silinsin mi? Sahip olan kullanıcılar rütbesiz kalır.")) { await sb.from("ranks").delete().eq("id", id); reload(); } };
  const mod = async (r: RankRow) => { await sb.from("ranks").update({ can_moderate: !r.can_moderate }).eq("id", r.id); reload(); };
  const inp = "rounded-lg border border-line bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent";
  return (<div className="space-y-4"><div className="space-y-3 rounded-2xl border border-line bg-card p-4"><b className="text-sm">Yeni rütbe tasarla</b>
    <div className="flex flex-wrap items-center gap-2"><input value={f.name} maxLength={20} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ad (örn. VIP)" className={inp} />
      <input value={f.emoji} maxLength={4} onChange={(e) => setF({ ...f, emoji: e.target.value })} placeholder="Emoji" className={`${inp} w-20`} />
      <label className="flex items-center gap-1 text-sm">Renk<input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} className="h-8 w-10 rounded" /></label>
      <label className="flex items-center gap-1 text-sm">Sıra<input type="number" value={f.priority} onChange={(e) => setF({ ...f, priority: +e.target.value })} className={`${inp} w-16`} /></label></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.can_moderate} onChange={(e) => setF({ ...f, can_moderate: e.target.checked })} />Moderasyon yetkisi ver (şikâyet, silme, askıya alma)</label>
    <div className="flex items-center gap-3 text-sm">Önizleme: <b>@kullanici</b><RoleBadge rank={{ name: f.name || "Örnek", color: f.color, emoji: f.emoji || null }} /></div>
    {msg && <p role="alert" className="text-sm text-red-500">{msg}</p>}<button onClick={add} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on">Rütbe oluştur</button></div>
    {ranks.length === 0 && <p className="text-center text-sm opacity-60">Henüz rütbe yok.</p>}
    {ranks.map((r) => <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card p-3 text-sm"><RoleBadge rank={r} /><span className="flex-1 opacity-60">sıra {r.priority}</span>
      <label className="flex items-center gap-1"><input type="checkbox" checked={r.can_moderate} onChange={() => mod(r)} />moderasyon</label><button onClick={() => del(r.id)} className="rounded-lg border border-line px-3 py-1 text-xs">Sil</button></div>)}</div>);
}
