import ProfileView from "@/components/ProfileView";
export default function Page({ params }: { params: { username: string } }) {
  return <ProfileView username={decodeURIComponent(params.username).toLowerCase()} />;
}
