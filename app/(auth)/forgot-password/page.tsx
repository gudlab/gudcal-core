"use client";

import { useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/shared/icons";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || "Something went wrong");
        setIsLoading(false);
        return;
      }

      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container flex flex-col items-center justify-center py-12 sm:py-20">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gudcal-logo.png" alt="GudCal" className="mx-auto size-10" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Forgot your password?
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg border bg-muted/50 p-6 text-center">
            <Icons.check className="mx-auto mb-3 size-8 text-emerald-500" />
            <p className="text-sm font-medium">Check your email</p>
            <p className="mt-1 text-sm text-muted-foreground">
              If an account exists for {email}, you&apos;ll receive a password
              reset link shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="name@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <button
              className={cn(buttonVariants())}
              disabled={isLoading}
            >
              {isLoading && (
                <Icons.spinner className="mr-2 size-4 animate-spin" />
              )}
              Send Reset Link
            </button>
          </form>
        )}

        <p className="px-8 text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link
            href="/login"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
