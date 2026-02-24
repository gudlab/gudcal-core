import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { EventTypeForm } from "@/components/event-types/event-type-form";

export const metadata = {
  title: "New Event Type – GudCal",
};

export default async function NewEventTypePage() {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Event Type</h1>
        <p className="text-muted-foreground">
          Set up a new type of meeting people can book with you
        </p>
      </div>

      <EventTypeForm />
    </div>
  );
}
