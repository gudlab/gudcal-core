import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { constructMetadata } from "@/lib/utils";
import { DeleteAccountSection } from "@/components/dashboard/delete-account";
import { DashboardHeader } from "@/components/dashboard/header";
import { UserRoleForm } from "@/components/forms/user-role-form";
import { ApiKeyManager } from "@/components/settings/api-key-manager";

export const metadata = constructMetadata({
  title: "Settings \u2013\u00a0GudCal",
  description: "Configure your account and website settings.",
});

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user?.id) redirect("/login");

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      key: true,
      lastUsed: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Mask keys
  const maskedKeys = apiKeys.map((k) => ({
    ...k,
    key: `fc_${"*".repeat(24)}${k.key.slice(-8)}`,
  }));

  return (
    <>
      <DashboardHeader
        heading="Settings"
        text="Manage API keys, role, and account settings."
      />
      <div className="divide-y divide-muted pb-10">
        <UserRoleForm user={{ id: user.id, role: user.role }} />
        <ApiKeyManager initialKeys={maskedKeys} />
        <DeleteAccountSection />
      </div>
    </>
  );
}
