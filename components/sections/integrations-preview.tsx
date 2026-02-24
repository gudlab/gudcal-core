import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { HeaderSection } from "@/components/shared/header-section";
import { Icons } from "@/components/shared/icons";

const highlights = [
  {
    icon: "zap" as const,
    title: "MCP Server",
    description: "Let AI agents schedule meetings, check availability, and manage bookings through the Model Context Protocol.",
  },
  {
    icon: "globe" as const,
    title: "REST API & Webhooks",
    description: "Full programmatic access to events, bookings, and availability. Real-time webhook notifications.",
  },
  {
    icon: "video" as const,
    title: "Video Conferencing",
    description: "Auto-generate Zoom and Google Meet links when bookings are confirmed.",
  },
  {
    icon: "calendar" as const,
    title: "Calendar Sync",
    description: "Two-way sync with Google Calendar and Outlook. Never double-book again.",
  },
  {
    icon: "messages" as const,
    title: "Notifications",
    description: "Slack notifications, email reminders, and custom alerts for every booking event.",
  },
];

export default function IntegrationsPreview() {
  return (
    <section className="py-16 sm:py-24">
      <div className="container">
        <HeaderSection
          label="Integrations"
          title="Agent-First Integrations"
          subtitle="Built for the AI era. Connect GudCal with your agents, tools, and workflows."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((item) => {
            const IconComponent = Icons[item.icon];
            return (
              <div
                key={item.title}
                className="group flex items-start gap-4 rounded-xl border bg-background p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <IconComponent className="size-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/integrations"
            className={cn(
              buttonVariants({ variant: "outline", rounded: "xl", size: "lg" }),
              "gap-2",
            )}
          >
            View All Integrations
            <Icons.arrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
