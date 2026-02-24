import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export default async function OnboardingLayout({
  children,
}: OnboardingLayoutProps) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  // If user already has a username, they've completed onboarding
  if (user.username) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-lg px-4">
        {children}
      </div>
    </div>
  );
}
