import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

export default function OpenSourceCta() {
  return (
    <section className="container py-12 lg:py-20">
      <div className="mx-auto max-w-3xl rounded-xl border bg-card p-8 text-center shadow-sm sm:p-12">
        <h2 className="font-satoshi text-3xl font-black tracking-tight sm:text-4xl">
          Open source. Self-hostable. Yours.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground sm:text-lg">
          GudCal is GPL-3.0 licensed and designed to be self-hosted. Run it on
          your own infrastructure or use our managed cloud — you choose.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/register"
            className={cn(
              buttonVariants({ rounded: "xl", size: "lg" }),
              "gap-2 px-6",
            )}
          >
            Try Cloud Free
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
              "gap-2 px-6",
            )}
          >
            <Icons.gitHub className="size-4" />
            Self-Host Guide
          </Link>
        </div>
      </div>
    </section>
  );
}
