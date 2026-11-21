import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import Feed from "@/components/Feed";
const UUID = /^[0-9a-f-]{36}$/i;
async function getPost(id: string) {
  if (!UUID.test(id)) return null;
  const { data } = await supabaseServer().from("posts").select("id,body,media_url,media_type,profiles!posts_author_id_fkey(username)").eq("id", id).maybeSingle();
  return data as any;
}
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const p = await getPost(params.id); if (!p) return { title: "Gönderi bulunamadı" };
  const title = `@${p.profiles.username} • Son Kural Bükücü`; const description = (p.body ?? "Gönderiyi görüntüle").slice(0, 160);
  return { title, description, openGraph: { title, description, type: "article", images: p.media_type === "image" && p.media_url ? [p.media_url] : ["/logo.jpg"] }, twitter: { card: "summary_large_image" } };
}
export default async function Page({ params }: { params: { id: string } }) {
  const { data: { user } } = await supabaseServer().auth.getUser(); const p = await getPost(params.id);
  if (!p) return <p className="p-10 text-center">Bu gönderi bulunamadı ya da görüntüleme iznin yok.</p>;
  if (user) return <div className="mx-auto max-w-[470px] px-3 py-4"><Feed userId={user.id} tab="foryou" postId={params.id} /></div>;
  return (<main className="mx-auto max-w-[470px] p-4"><div className="rounded-2xl border border-line bg-card p-4"><b>@{p.profiles.username}</b>
    {p.media_url && (p.media_type === "video" ? <video src={p.media_url} controls playsInline className="mt-3 w-full rounded-xl" /> : <img src={p.media_url} alt="" className="mt-3 w-full rounded-xl" />)}
    {p.body && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{p.body}</p>}</div>
    <div className="mt-4 text-center"><p className="mb-2 text-sm opacity-70">Beğenmek ve yorum yapmak için giriş yap.</p><Link href="/giris" className="inline-block rounded-xl bg-accent px-6 py-2.5 font-semibold text-on">Giriş yap / Kayıt ol</Link></div></main>);
}
