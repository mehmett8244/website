export default function Avatar({ url, name, size = 80 }: { url?: string | null; name: string; size?: number }) {
  return url ? <img src={url} alt="" style={{ width: size, height: size }} className="rounded-full object-cover" />
    : <span style={{ width: size, height: size, fontSize: size / 2.5 }} className="grid place-items-center rounded-full bg-accent/20 font-bold text-accent">{name[0]?.toUpperCase()}</span>;
}
