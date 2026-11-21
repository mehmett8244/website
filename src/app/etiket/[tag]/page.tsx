import { supabaseServer } from "@/lib/supabase/server";
import Feed from "@/components/Feed";
export default async function Page({ params }: { params: { tag: string } }) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  const tag = decodeURIComponent(params.tag).replace(/[^\p{L}\p{N}_]/gu, "").slice(0, 30).toLowerCase();
  return <div className="mx-auto max-w-[470px] px-3 py-4"><h1 className="mb-3 text-xl font-bold">#{tag}</h1><Feed userId={user!.id} tab="foryou" tag={tag} /></div>;
}
