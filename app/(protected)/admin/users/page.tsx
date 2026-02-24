import { redirect } from "next/navigation";
import { format } from "date-fns";

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
import { AdminRoleToggle } from "@/components/admin/admin-role-toggle";

export const metadata = constructMetadata({
  title: "Users \u2013 Admin \u2013 GudCal",
  description: "Manage platform users.",
});

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") redirect("/login");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          bookingsAsHost: true,
          eventTypes: true,
        },
      },
    },
    take: 100,
  });

  return (
    <>
      <DashboardHeader
        heading="User Management"
        text={`${users.length} registered user${users.length !== 1 ? "s" : ""}`}
      />
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View and manage platform users. Toggle roles to grant or revoke admin access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No users registered yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">Username</TableHead>
                  <TableHead className="hidden lg:table-cell">Bookings</TableHead>
                  <TableHead className="hidden lg:table-cell">Events</TableHead>
                  <TableHead className="hidden sm:table-cell">Joined</TableHead>
                  <TableHead className="text-right">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">
                        {u.name || "Unnamed"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {u.email}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {u.username ? (
                        <span className="text-sm text-muted-foreground">
                          @{u.username}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground/50">
                          Not set
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm">{u._count.bookingsAsHost}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm">{u._count.eventTypes}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {format(u.createdAt, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.id === currentUser.id ? (
                        <Badge>ADMIN (you)</Badge>
                      ) : (
                        <AdminRoleToggle userId={u.id} currentRole={u.role} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
