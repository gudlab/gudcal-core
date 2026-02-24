import "@/styles/globals.css";
import { ThemeProvider } from "next-themes";
import Link from "next/link";

interface BookingLayoutProps {
  children: React.ReactNode;
}

export default function BookingLayout({ children }: BookingLayoutProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <main className="flex w-full flex-1 flex-col items-center justify-center px-4 py-8">
          {children}
        </main>
        <footer className="w-full border-t py-4 text-center">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Powered by GudCal
          </Link>
        </footer>
      </div>
    </ThemeProvider>
  );
}
