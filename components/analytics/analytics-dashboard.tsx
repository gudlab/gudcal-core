"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

interface AnalyticsDashboardProps {
  stats: {
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    conversionRate: number;
  };
  popularEventTypes: {
    name: string;
    color: string;
    count: number;
  }[];
  dailyData: {
    date: string;
    bookings: number;
  }[];
}

export function AnalyticsDashboard({
  stats,
  popularEventTypes,
  dailyData,
}: AnalyticsDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Icons.calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <Icons.check className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmedBookings}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <Icons.close className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelledBookings}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Icons.zap className="size-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Confirmed / Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Popular Event Types */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Event Types</CardTitle>
        </CardHeader>
        <CardContent>
          {popularEventTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No bookings yet
            </p>
          ) : (
            <div className="space-y-3">
              {popularEventTypes.map((et, i) => {
                const maxCount = popularEventTypes[0]?.count ?? 1;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: et.color }}
                        />
                        <span>{et.name}</span>
                      </div>
                      <span className="font-medium">{et.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${(et.count / maxCount) * 100}%`,
                          backgroundColor: et.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
