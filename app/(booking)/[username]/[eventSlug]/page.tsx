import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { BookingWidget } from "@/components/booking/booking-widget";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; eventSlug: string }>;
}) {
  const { username, eventSlug } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, name: true, username: true },
  });

  if (!user) {
    return { title: "Not found" };
  }

  const eventType = await prisma.eventType.findUnique({
    where: {
      userId_slug: { userId: user.id, slug: eventSlug },
    },
    select: { title: true, description: true },
  });

  if (!eventType) {
    return { title: "Not found" };
  }

  return {
    title: `${eventType.title} | ${user.name ?? user.username} | GudCal`,
    description:
      eventType.description ??
      `Book ${eventType.title} with ${user.name ?? user.username}`,
  };
}

export default async function EventBookingPage({
  params,
}: {
  params: Promise<{ username: string; eventSlug: string }>;
}) {
  const { username, eventSlug } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      timezone: true,
    },
  });

  if (!user) {
    notFound();
  }

  const eventType = await prisma.eventType.findFirst({
    where: {
      userId: user.id,
      slug: eventSlug,
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      duration: true,
      color: true,
      locationType: true,
      locationValue: true,
      customQuestions: true,
    },
  });

  if (!eventType) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <BookingWidget
        eventType={{
          id: eventType.id,
          title: eventType.title,
          slug: eventType.slug,
          description: eventType.description,
          duration: eventType.duration,
          color: eventType.color,
          locationType: eventType.locationType,
          locationValue: eventType.locationValue,
          customQuestions: eventType.customQuestions as
            | { id: string; type: string; label: string; required: boolean; options?: string[] }[]
            | null,
        }}
        user={{
          name: user.name,
          username: user.username!,
          image: user.image,
          bio: user.bio,
          timezone: user.timezone,
        }}
      />
    </div>
  );
}
