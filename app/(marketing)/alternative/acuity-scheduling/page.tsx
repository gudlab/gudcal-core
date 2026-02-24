import { Metadata } from "next";

import AlternativePage from "@/components/sections/alternative-page";

export const metadata: Metadata = {
  title: "Free Acuity Scheduling Alternative",
  description:
    "GudCal is a free, open-source alternative to Acuity Scheduling with AI agent integration, self-hosting, and developer-first design. No monthly fees.",
};

export default function AcuityAlternativePage() {
  return (
    <AlternativePage
      competitorName="Acuity Scheduling"
      headline="The Free, Open-Source Acuity Scheduling Alternative"
      subtitle="Acuity Scheduling (by Squarespace) is a reliable appointment tool built for service businesses. GudCal offers the same core features with open source, AI agents, and zero monthly costs."
      strengths={[
        "Excellent appointment scheduling with intake forms, packages, and gift certificates",
        "Deep Squarespace integration for website owners already on the platform",
        "Built-in payment processing with Stripe and Square support",
        "Client self-scheduling with automatic timezone detection and reminders",
        "HIPAA compliance option for healthcare providers on higher tiers",
        "Customizable booking pages with branding and custom CSS support",
      ]}
      limitations={[
        "No free tier — plans start at $20/month (billed annually) after the trial expires",
        "Owned by Squarespace — tightly coupled to their ecosystem",
        "No self-hosting option — all data stored on Squarespace servers",
        "No AI agent or MCP integration — designed purely for human-driven scheduling",
        "Closed source — no ability to audit, customize, or extend the platform",
        "Limited API compared to developer-focused scheduling tools",
        "No team scheduling features like round-robin or collective availability",
      ]}
      whyGudcal={[
        {
          title: "Completely Free",
          description:
            "No 7-day trial, no credit card required. 3 event types, unlimited bookings, and calendar sync at no cost.",
        },
        {
          title: "AI Agent Ready",
          description:
            "Built-in MCP server lets AI agents discover your availability and book meetings autonomously.",
        },
        {
          title: "Open Source (GPL-3.0)",
          description:
            "Full source code on GitHub. Audit it, modify it, self-host it. You own your scheduling infrastructure.",
        },
        {
          title: "Self-Hostable",
          description:
            "Deploy on your own servers with Docker. Full control over your data — perfect for compliance requirements.",
        },
        {
          title: "Team Scheduling",
          description:
            "Round-robin, collective scheduling, and organizations built in. Not locked behind enterprise tiers.",
        },
        {
          title: "Developer-First",
          description:
            "REST API, webhooks, and TypeScript SDK. Build custom workflows and integrations with ease.",
        },
      ]}
      comparison={[
        { feature: "Free tier", competitor: "7-day trial", gudcal: "Free forever" },
        { feature: "Starting price", competitor: "$20/month", gudcal: "$0" },
        { feature: "Unlimited bookings", competitor: true, gudcal: true },
        { feature: "Calendar sync", competitor: true, gudcal: true },
        { feature: "Payment processing", competitor: true, gudcal: true },
        { feature: "Custom booking pages", competitor: true, gudcal: true },
        { feature: "Open source", competitor: false, gudcal: true },
        { feature: "Self-hostable", competitor: false, gudcal: true },
        { feature: "MCP / AI agent support", competitor: false, gudcal: true },
        { feature: "REST API", competitor: "Basic", gudcal: "Full" },
        { feature: "Team scheduling", competitor: false, gudcal: true },
        { feature: "Webhooks", competitor: "Limited", gudcal: true },
        { feature: "HIPAA compliance", competitor: "Paid", gudcal: "Self-host" },
      ]}
    />
  );
}
