import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

export default async function HeroLanding() {
  return (
    <section className="space-y-6 py-12 sm:py-20 lg:py-24">
      <div className="container flex max-w-(--breakpoint-md) flex-col items-center gap-5 text-center">
        <Link
          href={siteConfig.links.github}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm", rounded: "xl" }),
            "px-4",
          )}
          target="_blank"
        >
          <Icons.gitHub className="mr-2 size-3.5" />
          Open Source &amp; Self-Hostable
        </Link>

        <h1 className="text-balance font-satoshi text-[40px] font-black leading-[1.15] tracking-tight sm:text-5xl md:text-6xl md:leading-[1.15]">
          Schedule Smarter in the{" "}
          <span className="bg-linear-to-r from-emerald-500 via-green-400 to-teal-400 bg-clip-text text-transparent">
            AI Agent Era
          </span>
        </h1>

        <p className="max-w-2xl text-balance text-muted-foreground sm:text-lg">
          Open-source scheduling infrastructure with MCP server, team
          scheduling, and smart availability. Self-host or use our cloud.
        </p>

        <div className="flex justify-center space-x-2">
          <Link
            href="/register"
            prefetch={true}
            className={cn(
              buttonVariants({ rounded: "xl", size: "lg" }),
              "gap-2 px-5 text-[15px]",
            )}
          >
            <span>Get Started Free</span>
            <Icons.arrowRight className="size-4" />
          </Link>
          <Link
            href={siteConfig.links.github}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({
                variant: "outline",
                rounded: "xl",
                size: "lg",
              }),
              "px-4 text-[15px]",
            )}
          >
            <Icons.gitHub className="mr-2 size-4" />
            <p>
              <span className="hidden sm:inline-block">Star on</span> GitHub
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}
