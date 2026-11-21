import Messages from "@/components/Messages"; export default function Page({ params }: { params: { id: string } }) { return <Messages activeId={params.id} />; }
