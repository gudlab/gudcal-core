import { Metadata } from "next";

import AlternativePage from "@/components/sections/alternative-page";

export const metadata: Metadata = {
  title: "Free Calendly Alternative",
  description:
    "GudCal is a free, open-source Calendly alternative with AI agent integration via MCP, self-hosting, and no per-seat pricing. Switch from Calendly today.",
};

export default function CalendlyAlternativePage() {
  return (
    <AlternativePage
      competitorName="Calendly"
      headline="The Free, Open-Source Calendly Alternative"
      subtitle="Calendly pioneered online scheduling and does it brilliantly. GudCal brings the same power with open source, AI agent support, and zero per-seat costs."
      strengths={[
        "Polished, intuitive booking experience trusted by millions of users worldwide",
        "Extensive native integrations with Salesforce, HubSpot, Zoom, and hundreds more",
        "Enterprise-grade features like SSO, SCIM, advanced admin controls, and compliance certifications",
        "Sophisticated routing forms for lead qualification and round-robin distribution",
        "Reliable infrastructure with excellent uptime and global CDN",
        "Beautiful embeddable widgets that work on any website",
      ]}
      limitations={[
        "Per-seat pricing gets expensive for growing teams — Professional plan starts at $12/seat/month",
        "Free tier limited to one event type, making it impractical for most users",
        "No self-hosting option — your data lives on Calendly's servers",
        "No native AI agent or MCP integration — custom API work needed for every AI workflow",
        "Closed source — you cannot audit the code or customize the platform",
        "API rate limits and access restricted on lower tiers",
      ]}
      whyGudcal={[
        {
          title: "Truly Free",
          description:
            "3 event types, unlimited bookings, and calendar sync on the free tier. No per-seat charges.",
        },
        {
          title: "Open Source (GPL-3.0)",
          description:
            "Full source code on GitHub. Audit it, modify it, contribute to it. No vendor lock-in.",
        },
        {
          title: "AI Agent Ready",
          description:
            "Built-in MCP server lets any AI agent discover availability and book meetings autonomously.",
        },
        {
          title: "Self-Hostable",
          description:
            "Deploy on your own infrastructure. Your data never leaves your servers.",
        },
        {
          title: "Developer-First API",
          description:
            "Every feature works through the REST API. Webhooks for every booking event.",
        },
        {
          title: "Modern Stack",
          description:
            "Built with Next.js 16, React 19, PostgreSQL, and Tailwind CSS. Clean, extensible codebase.",
        },
      ]}
      comparison={[
        { feature: "Free event types", competitor: "1", gudcal: "3" },
        { feature: "Unlimited bookings", competitor: true, gudcal: true },
        { feature: "Calendar sync", competitor: true, gudcal: true },
        { feature: "Custom booking pages", competitor: true, gudcal: true },
        { feature: "Team scheduling", competitor: "Paid", gudcal: true },
        { feature: "Open source", competitor: false, gudcal: true },
        { feature: "Self-hostable", competitor: false, gudcal: true },
        { feature: "MCP / AI agent support", competitor: false, gudcal: true },
        { feature: "REST API", competitor: "Paid", gudcal: true },
        { feature: "Webhooks", competitor: "Paid", gudcal: true },
        { feature: "Per-seat pricing", competitor: "$12+/seat", gudcal: "Free" },
        { feature: "SSO / SCIM", competitor: "Enterprise", gudcal: "Roadmap" },
      ]}
    />
  );
}
