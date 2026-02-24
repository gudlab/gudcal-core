"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { checkUsernameAvailability } from "@/actions/onboarding";
import { usernameSchema } from "@/lib/validations/onboarding";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/shared/icons";

interface UsernameStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export function UsernameStep({ value, onChange, onNext }: UsernameStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  const checkAvailability = useCallback(
    (username: string) => {
      // First validate the format
      const result = usernameSchema.safeParse(username);
      if (!result.success) {
        setError(result.error.issues[0].message);
        setIsAvailable(null);
        return;
      }

      setError(null);
      startTransition(async () => {
        const { available } = await checkUsernameAvailability(username);
        setIsAvailable(available);
        if (!available) {
          setError("This username is already taken");
        }
      });
    },
    [],
  );

  // Debounced availability check
  useEffect(() => {
    if (!value || value.length < 3) {
      setIsAvailable(null);
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      checkAvailability(value);
    }, 500);

    return () => clearTimeout(timer);
  }, [value, checkAvailability]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAvailable && !error) {
      onNext();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose your username</CardTitle>
        <CardDescription>
          This will be your booking URL:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-medium">
            gudcal.com/{value || "your-name"}
          </code>
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                placeholder="john-doe"
                value={value}
                onChange={(e) =>
                  onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
                className={
                  error
                    ? "border-destructive"
                    : isAvailable
                      ? "border-green-500"
                      : ""
                }
              />
              {isPending && (
                <Icons.spinner className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" />
              )}
              {!isPending && isAvailable && (
                <Icons.check className="absolute right-3 top-2.5 size-4 text-green-500" />
              )}
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {!error && isAvailable && (
              <p className="text-sm text-green-600">Username is available!</p>
            )}
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and hyphens only. 3-30 characters.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={!isAvailable || !!error || isPending}
          >
            Continue
            <Icons.arrowRight className="ml-2 size-4" />
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
