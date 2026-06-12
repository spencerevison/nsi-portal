import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/current-user";
import { getProfileData } from "@/lib/directory";
import { getFamilyEditorData, listLinkableMembers } from "@/lib/family-data";
import { ProfileForm } from "./profile-form";
import { ReviewBanner } from "./review-banner";

export default async function ProfilePage() {
  const user = await getCurrentAppUser();
  if (!user) redirect("/sign-in");

  const [profile, family, members] = await Promise.all([
    getProfileData(user.id),
    getFamilyEditorData(user.id),
    listLinkableMembers(user.id),
  ]);
  if (!profile) redirect("/sign-in");

  // children live in the family graph now
  profile.custom_fields = profile.custom_fields.filter(
    (f) => f.field_name !== "Children",
  );

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

      <ProfileForm
        profile={profile}
        family={family}
        members={members}
        showConfirmButton={needsReview}
      />
    </div>
  );
}
