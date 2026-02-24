import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

export const metadata = {
  title: "Features – GudCal",
};

const sections = [
  {
    icon: Icons.calendar,
    title: "Core Scheduling",
    description:
      "Create event types with custom durations, buffer times, and minimum notice periods. Set availability rules with weekly schedules and date-specific overrides. Guests see your availability in their own timezone and book instantly.",
    features: [
      "Multiple event types with custom durations",
      "Buffer time before and after meetings",
      "Minimum booking notice and max bookings per day",
      "Timezone-aware booking pages",
      "Optional booking confirmation workflow",
      "Custom questions for guests",
    ],
  },
  {
    icon: Icons.globe,
    title: "Calendar Integration",
    description:
      "Connect your Google Calendar to automatically check for conflicts and create events when bookings are confirmed. Your availability stays in sync across all your calendars.",
    features: [
      "Google Calendar two-way sync",
      "Automatic conflict detection",
      "Events created on booking confirmation",
      "Multiple calendar connections (Pro+)",
      "Outlook and more coming soon",
    ],
  },
  {
    icon: Icons.zap,
    title: "MCP Server & AI Agents",
    description:
      "GudCal includes a built-in Model Context Protocol (MCP) server that lets AI agents discover your availability, book meetings, and manage bookings programmatically.",
    features: [
      "List event types for any user",
      "Query available time slots",
      "Create and cancel bookings",
      "API key authentication for private data",
      "Works with any MCP-compatible AI client",
    ],
  },
  {
    icon: Icons.users,
    title: "Teams & Organizations",
    description:
      "Create organizations, invite team members, and manage scheduling across your team. Support for round-robin and collective scheduling ensures the right person handles each booking.",
    features: [
      "Organization management with roles",
      "Round-robin scheduling",
      "Collective scheduling for group meetings",
      "Member invitation and role management",
    ],
  },
  {
    icon: Icons.link,
    title: "API & Webhooks",
    description:
      "Build custom integrations with the REST API and real-time webhooks. Generate API keys, subscribe to booking events, and extend GudCal to fit your workflow.",
    features: [
      "REST API for bookings and availability",
      "API key generation with expiration",
      "Webhook subscriptions for booking events",
      "HMAC signature verification",
      "10-second delivery timeout with retries",
    ],
  },
  {
    icon: Icons.settings,
    title: "Self-Hosting",
    description:
      "Deploy GudCal on your own infrastructure and own your data completely. Built with Next.js and PostgreSQL, it runs anywhere you can deploy a Node.js application.",
    features: [
      "Docker and manual deployment options",
      "PostgreSQL with Prisma ORM",
      "Environment variable configuration",
      "MIT licensed — free forever",
      "No vendor lock-in",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold">
          Built for developers, teams, and AI agents
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Everything you need to run professional scheduling — open source and
          self-hostable.
        </p>
      </div>

      <div className="mt-16 space-y-20">
        {sections.map((section) => (
          <div key={section.title} className="grid gap-8 md:grid-cols-2 md:items-start">
            <div>
              <section.icon className="size-10 text-primary" />
              <h2 className="mt-4 text-2xl font-bold">{section.title}</h2>
              <p className="mt-3 text-muted-foreground">
                {section.description}
              </p>
            </div>
            <ul className="space-y-3">
              {section.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Icons.check className="mt-0.5 size-4 shrink-0 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-20 text-center">
        <Link
          href="/register"
          className={cn(
            buttonVariants({ rounded: "xl", size: "lg" }),
            "gap-2 px-6",
          )}
        >
          Get Started Free
          <Icons.arrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
