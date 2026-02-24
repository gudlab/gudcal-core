import { redirect } from "next/navigation";
import { format } from "date-fns";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { BookingTabs } from "@/components/bookings/booking-tabs";

export const metadata = {
  title: "Bookings – GudCal",
};

export default async function BookingsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const now = new Date();

  const [upcoming, pending, past, cancelled] = await Promise.all([
    prisma.booking.findMany({
      where: {
        userId,
        startTime: { gte: now },
        status: { in: ["CONFIRMED"] },
      },
      include: {
        eventType: {
          select: { title: true, duration: true, color: true, locationType: true },
        },
      },
      orderBy: { startTime: "asc" },
      take: 50,
    }),
    prisma.booking.findMany({
      where: { userId, status: "PENDING" },
      include: {
        eventType: {
          select: { title: true, duration: true, color: true, locationType: true },
        },
      },
      orderBy: { startTime: "asc" },
      take: 50,
    }),
    prisma.booking.findMany({
      where: {
        userId,
        endTime: { lt: now },
        status: { in: ["CONFIRMED", "NO_SHOW"] },
      },
      include: {
        eventType: {
          select: { title: true, duration: true, color: true, locationType: true },
        },
      },
      orderBy: { startTime: "desc" },
      take: 50,
    }),
    prisma.booking.findMany({
      where: { userId, status: "CANCELLED" },
      include: {
        eventType: {
          select: { title: true, duration: true, color: true, locationType: true },
        },
      },
      orderBy: { startTime: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-muted-foreground">
          Manage your scheduled meetings
        </p>
      </div>

      <BookingTabs
        upcoming={upcoming}
        pending={pending}
        past={past}
        cancelled={cancelled}
      />
    </div>
  );
}
