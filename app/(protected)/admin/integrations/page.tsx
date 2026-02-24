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

export const metadata = constructMetadata({
  title: "Integrations \u2013 Admin \u2013 GudCal",
  description: "Manage platform integrations.",
});

export default async function AdminIntegrationsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const connections = await prisma.calendarConnection.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { name: true, username: true, email: true },
      },
    },
    take: 100,
  });

  // Group by provider for summary stats
  const providerCounts = connections.reduce(
    (acc, c) => {
      acc[c.provider] = (acc[c.provider] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <>
      <DashboardHeader
        heading="Integration Management"
        text={`${connections.length} active calendar connection${connections.length !== 1 ? "s" : ""}`}
      />
      <div className="flex flex-col gap-5">
        {/* Provider summary */}
        {Object.keys(providerCounts).length > 0 && (
          <div className="flex gap-3">
            {Object.entries(providerCounts).map(([provider, count]) => (
              <Badge key={provider} variant="secondary" className="px-3 py-1">
                {provider}: {count} connection{count !== 1 ? "s" : ""}
              </Badge>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Calendar Connections</CardTitle>
            <CardDescription>
              All calendar integrations connected by platform users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connections.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No calendar integrations connected yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="hidden sm:table-cell">Calendar Email</TableHead>
                    <TableHead className="hidden md:table-cell">Primary</TableHead>
                    <TableHead className="text-right">Connected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">
                          {c.user.name || c.user.username || "Unnamed"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {c.user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.provider}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {c.email || "N/A"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {c.isPrimary ? (
                          <Badge variant="default">Primary</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {format(c.createdAt, "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
