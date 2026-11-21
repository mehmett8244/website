import { supabase } from "./supabase/client";
const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const b64 = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(Array.from(r).map((c) => c.charCodeAt(0))); };
export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!KEY;
export async function pushEnabled(): Promise<boolean> { if (!pushSupported()) return false; const reg = await navigator.serviceWorker.getRegistration("/sw.js"); return !!(await reg?.pushManager.getSubscription()); }
export async function enablePush(): Promise<string | null> {
  if (!pushSupported()) return "Bu tarayıcı veya cihaz telefon bildirimini desteklemiyor (iPhone'da önce siteyi ana ekrana ekleyin).";
  if ((await Notification.requestPermission()) !== "granted") return "Bildirim izni verilmedi.";
  const reg = await navigator.serviceWorker.register("/sw.js"); await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(KEY!) as unknown as BufferSource }); const j = sub.toJSON();
  const { error } = await supabase().rpc("save_push", { e: sub.endpoint, p: j.keys?.p256dh, a: j.keys?.auth }); return error ? "Abonelik kaydedilemedi." : null;
}
export async function disablePush() { const reg = await navigator.serviceWorker.getRegistration("/sw.js"); const sub = await reg?.pushManager.getSubscription();
  if (sub) { await supabase().from("push_subscriptions").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); } }
