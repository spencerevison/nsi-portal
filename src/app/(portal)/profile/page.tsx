import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/current-user";
import { getProfileData } from "@/lib/directory";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await getCurrentAppUser();
  if (!user) redirect("/sign-in");

  const profile = await getProfileData(user.id);
  if (!profile) redirect("/sign-in");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Profile & Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your profile and notification preferences
        </p>
      </div>

      <ProfileForm profile={profile} />
    </div>
  );
}
