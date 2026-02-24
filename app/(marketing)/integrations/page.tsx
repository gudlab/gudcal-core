import { Metadata } from "next";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { HeaderSection } from "@/components/shared/header-section";
import { Icons } from "@/components/shared/icons";

export const metadata: Metadata = {
  title: "Integrations Marketplace",
  description:
    "Discover and install AI-powered integrations for GudCal. Connect your scheduling with the tools your agents already use.",
};

const categories = [
  { name: "All", slug: "all" },
  { name: "AI Agents", slug: "ai-agents" },
  { name: "CRM", slug: "crm" },
  { name: "Video", slug: "video" },
  { name: "Payment", slug: "payment" },
  { name: "Analytics", slug: "analytics" },
  { name: "Communication", slug: "communication" },
];

const integrations = [
  {
    name: "MCP Server",
    description:
      "Connect any AI agent to GudCal via the Model Context Protocol. Let Claude, GPT, or any LLM manage scheduling autonomously.",
    category: "ai-agents",
    icon: "zap",
    featured: true,
    status: "available" as const,
  },
  {
    name: "Google Calendar",
    description:
      "Two-way sync with Google Calendar. Automatically check conflicts and create events.",
    category: "calendar",
    icon: "calendar",
    status: "available" as const,
  },
  {
    name: "Outlook Calendar",
    description:
      "Sync your Outlook/Microsoft 365 calendar for conflict detection and event creation.",
    category: "calendar",
    icon: "calendar",
    status: "available" as const,
  },
  {
    name: "Zoom",
    description:
      "Automatically generate Zoom meeting links for video call bookings.",
    category: "video",
    icon: "video",
    status: "available" as const,
  },
  {
    name: "Google Meet",
    description:
      "Create Google Meet links automatically when bookings are confirmed.",
    category: "video",
    icon: "video",
    status: "available" as const,
  },
  {
    name: "Slack",
    description:
      "Get booking notifications in Slack. Let team members manage availability from Slack.",
    category: "communication",
    icon: "messages",
    status: "coming-soon" as const,
  },
  {
    name: "HubSpot",
    description:
      "Sync bookings with HubSpot CRM. Auto-create contacts and log meetings.",
    category: "crm",
    icon: "users",
    status: "coming-soon" as const,
  },
  {
    name: "Salesforce",
    description:
      "Connect GudCal with Salesforce for automatic lead and meeting tracking.",
    category: "crm",
    icon: "users",
    status: "coming-soon" as const,
  },
  {
    name: "Webhooks",
    description:
      "Send real-time booking events to any URL. Build custom workflows with booking data.",
    category: "ai-agents",
    icon: "globe",
    status: "available" as const,
  },
  {
    name: "REST API",
    description:
      "Full REST API access for custom integrations. Manage events, bookings, and availability programmatically.",
    category: "ai-agents",
    icon: "link",
    status: "available" as const,
  },
  {
    name: "n8n / Make",
    description:
      "Connect GudCal to 1000+ apps via n8n or Make automation platforms.",
    category: "ai-agents",
    icon: "zap",
    status: "coming-soon" as const,
  },
];

function IntegrationCard({
  integration,
}: {
  integration: (typeof integrations)[0];
}) {
  const IconComponent = Icons[integration.icon as keyof typeof Icons];

  return (
    <div className="group relative flex flex-col rounded-xl border bg-background p-6 transition-shadow hover:shadow-md">
      {integration.featured && (
        <span className="absolute -top-2 right-4 rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-medium text-white">
          Featured
        </span>
      )}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
          {typeof IconComponent === "function" ? (
            <IconComponent className="size-5 text-emerald-600" />
          ) : null}
        </div>
        <div>
          <h3 className="font-semibold">{integration.name}</h3>
        </div>
      </div>
      <p className="mb-4 flex-1 text-sm text-muted-foreground">
        {integration.description}
      </p>
      <div className="flex items-center justify-between">
        {integration.status === "available" ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <Icons.check className="size-3" /> Available
          </span>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">
            Coming Soon
          </span>
        )}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="container py-12 sm:py-20">
      <HeaderSection
        label="Integrations"
        title="Agent-First Integrations Marketplace"
        subtitle="Connect GudCal with the AI agents and tools you already use. Build custom integrations with our MCP server and REST API."
      />

      {/* CTA for developers */}
      <div className="mx-auto mt-10 max-w-2xl rounded-xl border bg-gradient-to-r from-emerald-500/5 via-green-500/5 to-teal-500/5 p-6 text-center">
        <h3 className="font-semibold">Build Your Own Integration</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          GudCal is open source and agent-first. Use our MCP server, REST API,
          or webhooks to build integrations that connect scheduling with any AI
          agent or workflow.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link
            href="/docs"
            className={cn(
              buttonVariants({ size: "sm", rounded: "xl" }),
              "gap-2",
            )}
          >
            <Icons.bookOpen className="size-4" />
            Read the Docs
          </Link>
          <Link
            href="https://github.com/gudlab/gudcal-core"
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm", rounded: "xl" }),
              "gap-2",
            )}
          >
            <Icons.gitHub className="size-4" />
            View on GitHub
          </Link>
        </div>
      </div>

      {/* Category filters */}
      <div className="mt-12 flex flex-wrap justify-center gap-2">
        {categories.map((category) => (
          <span
            key={category.slug}
            className={cn(
              "cursor-default rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              category.slug === "all"
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {category.name}
          </span>
        ))}
      </div>

      {/* Integration grid */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.name} integration={integration} />
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="mt-16 text-center">
        <h3 className="text-xl font-semibold">
          Don&apos;t see what you need?
        </h3>
        <p className="mt-2 text-muted-foreground">
          GudCal is open source. Submit an integration request or build your own.
        </p>
        <div className="mt-6">
          <Link
            href="https://github.com/gudlab/gudcal-core/issues"
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", rounded: "xl" }),
              "gap-2",
            )}
          >
            <Icons.gitHub className="size-4" />
            Request an Integration
          </Link>
        </div>
      </div>
    </div>
  );
}
