"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Logo from "@/components/Logo"; import { RESERVED } from "@/lib/reserved";
export default function Giris() {
  const r = useRouter(); const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [username, setUsername] = useState("");
  const [ok, setOk] = useState(false); const [inv, setInv] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { const q = new URLSearchParams(location.search); const c = q.get("davet"); if (c) { setInv(c); setMode("up"); }
    if (q.get("hata")) setMsg("Bağlantı geçersiz veya süresi dolmuş. Şifre sıfırlamayı tekrar iste ve bağlantıyı mümkünse isteği yaptığın cihaz ve tarayıcıda aç."); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(""); const sb = supabase();
    if (mode === "reset") {
      document.cookie = "skb_recovery=1; path=/; max-age=3600; samesite=lax";
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent("/ayarlar?sifre=1")}` });
      setMsg(error ? (error.status === 429 ? "Çok sık denedin, birkaç dakika bekleyip tekrar dene." : "Bağlantı gönderilemedi: " + error.message) : "Bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Spam klasörünü de kontrol et."); setBusy(false); return;
    }
    if (mode === "in") { const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMsg(error.message.toLowerCase().includes("not confirmed") ? "E-postanı henüz doğrulamadın. Gelen kutundaki bağlantıya tıkla." : "E-posta veya şifre hatalı."); else { r.push("/"); r.refresh(); } }
    else {
      if (!/^[a-z0-9_]{3,20}$/.test(username) || RESERVED.includes(username)) { setMsg("Kullanıcı adı 3-20 karakter; küçük harf, rakam veya _ içermeli ve ayrılmış bir ad olmamalı."); setBusy(false); return; }
      if (!ok) { setMsg("Devam etmek için koşulları kabul etmelisin."); setBusy(false); return; }
      const { error } = await sb.auth.signUp({ email: email.trim(), password, options: { data: { username, invite: inv }, emailRedirectTo: `${location.origin}/auth/callback?next=/` } });
      setMsg(error ? (error.status === 429 ? "Çok sık denedin, birkaç dakika bekleyip tekrar dene." : error.message) : "Doğrulama bağlantısı e-postana gönderildi.");
    }
    setBusy(false);
  }
  const inp = "w-full rounded-xl border border-line bg-bg px-4 py-3 outline-none focus:border-accent";
  return (<main className="grid min-h-screen place-items-center p-6"><form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl border border-line bg-card p-8">
    <Logo /><p className="text-sm opacity-70">{mode === "reset" ? "Şifreni sıfırlamak için e-posta adresini yaz." : "Break the rules. Create your world."}</p>
    {mode === "up" && <input className={inp} placeholder="Kullanıcı adı" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} required />}
    <input className={inp} type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} required />
    {mode !== "reset" && <input className={inp} type="password" minLength={8} placeholder="Şifre (en az 8 karakter)" value={password} onChange={(e) => setPassword(e.target.value)} required />}
    {mode === "up" && <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-0.5" /><span><a href="/kosullar" target="_blank" className="text-accent">Kullanım Koşulları</a>, <a href="/gizlilik" target="_blank" className="text-accent">Gizlilik Politikası</a> ve <a href="/kvkk" target="_blank" className="text-accent">KVKK Aydınlatma Metni</a>'ni okudum, kabul ediyorum.</span></label>}
    {msg && <p role="status" className="text-sm text-accent">{msg}</p>}
    <button disabled={busy} className="w-full rounded-xl bg-accent py-3 font-semibold text-on disabled:opacity-60">{mode === "in" ? "Giriş yap" : mode === "up" ? "Hesap oluştur" : "Sıfırlama bağlantısı gönder"}</button>
    <div className="flex justify-between text-sm">{mode === "reset" ? <button type="button" onClick={() => { setMode("in"); setMsg(""); }} className="text-accent">Girişe dön</button>
      : <><button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }} className="text-accent">{mode === "in" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}</button>
      {mode === "in" && <button type="button" onClick={() => { setMode("reset"); setMsg(""); }} className="opacity-70">Şifremi unuttum</button>}</>}</div></form></main>);
}
