import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function middleware(req: NextRequest) {
  const u = req.nextUrl;
  if (u.pathname === "/" && (u.searchParams.has("code") || u.searchParams.has("token_hash"))) return NextResponse.redirect(new URL("/auth/callback" + u.search, req.url));
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => req.cookies.getAll(), setAll: (c: any[]) => { c.forEach(({ name, value }: any) => req.cookies.set(name, value)); res = NextResponse.next({ request: req }); c.forEach(({ name, value, options }: any) => res.cookies.set(name, value, options)); } },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user && !["/giris","/gizlilik","/kosullar","/kvkk", "/p/", "/api/cron/", "/api/push", "/auth/"].some((x) => req.nextUrl.pathname.startsWith(x))) return NextResponse.redirect(new URL("/giris", req.url));
  return res;
}
export const config = { matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"] };
