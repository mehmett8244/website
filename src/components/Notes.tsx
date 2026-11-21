"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
type N = { user_id: string; body: string; profiles: { username: string } };
export default function Notes({ userId }: { userId: string }) {
  const sb = supabase(); const [notes, setNotes] = useState<N[]>([]); const [t, setT] = useState(""); const [edit, setEdit] = useState(false);
  const load = useCallback(async () => { const { data } = await sb.from("notes").select("user_id,body,profiles(username)").gt("expires_at", new Date().toISOString()); setNotes((data as unknown as N[]) ?? []); }, []);
  useEffect(() => { load(); }, [load]);
  const mine = notes.find((n) => n.user_id === userId);
  const save = async () => { if (!t.trim()) return; await sb.from("notes").upsert({ user_id: userId, body: t.trim(), expires_at: new Date(Date.now() + 864e5).toISOString() }); setT(""); setEdit(false); load(); };
  const remove = async () => { await sb.from("notes").delete().eq("user_id", userId); load(); };
  return (<section className="flex gap-3 overflow-x-auto pb-2" aria-label="Notlar">
    <div className="shrink-0 text-center text-xs">{edit ? <div className="w-40 space-y-1"><input autoFocus maxLength={60} value={t} onChange={(e) => setT(e.target.value)} placeholder="Notun (60 karakter)" className="w-full rounded-xl border border-line bg-card px-2 py-1 outline-none focus:border-accent" />
        <div className="flex gap-1"><button onClick={save} className="flex-1 rounded-lg bg-accent py-1 text-on">Paylaş</button><button onClick={() => setEdit(false)} className="flex-1 rounded-lg border border-line py-1">Vazgeç</button></div></div>
      : <><button onClick={() => { setT(mine?.body ?? ""); setEdit(true); }} className="max-w-[9rem] rounded-2xl border border-line bg-card px-3 py-2">{mine ? mine.body : "Not bırak…"}</button>
        {mine && <button onClick={remove} className="mt-1 block w-full opacity-60">Notu sil</button>}<span className="opacity-70">Sen</span></>}</div>
    {notes.filter((n) => n.user_id !== userId).map((n) => <div key={n.user_id} className="shrink-0 text-center text-xs"><p className="max-w-[9rem] rounded-2xl border border-accent/40 bg-card px-3 py-2">{n.body}</p><span className="opacity-70">@{n.profiles.username}</span></div>)}</section>);
}
