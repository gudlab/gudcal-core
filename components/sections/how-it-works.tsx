import { Icons } from "@/components/shared/icons";

const steps = [
  {
    step: "1",
    icon: Icons.calendar,
    title: "Set your availability",
    description:
      "Define your working hours, buffer times, and date overrides. GudCal handles timezone conversions automatically.",
  },
  {
    step: "2",
    icon: Icons.link,
    title: "Share your link",
    description:
      "Send your personal booking page to clients, embed it on your site, or let AI agents discover it via MCP.",
  },
  {
    step: "3",
    icon: Icons.check,
    title: "Get booked",
    description:
      "Guests pick a time that works, get confirmation emails, and the event syncs to your calendar instantly.",
  },
];

export default function HowItWorks() {
  return (
    <section className="container space-y-8 py-12 lg:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-satoshi text-3xl font-black tracking-tight sm:text-4xl">
          Up and running in minutes
        </h2>
        <p className="mt-3 text-balance text-muted-foreground sm:text-lg">
          No complicated setup. Just connect, configure, and start accepting
          bookings.
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
        {steps.map((item) => (
          <div key={item.step} className="text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {item.step}
            </div>
            <h3 className="mt-4 font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
