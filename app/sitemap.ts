import { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;

  const staticPages = [
    "",
    "/features",
    "/integrations",
    "/about",
    "/blog",
    "/docs",
    "/docs/installation",
    "/docs/api",
    "/docs/mcp",
    "/docs/self-hosting",
    "/login",
    "/register",
    "/terms",
    "/privacy",
    "/alternative/calendly",
    "/alternative/cal-com",
    "/alternative/acuity-scheduling",
  ];

  return staticPages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/alternative") ? 0.8 : 0.7,
  }));
}
