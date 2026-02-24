import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";

import { UserAuthForm } from "@/components/forms/user-auth-form";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your account",
};

export default function LoginPage() {
  return (
    <div className="container flex flex-col items-center justify-center py-12 sm:py-20">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gudcal-logo.png" alt="GudCal" className="mx-auto size-10" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>
        <Suspense>
          <UserAuthForm />
        </Suspense>
        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link
            href="/register"
            className="hover:text-brand underline underline-offset-4"
          >
            Don&apos;t have an account? Sign Up
          </Link>
        </p>
        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link
            href="/forgot-password"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}
