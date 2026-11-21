import { NextResponse } from "next/server";
// web-push CommonJS bir pakettir; varsayılan içe aktarım derlemede boş kalıyordu
const webpush = require("web-push") as typeof import("web-push");
import { createClient } from "@supabase/supabase-js";
const TXT: Record<string, string> = { like: "gönderini beğendi", comment: "gönderine yorum yaptı", follow: "seni takip etmeye başladı", request: "seni takip etmek istiyor", mention: "seni etiketledi", warning: "Hesabına bir uyarı gönderildi" };
export async function POST(req: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET, pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) return NextResponse.json({ error: "yetkisiz" }, { status: 401 });
  if (!pub || !priv || !key) return NextResponse.json({ error: "yapılandırma eksik" }, { status: 500 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", pub, priv);
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
  const b = await req.json(); const r = b?.record; if (b?.type !== "INSERT" || !r) return NextResponse.json({ ok: true });
  let targets: { user: string; title: string; body: string; url: string; from: string }[] = []; const none = "00000000-0000-0000-0000-000000000000";
  if (b.table === "notifications") {
    if (r.kind === "message") return NextResponse.json({ ok: true });
    const { data: a } = r.actor_id ? await admin.from("profiles").select("username").eq("id", r.actor_id).maybeSingle() : { data: null };
    targets = [{ user: r.user_id, title: r.kind === "warning" ? "Yönetim" : r.kind === "announcement" ? "📢 Duyuru" : r.kind === "system" ? "Son Kural Bükücü" : `@${a?.username ?? "Biri"}`, body: r.kind === "announcement" || r.kind === "system" ? String(r.body ?? "") : TXT[r.kind] ?? "Yeni bildirim", url: r.kind === "warning" || r.kind === "system" ? "/ayarlar" : r.kind === "announcement" ? "/topluluk" : r.post_id ? `/p/${r.post_id}` : "/bildirimler", from: r.actor_id ?? none }];
  } else if (b.table === "messages") {
    const { data: mem } = await admin.from("conversation_members").select("user_id").eq("conversation_id", r.conversation_id).neq("user_id", r.sender_id);
    const { data: s } = await admin.from("profiles").select("username").eq("id", r.sender_id).maybeSingle();
    const body = r.deleted ? "" : r.body ?? (r.image_url ? "📷 Fotoğraf" : r.audio_url ? "🎤 Ses mesajı" : "");
    targets = (mem ?? []).map((m) => ({ user: m.user_id, title: `@${s?.username ?? "Biri"}`, body: String(body).slice(0, 120), url: `/mesajlar/${r.conversation_id}`, from: r.sender_id }));
  }
  let sent = 0;
  for (const t of targets) {
    const { data: p } = await admin.from("notification_prefs").select("push,messages").eq("user_id", t.user).maybeSingle();
    if (p && (!p.push || (b.table === "messages" && !p.messages))) continue;
    const { data: bl } = await admin.from("blocks").select("blocker_id").eq("blocker_id", t.user).eq("blocked_id", t.from).maybeSingle(); if (bl) continue;
    const { data: subs } = await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth_key").eq("user_id", t.user);
    for (const s of subs ?? []) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } }, JSON.stringify({ title: t.title, body: t.body, url: t.url }), { TTL: 3600 }); sent++; }
      catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from("push_subscriptions").delete().eq("id", s.id); }
    }
  }
  return NextResponse.json({ sent });
}
