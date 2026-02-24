import { withContentlayer } from "next-contentlayer2";

await import("./env.mjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
    ],
  },
  serverExternalPackages: ["@prisma/client", "@prisma/client-runtime-utils"],

  // Include font files in serverless function bundles (Vercel)
  // so the OG image route can read them via fs.readFile
  outputFileTracingIncludes: {
    "/api/og": ["./assets/fonts/**/*"],
  },
};

export default withContentlayer(nextConfig);
