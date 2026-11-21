import Link from "next/link";
export default function Rich({ text }: { text: string }) {
  return <>{text.split(/(@[a-zA-Z0-9_]{3,20}|#[\p{L}\p{N}_]{2,30})/u).map((p, i) =>
    /^@[a-zA-Z0-9_]{3,20}$/.test(p) ? <Link key={i} href={`/${p.slice(1).toLowerCase()}`} className="font-semibold text-accent">{p}</Link>
    : /^#[\p{L}\p{N}_]{2,30}$/u.test(p) ? <Link key={i} href={`/etiket/${encodeURIComponent(p.slice(1).toLowerCase())}`} className="font-semibold text-accent">{p}</Link> : p)}</>;
}
