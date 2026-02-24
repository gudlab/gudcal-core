"use client";

import { useTransition } from "react";
import { UserRole } from "@/app/generated/prisma/client";
import { updateUserRole } from "@/actions/update-user-role";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminRoleToggleProps {
  userId: string;
  currentRole: UserRole;
}

export function AdminRoleToggle({ userId, currentRole }: AdminRoleToggleProps) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (newRole: string) => {
    if (newRole === currentRole) return;
    startTransition(async () => {
      const result = await updateUserRole(userId, {
        role: newRole as UserRole,
      });
      if (result.status === "success") {
        toast.success(`Role updated to ${newRole}`);
      } else {
        toast.error("Failed to update role");
      }
    });
  };

  return (
    <Select
      defaultValue={currentRole}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-[100px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USER">USER</SelectItem>
        <SelectItem value="ADMIN">ADMIN</SelectItem>
      </SelectContent>
    </Select>
  );
}
