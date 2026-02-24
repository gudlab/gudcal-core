import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

interface ComparisonRow {
  feature: string;
  competitor: string | boolean;
  gudcal: string | boolean;
}

interface AlternativePageProps {
  competitorName: string;
  headline: string;
  subtitle: string;
  strengths: string[];
  limitations: string[];
  whyGudcal: { title: string; description: string }[];
  comparison: ComparisonRow[];
}

function CheckOrX({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Icons.check className="mx-auto size-5 text-emerald-500" />
    ) : (
      <Icons.close className="mx-auto size-5 text-muted-foreground/40" />
    );
  }
  return <span className="text-sm">{value}</span>;
}

export default function AlternativePage({
  competitorName,
  headline,
  subtitle,
  strengths,
  limitations,
  whyGudcal,
  comparison,
}: AlternativePageProps) {
  return (
    <div className="container py-12 sm:py-20">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Free {competitorName} Alternative
        </span>
        <h1 className="mt-6 font-satoshi text-4xl font-black sm:text-5xl">
          {headline}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {subtitle}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className={cn(
              buttonVariants({ size: "lg", rounded: "xl" }),
              "gap-2",
            )}
          >
            Get Started Free
            <Icons.arrowRight className="size-4" />
          </Link>
          <Link
            href="/docs/self-hosting"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg", rounded: "xl" }),
              "gap-2",
            )}
          >
            Self-Host GudCal
          </Link>
        </div>
      </div>

      {/* Competitor strengths */}
      <div className="mx-auto mt-20 max-w-4xl">
        <h2 className="text-center text-2xl font-bold">
          What {competitorName} Does Well
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          We respect what {competitorName} has built. Here&apos;s where they shine.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {strengths.map((strength) => (
            <div
              key={strength}
              className="flex items-start gap-3 rounded-lg border p-4"
            >
              <Icons.check className="mt-0.5 size-5 shrink-0 text-emerald-500" />
              <span className="text-sm">{strength}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Where GudCal is better */}
      <div className="mx-auto mt-20 max-w-4xl">
        <h2 className="text-center text-2xl font-bold">
          Where GudCal Goes Further
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          {competitorName} is great, but here&apos;s what you get with GudCal.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {whyGudcal.map((item) => (
            <div key={item.title} className="rounded-xl border p-5">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Limitations */}
      {limitations.length > 0 && (
        <div className="mx-auto mt-20 max-w-3xl">
          <h2 className="text-center text-2xl font-bold">
            Common {competitorName} Limitations
          </h2>
          <ul className="mt-6 space-y-3">
            {limitations.map((limitation) => (
              <li
                key={limitation}
                className="flex items-start gap-3 text-sm text-muted-foreground"
              >
                <Icons.close className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                {limitation}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Comparison table */}
      <div className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-2xl font-bold">
          Feature Comparison
        </h2>
        <div className="mt-8 overflow-x-auto rounded-xl border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-4 text-sm font-medium">Feature</th>
                <th className="p-4 text-center text-sm font-medium">
                  {competitorName}
                </th>
                <th className="p-4 text-center text-sm font-medium text-emerald-600">
                  GudCal
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.feature} className="border-b last:border-0">
                  <td className="p-4 text-sm">{row.feature}</td>
                  <td className="p-4 text-center">
                    <CheckOrX value={row.competitor} />
                  </td>
                  <td className="p-4 text-center">
                    <CheckOrX value={row.gudcal} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto mt-20 max-w-2xl rounded-2xl border bg-gradient-to-r from-emerald-500/5 via-green-500/5 to-teal-500/5 p-8 text-center sm:p-12">
        <h2 className="text-2xl font-bold">
          Ready to Try GudCal?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Free to use, open source, and self-hostable. No credit card required.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className={cn(
              buttonVariants({ size: "lg", rounded: "xl" }),
              "gap-2",
            )}
          >
            Start Scheduling Free
            <Icons.arrowRight className="size-4" />
          </Link>
          <Link
            href="https://github.com/gudlab/gudcal-core"
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg", rounded: "xl" }),
              "gap-2",
            )}
          >
            <Icons.gitHub className="size-4" />
            View Source
          </Link>
        </div>
      </div>
    </div>
  );
}
