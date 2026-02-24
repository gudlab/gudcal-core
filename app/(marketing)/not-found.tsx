import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 sm:py-32">
      {/* Floating calendar icon */}
      <div className="animate-float relative mb-8">
        <div className="relative size-32 rounded-2xl border-2 border-border bg-card shadow-lg sm:size-40">
          {/* Calendar header bar */}
          <div className="flex h-8 items-center justify-between rounded-t-[14px] bg-gradient-to-r from-emerald-500 via-green-400 to-teal-400 px-3 sm:h-10 sm:px-4">
            <div className="flex gap-1.5">
              <div className="size-2 rounded-full bg-white/50" />
              <div className="size-2 rounded-full bg-white/50" />
            </div>
            <div className="h-1.5 w-10 rounded-full bg-white/40 sm:w-14" />
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-3 gap-1.5 p-3 sm:gap-2 sm:p-4">
            <div className="h-4 rounded bg-muted sm:h-5" />
            <div className="h-4 rounded bg-muted sm:h-5" />
            <div className="h-4 rounded bg-muted sm:h-5" />
            <div className="h-4 rounded bg-muted sm:h-5" />
            <div className="relative h-4 rounded border-2 border-dashed border-muted-foreground/30 sm:h-5" />
            <div className="h-4 rounded bg-muted sm:h-5" />
            <div className="h-4 rounded bg-muted sm:h-5" />
            <div className="h-4 rounded bg-muted sm:h-5" />
            <div className="h-4 rounded bg-muted sm:h-5" />
          </div>
          {/* Question mark badge */}
          <div className="absolute -bottom-3 -right-3 flex size-10 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-lg font-bold text-white shadow-md sm:-bottom-4 sm:-right-4 sm:size-12 sm:text-xl">
            ?
          </div>
        </div>
      </div>

      {/* 404 heading */}
      <h1 className="font-satoshi text-7xl font-bold tracking-tight sm:text-8xl">
        <span className="bg-gradient-to-r from-emerald-500 via-green-400 to-teal-400 bg-clip-text text-transparent">
          4
        </span>
        <span className="text-foreground">0</span>
        <span className="bg-gradient-to-r from-emerald-500 via-green-400 to-teal-400 bg-clip-text text-transparent">
          4
        </span>
      </h1>

      {/* Copy */}
      <h2 className="mt-4 font-satoshi text-xl font-semibold text-foreground sm:text-2xl">
        This page wasn&apos;t on the schedule
      </h2>
      <p className="mt-2 max-w-md text-balance text-center text-sm text-muted-foreground sm:text-base">
        Looks like you&apos;ve wandered into an unbooked time slot.
        Let&apos;s get you back on track.
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 via-green-400 to-teal-400 px-6 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
        >
          Back to Home
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
