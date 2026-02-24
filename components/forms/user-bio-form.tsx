"use client";

import { useState, useTransition } from "react";
import { updateBio, type BioFormData } from "@/actions/update-bio";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { userBioSchema } from "@/lib/validations/user";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionColumns } from "@/components/dashboard/section-columns";
import { Icons } from "@/components/shared/icons";

interface UserBioFormProps {
  user: { id: string; bio: string };
}

export function UserBioForm({ user }: UserBioFormProps) {
  const [updated, setUpdated] = useState(false);
  const [isPending, startTransition] = useTransition();
  const updateBioWithId = updateBio.bind(null, user.id);

  const {
    handleSubmit,
    register,
    watch,
    formState: { errors },
  } = useForm<BioFormData>({
    resolver: zodResolver(userBioSchema),
    defaultValues: {
      bio: user.bio,
    },
  });

  const currentBio = watch("bio");
  const charCount = currentBio?.length ?? 0;

  const checkUpdate = (value: string) => {
    setUpdated(value !== user.bio);
  };

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const { status } = await updateBioWithId(data);

      if (status !== "success") {
        toast.error("Something went wrong.", {
          description: "Your bio was not updated. Please try again.",
        });
      } else {
        setUpdated(false);
        toast.success("Your bio has been updated.");
      }
    });
  });

  return (
    <form onSubmit={onSubmit}>
      <SectionColumns
        title="Bio"
        description="A short description shown on your public booking page."
      >
        <div className="space-y-2">
          <Label className="sr-only" htmlFor="bio">
            Bio
          </Label>
          <Textarea
            id="bio"
            className="min-h-[100px] resize-none"
            maxLength={500}
            placeholder="Tell people a bit about yourself..."
            {...register("bio")}
            onChange={(e) => {
              register("bio").onChange(e);
              checkUpdate(e.target.value);
            }}
          />
          <div className="flex items-center justify-between">
            <div>
              {errors?.bio && (
                <p className="text-[13px] text-red-600">
                  {errors.bio.message}
                </p>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground">
              {charCount}/500
            </p>
          </div>
          <Button
            type="submit"
            variant={updated ? "default" : "disable"}
            disabled={isPending || !updated}
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
      </SectionColumns>
    </form>
  );
}
