"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Avatar from "./Avatar";
export default function MentionBox({ text, onPick }: { text: string; onPick: (t: string) => void }) {
  const q = /@([a-zA-Z0-9_]{1,20})$/.exec(text)?.[1]?.toLowerCase(); const [list, setList] = useState<{ username: string; avatar_url: string | null }[]>([]);
  useEffect(() => { if (!q) { setList([]); return; } let on = true; const t = setTimeout(async () => { const { data } = await supabase().from("profiles").select("username,avatar_url").ilike("username", `${q}%`).limit(5); if (on) setList(data ?? []); }, 150); return () => { on = false; clearTimeout(t); }; }, [q]);
  if (!q || !list.length) return null;
  return <div role="listbox" className="my-1 rounded-xl border border-line bg-card p-1 shadow">{list.map((u) => <button type="button" key={u.username} onClick={() => onPick(text.replace(/@[a-zA-Z0-9_]{1,20}$/, `@${u.username} `))} className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-accent/10"><Avatar url={u.avatar_url} name={u.username} size={24} />@{u.username}</button>)}</div>;
}
