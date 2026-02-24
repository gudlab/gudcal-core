"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  updateUsername,
  type UsernameFormData,
} from "@/actions/update-username";
import { checkUsernameAvailability } from "@/actions/onboarding";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "@/app/generated/prisma/client";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { userUsernameSchema } from "@/lib/validations/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionColumns } from "@/components/dashboard/section-columns";
import { Icons } from "@/components/shared/icons";

interface UserUsernameFormProps {
  user: Pick<User, "id"> & { username: string };
}

export function UserUsernameForm({ user }: UserUsernameFormProps) {
  const { update } = useSession();
  const [updated, setUpdated] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const updateUsernameWithId = updateUsername.bind(null, user.id);

  const {
    handleSubmit,
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UsernameFormData>({
    resolver: zodResolver(userUsernameSchema),
    defaultValues: {
      username: user.username || "",
    },
  });

  const currentUsername = watch("username");

  // Debounced availability check
  const checkAvailability = useCallback(
    async (username: string) => {
      if (username === user.username) {
        setIsAvailable(null);
        return;
      }
      if (username.length < 3) {
        setIsAvailable(null);
        return;
      }
      setChecking(true);
      try {
        const result = await checkUsernameAvailability(username);
        setIsAvailable(result.available);
      } catch {
        setIsAvailable(null);
      } finally {
        setChecking(false);
      }
    },
    [user.username],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentUsername && currentUsername !== user.username) {
        checkAvailability(currentUsername);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [currentUsername, checkAvailability, user.username]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const lowered = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setValue("username", lowered, { shouldValidate: true });
    setUpdated(lowered !== user.username);
    setIsAvailable(null);
  };

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await updateUsernameWithId(data);

      if (result.status !== "success") {
        toast.error(result.message || "Something went wrong.", {
          description: "Your username was not updated. Please try again.",
        });
      } else {
        await update();
        setUpdated(false);
        setIsAvailable(null);
        toast.success("Your username has been updated.");
      }
    });
  });

  return (
    <form onSubmit={onSubmit}>
      <SectionColumns
        title="Your Username"
        description="This is your unique booking URL. Changing it will break any previously shared links."
      >
        <div className="flex w-full items-center gap-2">
          <Label className="sr-only" htmlFor="username">
            Username
          </Label>
          <Input
            id="username"
            className="flex-1"
            maxLength={30}
            {...register("username")}
            onChange={handleChange}
          />
          <Button
            type="submit"
            variant={updated && isAvailable !== false ? "default" : "disable"}
            disabled={isPending || !updated || isAvailable === false}
            className="w-[67px] shrink-0 px-0 sm:w-[130px]"
          >
            {isPending ? (
              <Icons.spinner className="size-4 animate-spin" />
            ) : (
              <p>
                Save
                <span className="hidden sm:inline-flex">&nbsp;Changes</span>
              </p>
            )}
          </Button>
        </div>
        <div className="flex flex-col justify-between gap-1 p-1">
          {errors?.username && (
            <p className="pb-0.5 text-[13px] text-red-600">
              {errors.username.message}
            </p>
          )}
          {checking && (
            <p className="text-[13px] text-muted-foreground">
              Checking availability...
            </p>
          )}
          {!checking && isAvailable === true && (
            <p className="text-[13px] text-green-600">Username is available</p>
          )}
          {!checking && isAvailable === false && (
            <p className="text-[13px] text-red-600">
              Username is already taken
            </p>
          )}
          <p className="text-[13px] text-muted-foreground">
            Your booking page:{" "}
            <span className="font-medium text-foreground">
              gudcal.com/{currentUsername || user.username}
            </span>
          </p>
        </div>
      </SectionColumns>
    </form>
  );
}
