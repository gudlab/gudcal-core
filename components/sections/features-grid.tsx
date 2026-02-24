import { Icons } from "@/components/shared/icons";

const features = [
  {
    icon: Icons.calendar,
    title: "Smart Scheduling",
    description:
      "Event types, availability rules, buffer times, and timezone-aware booking pages your guests will love.",
  },
  {
    icon: Icons.zap,
    title: "MCP Server & AI Agents",
    description:
      "Built-in Model Context Protocol server lets AI agents book, cancel, and query availability on your behalf.",
  },
  {
    icon: Icons.users,
    title: "Team Scheduling",
    description:
      "Organizations, round-robin, and collective scheduling for teams of any size.",
  },
  {
    icon: Icons.globe,
    title: "Calendar Sync",
    description:
      "Connect Google Calendar to check conflicts and create events automatically. More providers coming soon.",
  },
  {
    icon: Icons.settings,
    title: "Self-Hostable",
    description:
      "Run GudCal on your own infrastructure with Docker or deploy to Vercel. Own your data completely.",
  },
  {
    icon: Icons.link,
    title: "API & Webhooks",
    description:
      "REST API with key authentication and real-time webhooks for booking events. Build custom integrations.",
  },
];

export default function FeaturesGrid() {
  return (
    <section className="container space-y-8 py-12 lg:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-satoshi text-3xl font-black tracking-tight sm:text-4xl">
          Everything you need to schedule
        </h2>
        <p className="mt-3 text-balance text-muted-foreground sm:text-lg">
          A complete scheduling platform built for developers, teams, and AI
          agents.
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border bg-card p-6 shadow-sm"
          >
            <feature.icon className="size-10 text-primary" />
            <h3 className="mt-4 font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
