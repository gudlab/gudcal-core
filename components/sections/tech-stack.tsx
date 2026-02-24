import { Icons } from "@/components/shared/icons";

const techItems = [
  {
    title: "Next.js 16",
    description: "App Router, Server Components, and the latest React 19 features.",
  },
  {
    title: "PostgreSQL",
    description: "Rock-solid database with Prisma ORM for type-safe queries.",
  },
  {
    title: "Auth.js v5",
    description: "Email/password, Google OAuth, and magic links out of the box.",
  },
  {
    title: "Tailwind CSS 4",
    description: "Modern styling with shadcn/ui components and dark mode support.",
  },
  {
    title: "MCP Protocol",
    description: "Built-in Model Context Protocol server for AI agent integration.",
  },
  {
    title: "Docker Ready",
    description: "Self-host with Docker Compose or deploy to Vercel in minutes.",
  },
];

export default function TechStack() {
  return (
    <section className="container py-12 lg:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl border bg-card p-8 shadow-sm sm:p-12">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-medium">
              <Icons.settings className="mr-1.5 size-3.5 text-primary" />
              Built with modern tools
            </div>
            <h2 className="font-satoshi text-3xl font-black tracking-tight sm:text-4xl">
              Developer-first stack
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-balance text-muted-foreground sm:text-lg">
              GudCal is built with the tools you already know and love.
              Fork it, extend it, or self-host it — it&apos;s all open source.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {techItems.map((item) => (
              <div key={item.title} className="space-y-1.5">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
