export type Rank = { name: string; color: string; emoji: string | null } | null;
export default function RoleBadge({ role, rank }: { role?: string; rank?: Rank }) {
  const items: { t: string; c: string }[] = [];
  if (role === "admin") items.push({ t: "Yönetici", c: "#DC2626" }); else if (role === "moderator") items.push({ t: "Moderatör", c: "#2563EB" });
  if (rank) items.push({ t: `${rank.emoji ?? ""} ${rank.name}`.trim(), c: rank.color });
  return <>{items.map((i) => <span key={i.t} style={{ background: i.c + "22", color: i.c, borderColor: i.c + "66" }} className="ml-1 inline-block rounded-full border px-1.5 align-middle text-[10px] font-bold leading-4">{i.t}</span>)}</>;
}
