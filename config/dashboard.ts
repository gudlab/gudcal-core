import { UserRole } from "@/app/generated/prisma/client";

import { SidebarNavItem } from "types";

export const sidebarLinks: SidebarNavItem[] = [
  {
    title: "SCHEDULING",
    items: [
      { href: "/dashboard", icon: "dashboard", title: "Dashboard" },
      {
        href: "/dashboard/event-types",
        icon: "calendarClock",
        title: "Event Types",
      },
      { href: "/dashboard/bookings", icon: "clock", title: "Bookings" },
      {
        href: "/dashboard/availability",
        icon: "calendar",
        title: "Availability",
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      {
        href: "/dashboard/profile",
        icon: "user",
        title: "Profile",
      },
      {
        href: "/dashboard/integrations",
        icon: "link",
        title: "Integrations",
      },
      {
        href: "/dashboard/analytics",
        icon: "lineChart",
        title: "Analytics",
      },
      {
        href: "/dashboard/settings",
        icon: "settings",
        title: "Settings",
      },
    ],
  },
  {
    title: "ADMIN",
    items: [
      {
        href: "/admin",
        icon: "dashboard",
        title: "Overview",
        authorizeOnly: UserRole.ADMIN,
      },
      {
        href: "/admin/users",
        icon: "users",
        title: "Users",
        authorizeOnly: UserRole.ADMIN,
      },
      {
        href: "/admin/integrations",
        icon: "link",
        title: "Integrations",
        authorizeOnly: UserRole.ADMIN,
      },
    ],
  },
];
