import { getCurrentAppUser } from "@/lib/current-user";

export default async function HomePage() {
  const user = await getCurrentAppUser();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">
        Welcome{user ? `, ${user.first_name}` : ""}
      </h1>
      <p className="text-neutral-600">North Secretary Island Community Portal</p>
      {/* TODO: dashboard cards — recent docs, new posts, etc. */}
    </div>
  );
}
