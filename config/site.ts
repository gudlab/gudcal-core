import { SidebarNavItem, SiteConfig } from "types";
import { env } from "@/env.mjs";

const site_url = env.NEXT_PUBLIC_APP_URL;

export const siteConfig: SiteConfig = {
  name: "GudCal",
  description:
    "Open-source scheduling infrastructure for the AI agent era. Self-hostable Calendly alternative with MCP server, team scheduling, and smart availability.",
  url: site_url,
  ogImage: `${site_url}/_static/og.jpg`,
  links: {
    twitter: "https://x.com/timchosen",
    github: "https://github.com/gudlab/gudcal-core",
  },
  mailSupport: "support@gudcal.com",
};

export const footerLinks: SidebarNavItem[] = [
  {
    title: "Product",
    items: [
      { title: "Features", href: "/features" },
      { title: "Integrations", href: "/integrations" },
      { title: "Self-Hosting", href: "/docs/self-hosting" },
    ],
  },
  {
    title: "Alternatives",
    items: [
      { title: "Calendly Alternative", href: "/alternative/calendly" },
      { title: "Cal.com Alternative", href: "/alternative/cal-com" },
      { title: "Acuity Alternative", href: "/alternative/acuity-scheduling" },
    ],
  },
  {
    title: "Developers",
    items: [
      { title: "Documentation", href: "/docs" },
      { title: "API Reference", href: "/docs/api" },
      { title: "MCP Server", href: "/docs/mcp" },
      { title: "GitHub", href: "https://github.com/gudlab/gudcal-core" },
    ],
  },
  {
    title: "Company",
    items: [
      { title: "About", href: "/about" },
      { title: "Blog", href: "/blog" },
      { title: "Terms", href: "/terms" },
      { title: "Privacy", href: "/privacy" },
    ],
  },
];
