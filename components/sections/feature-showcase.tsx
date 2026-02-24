import { Icons } from "@/components/shared/icons";

interface FeatureShowcaseProps {
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  title: string;
  description: string;
  features: string[];
  illustration: React.ReactNode;
  reversed?: boolean;
}

function FeatureShowcaseItem({
  icon: Icon,
  badge,
  title,
  description,
  features,
  illustration,
  reversed,
}: FeatureShowcaseProps) {
  return (
    <div
      className={`flex flex-col items-center gap-8 lg:gap-16 ${reversed ? "lg:flex-row-reverse" : "lg:flex-row"}`}
    >
      <div className="flex-1 space-y-4">
        <div className="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-medium">
          <Icon className="mr-1.5 size-3.5 text-primary" />
          {badge}
        </div>
        <h3 className="font-satoshi text-2xl font-black tracking-tight sm:text-3xl">
          {title}
        </h3>
        <p className="text-muted-foreground sm:text-lg">{description}</p>
        <ul className="space-y-2 pt-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <Icons.check className="size-4 shrink-0 text-green-500" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
          {illustration}
        </div>
      </div>
    </div>
  );
}

function CalendarIllustration() {
  return (
    <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Calendar frame */}
      <rect x="20" y="20" width="280" height="190" rx="12" className="fill-muted/50 stroke-border" strokeWidth="1.5" />
      <rect x="20" y="20" width="280" height="40" rx="12" className="fill-primary/10" />
      <rect x="20" y="48" width="280" height="12" className="fill-primary/10" />
      {/* Month header */}
      <text x="160" y="45" textAnchor="middle" className="fill-foreground text-xs font-semibold">February 2026</text>
      {/* Day headers */}
      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
        <text key={i} x={50 + i * 37} y="73" textAnchor="middle" className="fill-muted-foreground text-[10px]">{d}</text>
      ))}
      {/* Day grid */}
      {Array.from({ length: 28 }, (_, i) => {
        const col = (i + 0) % 7;
        const row = Math.floor((i + 0) / 7);
        const x = 50 + col * 37;
        const y = 90 + row * 28;
        const isAvailable = col > 0 && col < 6;
        const isSelected = i === 11;
        return (
          <g key={i}>
            {isSelected && (
              <rect x={x - 12} y={y - 11} width="24" height="22" rx="6" className="fill-primary" />
            )}
            {isAvailable && !isSelected && (
              <rect x={x - 12} y={y - 11} width="24" height="22" rx="6" className="fill-primary/5" />
            )}
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              className={`text-[10px] ${isSelected ? "fill-primary-foreground font-bold" : isAvailable ? "fill-foreground" : "fill-muted-foreground/40"}`}
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function McpIllustration() {
  return (
    <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* AI Agent */}
      <rect x="20" y="30" width="100" height="60" rx="10" className="fill-primary/10 stroke-primary/30" strokeWidth="1" />
      <text x="70" y="55" textAnchor="middle" className="fill-primary text-[10px] font-semibold">AI Agent</text>
      <text x="70" y="72" textAnchor="middle" className="fill-muted-foreground text-[8px]">Claude, GPT, etc</text>

      {/* Arrow */}
      <line x1="120" y1="60" x2="185" y2="60" className="stroke-primary/40" strokeWidth="1.5" strokeDasharray="4 2" />
      <polygon points="185,55 195,60 185,65" className="fill-primary/40" />

      {/* MCP Server */}
      <rect x="195" y="20" width="105" height="80" rx="10" className="fill-muted/80 stroke-border" strokeWidth="1.5" />
      <text x="247" y="45" textAnchor="middle" className="fill-foreground text-[10px] font-semibold">MCP Server</text>
      <rect x="210" y="55" width="75" height="16" rx="4" className="fill-primary/10" />
      <text x="247" y="66" textAnchor="middle" className="fill-primary text-[7px]">book_meeting</text>
      <rect x="210" y="75" width="75" height="16" rx="4" className="fill-primary/10" />
      <text x="247" y="86" textAnchor="middle" className="fill-primary text-[7px]">check_availability</text>

      {/* Response flow */}
      <line x1="247" y1="100" x2="247" y2="130" className="stroke-primary/40" strokeWidth="1.5" strokeDasharray="4 2" />
      <polygon points="242,130 247,140 252,130" className="fill-primary/40" />

      {/* Calendar */}
      <rect x="195" y="140" width="105" height="60" rx="10" className="fill-green-500/10 stroke-green-500/30" strokeWidth="1" />
      <text x="247" y="165" textAnchor="middle" className="fill-green-600 text-[10px] font-semibold">Calendar</text>
      <text x="247" y="182" textAnchor="middle" className="fill-muted-foreground text-[8px]">Event Created</text>

      {/* User */}
      <rect x="20" y="140" width="100" height="60" rx="10" className="fill-muted/50 stroke-border" strokeWidth="1" />
      <text x="70" y="165" textAnchor="middle" className="fill-foreground text-[10px] font-semibold">Your Guest</text>
      <text x="70" y="182" textAnchor="middle" className="fill-muted-foreground text-[8px]">Gets confirmation</text>

      <line x1="120" y1="170" x2="185" y2="170" className="stroke-green-500/40" strokeWidth="1.5" strokeDasharray="4 2" />
      <polygon points="120,165 110,170 120,175" className="fill-green-500/40" />
    </svg>
  );
}

function TeamIllustration() {
  return (
    <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Team members */}
      {[
        { x: 60, y: 50, label: "Alice", color: "fill-emerald-500" },
        { x: 160, y: 50, label: "Bob", color: "fill-green-500" },
        { x: 260, y: 50, label: "Carol", color: "fill-teal-500" },
      ].map((member) => (
        <g key={member.label}>
          <circle cx={member.x} cy={member.y} r="20" className={`${member.color}/20`} />
          <circle cx={member.x} cy={member.y - 4} r="7" className={member.color} opacity="0.6" />
          <ellipse cx={member.x} cy={member.y + 10} rx="12" ry="7" className={member.color} opacity="0.4" />
          <text x={member.x} y={member.y + 34} textAnchor="middle" className="fill-foreground text-[10px] font-medium">{member.label}</text>
        </g>
      ))}

      {/* Round-robin arrows */}
      <line x1="90" y1="50" x2="130" y2="50" className="stroke-primary/30" strokeWidth="1" />
      <line x1="190" y1="50" x2="230" y2="50" className="stroke-primary/30" strokeWidth="1" />

      {/* Central scheduler */}
      <rect x="85" y="120" width="150" height="70" rx="12" className="fill-primary/5 stroke-primary/20" strokeWidth="1.5" />
      <text x="160" y="145" textAnchor="middle" className="fill-primary text-[10px] font-semibold">Round-Robin Scheduler</text>
      <rect x="105" y="155" width="110" height="22" rx="6" className="fill-primary/10" />
      <text x="160" y="170" textAnchor="middle" className="fill-primary text-[8px]">Next available: Bob</text>

      {/* Connecting lines */}
      <line x1="60" y1="84" x2="120" y2="120" className="stroke-primary/20" strokeWidth="1" strokeDasharray="3 2" />
      <line x1="160" y1="84" x2="160" y2="120" className="stroke-primary/20" strokeWidth="1" strokeDasharray="3 2" />
      <line x1="260" y1="84" x2="200" y2="120" className="stroke-primary/20" strokeWidth="1" strokeDasharray="3 2" />
    </svg>
  );
}

const showcaseItems: FeatureShowcaseProps[] = [
  {
    icon: Icons.calendar,
    badge: "Smart Scheduling",
    title: "Availability that just works",
    description:
      "Define your working hours, buffer times, and date overrides. GudCal handles timezone conversions automatically so your guests always see the right times.",
    features: [
      "Customizable availability schedules",
      "Buffer times between meetings",
      "Timezone-aware booking pages",
      "Date-specific overrides",
      "Google Calendar conflict checking",
    ],
    illustration: <CalendarIllustration />,
  },
  {
    icon: Icons.zap,
    badge: "AI Native",
    title: "Built for the AI agent era",
    description:
      "GudCal includes a built-in MCP server so AI assistants like Claude can book meetings, check availability, and manage your calendar on your behalf.",
    features: [
      "Model Context Protocol (MCP) server",
      "AI agents can book and cancel meetings",
      "Query availability programmatically",
      "REST API with key authentication",
      "Real-time webhooks for all events",
    ],
    illustration: <McpIllustration />,
    reversed: true,
  },
  {
    icon: Icons.users,
    badge: "Team Scheduling",
    title: "Scheduling for teams of any size",
    description:
      "Round-robin assignment, collective scheduling, and organization management. Everyone stays in sync without the back-and-forth.",
    features: [
      "Round-robin meeting distribution",
      "Collective scheduling (find a time that works for everyone)",
      "Organization & team management",
      "Per-member availability rules",
      "Team analytics dashboard",
    ],
    illustration: <TeamIllustration />,
  },
];

export default function FeatureShowcase() {
  return (
    <section className="container space-y-20 py-12 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-satoshi text-3xl font-black tracking-tight sm:text-4xl">
          Built for developers, designed for everyone
        </h2>
        <p className="mt-3 text-balance text-muted-foreground sm:text-lg">
          A complete scheduling platform with the features you need and none of
          the bloat.
        </p>
      </div>

      <div className="space-y-24">
        {showcaseItems.map((item) => (
          <FeatureShowcaseItem key={item.title} {...item} />
        ))}
      </div>
    </section>
  );
}
