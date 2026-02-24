import { redirect } from "next/navigation";
import { format } from "date-fns";
import { CalendarClock, Clock, Link2, Users } from "lucide-react";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { constructMetadata } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardHeader } from "@/components/dashboard/header";
import InfoCard from "@/components/dashboard/info-card";

export const metadata = constructMetadata({
  title: "Admin \u2013 GudCal",
  description: "Admin overview and platform management.",
});

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [totalUsers, totalBookings, activeEventTypes, totalIntegrations, recentUsers, recentBookings] =
    await Promise.all([
      prisma.user.count(),
      prisma.booking.count(),
      prisma.eventType.count({ where: { isActive: true } }),
      prisma.calendarConnection.count(),
      prisma.user.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.booking.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          eventType: { select: { title: true, color: true } },
          host: { select: { name: true, username: true } },
        },
      }),
    ]);

  return (
    <>
      <DashboardHeader
        heading="Admin Overview"
        text="Platform-wide statistics and recent activity."
      />
      <div className="flex flex-col gap-5">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            title="Total Users"
            value={totalUsers}
            icon={Users}
          />
          <InfoCard
            title="Total Bookings"
            value={totalBookings}
            icon={Clock}
          />
          <InfoCard
            title="Active Event Types"
            value={activeEventTypes}
            icon={CalendarClock}
          />
          <InfoCard
            title="Calendar Integrations"
            value={totalIntegrations}
            icon={Link2}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {/* Recent Users */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>Latest registered users</CardDescription>
            </CardHeader>
            <CardContent>
              {recentUsers.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No users yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="hidden sm:table-cell">Role</TableHead>
                      <TableHead className="text-right">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="font-medium">
                            {u.name || u.username || "Unnamed"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {u.email}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            variant={
                              u.role === "ADMIN" ? "default" : "secondary"
                            }
                          >
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {format(u.createdAt, "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Latest bookings across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {recentBookings.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No bookings yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead className="hidden sm:table-cell">Event</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          <div className="font-medium">{b.guestName}</div>
                          <div className="text-sm text-muted-foreground">
                            {b.guestEmail}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div
                              className="size-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor: b.eventType.color,
                              }}
                            />
                            <span className="text-sm">
                              {b.eventType.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              b.status === "CONFIRMED"
                                ? "default"
                                : b.status === "CANCELLED"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {b.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
