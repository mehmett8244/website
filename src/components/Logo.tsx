export default function Logo({ size = 32 }: { size?: number }) {
  return (<span className="inline-flex items-center gap-2 font-bold tracking-tight">
    <img src="/logo.jpg" alt="SKD" style={{ width: size, height: size }} className="rounded-xl object-cover" />Son Kural Bükücü</span>);
}
