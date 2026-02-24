"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { completeOnboarding } from "@/actions/onboarding";
import type { OnboardingFormData } from "@/lib/validations/onboarding";
import { UsernameStep } from "@/components/onboarding/username-step";
import { TimezoneStep } from "@/components/onboarding/timezone-step";
import { AvailabilityStep } from "@/components/onboarding/availability-step";

const DEFAULT_SCHEDULE = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<OnboardingFormData>({
    username: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
    schedule: DEFAULT_SCHEDULE,
  });

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 3));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const result = await completeOnboarding(formData);
      if (result.status === "success") {
        toast.success("Welcome to GudCal!");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(result.message || "Something went wrong");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Welcome to GudCal</h1>
        <p className="text-muted-foreground">
          Let&apos;s set up your scheduling in 3 quick steps
        </p>
        <div className="flex items-center justify-center gap-2 pt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Step {step} of 3
        </p>
      </div>

      {/* Step content */}
      {step === 1 && (
        <UsernameStep
          value={formData.username}
          onChange={(username) =>
            setFormData((prev) => ({ ...prev, username }))
          }
          onNext={handleNext}
        />
      )}

      {step === 2 && (
        <TimezoneStep
          value={formData.timezone}
          onChange={(timezone) =>
            setFormData((prev) => ({ ...prev, timezone }))
          }
          onNext={handleNext}
          onBack={handleBack}
        />
      )}

      {step === 3 && (
        <AvailabilityStep
          value={formData.schedule}
          onChange={(schedule) =>
            setFormData((prev) => ({ ...prev, schedule }))
          }
          onComplete={handleComplete}
          onBack={handleBack}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
