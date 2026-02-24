"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/shared/icons";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Something went wrong");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="container flex flex-col items-center justify-center py-12 sm:py-20">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gudcal-logo.png" alt="GudCal" className="mx-auto size-10" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Invalid reset link
          </h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is invalid or has expired.
          </p>
          <Link
            href="/forgot-password"
            className={cn(buttonVariants())}
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container flex flex-col items-center justify-center py-12 sm:py-20">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gudcal-logo.png" alt="GudCal" className="mx-auto size-10" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Reset your password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your new password below.
          </p>
        </div>

        {success ? (
          <div className="rounded-lg border bg-muted/50 p-6 text-center">
            <Icons.check className="mx-auto mb-3 size-8 text-emerald-500" />
            <p className="text-sm font-medium">Password reset successful</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your password has been updated. You can now sign in.
            </p>
            <Link
              href="/login"
              className={cn(buttonVariants(), "mt-4")}
            >
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                placeholder="Min 8 characters"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                placeholder="Confirm your password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              Reset Password
            </button>
          </form>
        )}

        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
