import { redirect, notFound } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

export const metadata = {
  title: "Organization – GudCal",
};

interface OrgPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function OrgPage({ params }: OrgPageProps) {
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
      eventTypes: {
        select: { id: true, title: true, slug: true, isActive: true, duration: true, color: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!org) notFound();

  // Verify user is a member
  const currentMember = org.members.find((m) => m.userId === userId);
  if (!currentMember) notFound();

  const isOwnerOrAdmin = currentMember.role === "OWNER" || currentMember.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="text-muted-foreground">
            {org.members.length} member{org.members.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isOwnerOrAdmin && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/org/${orgSlug}/settings`}>
              <Icons.settings className="mr-2 size-4" />
              Settings
            </Link>
          </Button>
        )}
      </div>

      {/* Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>People in this organization</CardDescription>
          </div>
          {isOwnerOrAdmin && (
            <Button asChild size="sm">
              <Link href={`/org/${orgSlug}/members`}>Manage</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {org.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                    {member.user.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.user.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  </div>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                  {member.role.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Event Types */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Event Types</CardTitle>
            <CardDescription>Shared scheduling links for the team</CardDescription>
          </div>
          {isOwnerOrAdmin && (
            <Button asChild size="sm">
              <Link href={`/org/${orgSlug}/event-types/new`}>
                <Icons.add className="mr-2 size-4" />
                New
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {org.eventTypes.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No team event types yet
            </p>
          ) : (
            <div className="space-y-3">
              {org.eventTypes.map((et) => (
                <div
                  key={et.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-1 rounded-full"
                      style={{ backgroundColor: et.color }}
                    />
                    <div>
                      <p className="text-sm font-medium">{et.title}</p>
                      <p className="text-xs text-muted-foreground">{et.duration} min</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      et.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {et.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
