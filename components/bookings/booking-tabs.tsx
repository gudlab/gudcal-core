"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { Booking, EventType } from "@/app/generated/prisma/client";

import { BookingCard } from "./booking-card";

type BookingWithEventType = Booking & {
  eventType: Pick<EventType, "title" | "duration" | "color" | "locationType">;
};

interface BookingTabsProps {
  upcoming: BookingWithEventType[];
  pending: BookingWithEventType[];
  past: BookingWithEventType[];
  cancelled: BookingWithEventType[];
}

const tabs = [
  { id: "upcoming", label: "Upcoming" },
  { id: "pending", label: "Pending" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function BookingTabs({
  upcoming,
  pending,
  past,
  cancelled,
}: BookingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("upcoming");

  const bookingsMap: Record<TabId, BookingWithEventType[]> = {
    upcoming,
    pending,
    past,
    cancelled,
  };

  const activeBookings = bookingsMap[activeTab];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border p-1">
        {tabs.map((tab) => {
          const count = bookingsMap[tab.id].length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {activeBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            No {activeTab} bookings
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              showActions={activeTab === "upcoming" || activeTab === "pending"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
