import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { WeeklyScheduleEditor } from "@/components/availability/weekly-schedule-editor";

export const metadata = {
  title: "Edit Availability - GudCal",
};

interface EditAvailabilityPageProps {
  params: Promise<{ availabilityId: string }>;
}

export default async function EditAvailabilityPage({
  params,
}: EditAvailabilityPageProps) {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");

  const { availabilityId } = await params;

  const availability = await prisma.availability.findFirst({
    where: { id: availabilityId, userId: user.id },
    include: {
      rules: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      dateOverrides: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!availability) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Availability</h1>
        <p className="text-muted-foreground">
          Update your &quot;{availability.name}&quot; schedule
        </p>
      </div>

      <WeeklyScheduleEditor
        availabilityId={availability.id}
        defaultValues={{
          name: availability.name,
          timezone: availability.timezone,
          rules: availability.rules.map((rule) => ({
            dayOfWeek: rule.dayOfWeek,
            startTime: rule.startTime,
            endTime: rule.endTime,
          })),
          dateOverrides: availability.dateOverrides.map((override) => ({
            date: override.date.toISOString().split("T")[0],
            startTime: override.startTime,
            endTime: override.endTime,
            isBlocked: override.isBlocked,
          })),
        }}
      />
    </div>
  );
}
