import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/current-user";
import { getProfileData } from "@/lib/directory";
import { ProfileForm } from "./profile-form";
import { ReviewBanner } from "./review-banner";

export default async function ProfilePage() {
  const user = await getCurrentAppUser();
  if (!user) redirect("/sign-in");

  const profile = await getProfileData(user.id);
  if (!profile) redirect("/sign-in");

  const needsReview = !user.profile_confirmed_at;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Profile & Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your profile and notification preferences
        </p>
      </div>

      {needsReview && <ReviewBanner />}

      <ProfileForm profile={profile} showConfirmButton={needsReview} />
    </div>
  );
}
