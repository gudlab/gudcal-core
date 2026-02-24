"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createOrganization } from "@/actions/organizations";
import {
  createOrganizationSchema,
  type CreateOrganizationFormData,
} from "@/lib/validations/organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

export function CreateOrgForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: "", slug: "" },
  });

  // Auto-generate slug from name
  const name = form.watch("name");
  useEffect(() => {
    if (name) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 50);
      form.setValue("slug", slug);
    }
  }, [name, form]);

  const onSubmit = (data: CreateOrganizationFormData) => {
    startTransition(async () => {
      const result = await createOrganization(data);
      if (result.status === "success") {
        toast.success("Organization created!");
        router.push(`/org/${result.orgSlug}`);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="My Team"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">gudcal.com/org/</span>
              <Input
                id="slug"
                placeholder="my-team"
                {...form.register("slug")}
              />
            </div>
            {form.formState.errors.slug && (
              <p className="text-sm text-destructive">
                {form.formState.errors.slug.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Icons.spinner className="mr-2 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Organization"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
