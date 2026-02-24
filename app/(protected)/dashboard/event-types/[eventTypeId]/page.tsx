import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { EventTypeForm } from "@/components/event-types/event-type-form";

export const metadata = {
  title: "Edit Event Type – GudCal",
};

interface EditEventTypePageProps {
  params: Promise<{ eventTypeId: string }>;
}

export default async function EditEventTypePage({
  params,
}: EditEventTypePageProps) {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");

  const { eventTypeId } = await params;

  const eventType = await prisma.eventType.findFirst({
    where: { id: eventTypeId, userId: user.id },
  });

  if (!eventType) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Event Type</h1>
        <p className="text-muted-foreground">
          Update the settings for &quot;{eventType.title}&quot;
        </p>
      </div>

      <EventTypeForm eventType={eventType} />
    </div>
  );
}
