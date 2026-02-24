import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import { UserUsernameForm } from "@/components/forms/user-username-form";
import { UserNameForm } from "@/components/forms/user-name-form";
import { UserBioForm } from "@/components/forms/user-bio-form";
import { UserTimezoneForm } from "@/components/forms/user-timezone-form";

export const metadata = constructMetadata({
  title: "Profile \u2013 GudCal",
  description: "Manage your public profile and personal details.",
});

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user?.id) redirect("/login");

  // Fetch bio and timezone from DB (not in session)
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { bio: true, timezone: true },
  });

  return (
    <>
      <DashboardHeader
        heading="Profile"
        text="Manage your public profile and personal details."
      />
      <div className="divide-y divide-muted pb-10">
        <UserUsernameForm
          user={{ id: user.id, username: user.username || "" }}
        />
        <UserNameForm user={{ id: user.id, name: user.name || "" }} />
        <UserBioForm user={{ id: user.id, bio: dbUser?.bio || "" }} />
        <UserTimezoneForm
          user={{ id: user.id, timezone: dbUser?.timezone || "America/New_York" }}
        />
      </div>
    </>
  );
}
