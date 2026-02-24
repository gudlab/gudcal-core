import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { CreateOrgForm } from "@/components/organizations/create-org-form";

export const metadata = {
  title: "Create Organization – GudCal",
};

export default async function NewOrgPage() {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Organization</h1>
        <p className="text-muted-foreground">
          Set up a team to collaborate on scheduling
        </p>
      </div>
      <CreateOrgForm />
    </div>
  );
}
