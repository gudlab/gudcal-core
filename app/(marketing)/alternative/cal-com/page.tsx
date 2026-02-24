import { Metadata } from "next";

import AlternativePage from "@/components/sections/alternative-page";

export const metadata: Metadata = {
  title: "Free Cal.com Alternative",
  description:
    "GudCal is an open-source Cal.com alternative with native AI agent support via MCP, simpler setup, and a modern Next.js 16 stack. Compare features side by side.",
};

export default function CalComAlternativePage() {
  return (
    <AlternativePage
      competitorName="Cal.com"
      headline="A Modern, AI-First Cal.com Alternative"
      subtitle="Cal.com is an excellent open-source scheduling platform. GudCal takes a different approach — lighter, AI-native, and built on the latest web technologies."
      strengths={[
        "Open source with a large and active community of contributors and users",
        "Feature-rich platform with workflows, routing, and advanced team scheduling",
        "Self-hostable with Docker and comprehensive deployment documentation",
        "Extensive app marketplace with dozens of third-party integrations",
        "Mature codebase with years of development and production usage",
        "Strong enterprise offering with dedicated support and custom deployment options",
      ]}
      limitations={[
        "Complex setup and heavy resource requirements — the monorepo can be challenging to self-host",
        "No native MCP server — AI agents cannot interact with scheduling through a standardized protocol",
        "Turborepo monorepo structure adds complexity for developers who want to contribute or customize",
        "Cloud pricing can scale up quickly with per-seat team plans",
        "Steeper learning curve due to the breadth of features and configuration options",
        "Slower to adopt cutting-edge frameworks — still on older Next.js versions",
      ]}
      whyGudcal={[
        {
          title: "AI Agent Native",
          description:
            "Built-in MCP server is a first-class feature. AI agents can schedule meetings without custom integration code.",
        },
        {
          title: "Simpler Architecture",
          description:
            "Single Next.js app — no monorepo complexity. Clone, configure, and deploy in minutes.",
        },
        {
          title: "Latest Tech Stack",
          description:
            "Next.js 16, React 19, Prisma 7, Tailwind 4. The newest, fastest versions of everything.",
        },
        {
          title: "Lightweight & Fast",
          description:
            "Lower resource requirements for self-hosting. Runs great on a 2GB VPS.",
        },
        {
          title: "Clean Codebase",
          description:
            "TypeScript throughout, well-organized app router structure, easy to understand and extend.",
        },
        {
          title: "Free & Open",
          description:
            "GPL-3.0 license. Core scheduling features free forever. No feature gating on the API.",
        },
      ]}
      comparison={[
        { feature: "Open source", competitor: true, gudcal: true },
        { feature: "Self-hostable", competitor: true, gudcal: true },
        { feature: "MCP / AI agent support", competitor: false, gudcal: true },
        { feature: "REST API", competitor: true, gudcal: true },
        { feature: "Webhooks", competitor: true, gudcal: true },
        { feature: "Team scheduling", competitor: true, gudcal: true },
        { feature: "Calendar sync", competitor: true, gudcal: true },
        { feature: "Simple self-hosting", competitor: "Complex", gudcal: "Simple" },
        { feature: "App router (Next.js 16)", competitor: false, gudcal: true },
        { feature: "Workflow automations", competitor: true, gudcal: "Webhooks" },
        { feature: "App marketplace", competitor: "Large", gudcal: "Growing" },
        { feature: "Minimum server resources", competitor: "4GB+ RAM", gudcal: "2GB RAM" },
      ]}
    />
  );
}
