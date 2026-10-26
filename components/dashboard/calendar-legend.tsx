export function CalendarLegend() {
  const items = [
    { label: "Confirmed", className: "bg-emerald-600" },
    { label: "Pending", className: "bg-amber-500" },
    {
      label: "Time off",
      className:
        "bg-neutral-400 [background-image:repeating-linear-gradient(-45deg,transparent,transparent_3px,rgba(0,0,0,0.18)_3px,rgba(0,0,0,0.18)_6px)]",
    },
    { label: "Working hours", className: "bg-emerald-100 dark:bg-emerald-950" },
    { label: "Outside hours", className: "bg-muted" },
  ];

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={`size-3 rounded-sm border border-border/60 ${item.className}`}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
