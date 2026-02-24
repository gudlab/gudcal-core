import { notFound } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { name: true, username: true, bio: true },
  });

  if (!user) {
    return { title: "User not found" };
  }

  return {
    title: `${user.name ?? user.username} | GudCal`,
    description: user.bio ?? `Book a meeting with ${user.name ?? user.username}`,
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
    },
  });

  if (!user) {
    notFound();
  }

  const eventTypes = await prisma.eventType.findMany({
    where: {
      userId: user.id,
      isActive: true,
      visibility: "PUBLIC",
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      duration: true,
      color: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* Profile Header */}
      <div className="mb-8 flex flex-col items-center text-center">
        <Avatar className="mb-4 size-20">
          {user.image ? (
            <AvatarImage
              alt={user.name ?? user.username ?? "User"}
              src={user.image}
              referrerPolicy="no-referrer"
            />
          ) : (
            <AvatarFallback>
              <Icons.user className="size-8" />
            </AvatarFallback>
          )}
        </Avatar>
        <h1 className="text-2xl font-bold">{user.name ?? user.username}</h1>
        {user.bio && (
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {user.bio}
          </p>
        )}
      </div>

      {/* Event Types */}
      {eventTypes.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No event types available.
        </p>
      ) : (
        <div className="space-y-3">
          {eventTypes.map((eventType) => (
            <Link
              key={eventType.id}
              href={`/${user.username}/${eventType.slug}`}
              className="block"
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: eventType.color }}
                      aria-hidden="true"
                    />
                    <CardTitle className="text-base">
                      {eventType.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Icons.clock className="size-3" />
                      {eventType.duration} min
                    </span>
                  </div>
                  {eventType.description && (
                    <CardDescription className="mt-2 line-clamp-2">
                      {eventType.description}
                    </CardDescription>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
