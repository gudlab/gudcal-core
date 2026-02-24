import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

export const metadata = {
  title: "About – GudCal",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold">About GudCal</h1>

      <div className="mt-8 space-y-6 text-muted-foreground">
        <p>
          GudCal is open-source scheduling infrastructure built for the AI
          agent era. It is a self-hostable alternative to Calendly with a
          built-in MCP server, team scheduling, and smart availability
          management.
        </p>

        <p>
          We believe scheduling should be open, extensible, and owned by the
          people who use it. Whether you are a freelancer managing client
          bookings, a team coordinating across time zones, or an AI agent
          booking meetings on behalf of users — GudCal handles it.
        </p>

        <h2 className="pt-4 text-2xl font-bold text-foreground">
          Why GudCal?
        </h2>

        <ul className="space-y-3">
          <li className="flex items-start gap-2">
            <Icons.check className="mt-1 size-4 shrink-0 text-green-500" />
            <span>
              <strong className="text-foreground">Open source</strong> — MIT
              licensed, free forever. Inspect, modify, and contribute.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Icons.check className="mt-1 size-4 shrink-0 text-green-500" />
            <span>
              <strong className="text-foreground">Self-hostable</strong> — Run
              on your own infrastructure with Docker or any Node.js host. Own
              your data.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Icons.check className="mt-1 size-4 shrink-0 text-green-500" />
            <span>
              <strong className="text-foreground">AI-native</strong> — Built-in
              MCP server lets AI agents discover availability and book meetings
              programmatically.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Icons.check className="mt-1 size-4 shrink-0 text-green-500" />
            <span>
              <strong className="text-foreground">Completely free</strong> —
              Unlimited event types, unlimited bookings, and calendar sync. No paywalls.
            </span>
          </li>
        </ul>

        <h2 className="pt-4 text-2xl font-bold text-foreground">
          Tech Stack
        </h2>

        <p>
          GudCal is built with Next.js, TypeScript, Prisma, PostgreSQL,
          Auth.js, and Tailwind CSS. The MCP server uses the official Model
          Context Protocol SDK.
        </p>

        <h2 className="pt-4 text-2xl font-bold text-foreground">
          Get Involved
        </h2>

        <p>
          GudCal is built in the open. Contributions, bug reports, and feature
          requests are welcome on GitHub.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={siteConfig.links.github}
          target="_blank"
          rel="noreferrer"
          className={cn(
            buttonVariants({ variant: "outline", rounded: "xl", size: "lg" }),
            "gap-2 px-6",
          )}
        >
          <Icons.gitHub className="size-4" />
          View on GitHub
        </Link>
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
