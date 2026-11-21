import { supabaseServer } from "@/lib/supabase/server";
import HomeView from "@/components/HomeView";
export default async function Home() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  return <HomeView userId={user!.id} />;
}
