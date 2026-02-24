import { redirect, notFound } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MemberManager } from "@/components/organizations/member-manager";

export const metadata = {
  title: "Members – GudCal",
};

interface MembersPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function MembersPage({ params }: MembersPageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const { orgSlug } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!org) notFound();

  const currentMember = org.members.find((m) => m.userId === userId);
  if (!currentMember) notFound();
  if (currentMember.role === "MEMBER") redirect(`/org/${orgSlug}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-muted-foreground">
          Manage members of {org.name}
        </p>
      </div>
      <MemberManager
        orgId={org.id}
        members={org.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          name: m.user.name ?? "Unknown",
          email: m.user.email ?? "",
          role: m.role,
          image: m.user.image,
        }))}
        currentUserId={userId}
        currentUserRole={currentMember.role}
      />
    </div>
  );
}
