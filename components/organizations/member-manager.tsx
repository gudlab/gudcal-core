"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { OrgRole } from "@/app/generated/prisma/client";

import { inviteMember, removeMember, updateMemberRole } from "@/actions/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/shared/icons";

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: OrgRole;
  image: string | null;
}

interface MemberManagerProps {
  orgId: string;
  members: Member[];
  currentUserId: string;
  currentUserRole: OrgRole;
}

export function MemberManager({
  orgId,
  members,
  currentUserId,
  currentUserRole,
}: MemberManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

  const handleInvite = () => {
    if (!email) return;
    startTransition(async () => {
      const result = await inviteMember(orgId, email, role);
      if (result.status === "success") {
        toast.success("Member added");
        setEmail("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleRemove = (memberUserId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from the organization?`)) return;
    startTransition(async () => {
      const result = await removeMember(orgId, memberUserId);
      if (result.status === "success") {
        toast.success("Member removed");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleRoleChange = (memberUserId: string, newRole: "ADMIN" | "MEMBER") => {
    startTransition(async () => {
      const result = await updateMemberRole(orgId, memberUserId, newRole);
      if (result.status === "success") {
        toast.success("Role updated");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <Card>
        <CardHeader>
          <CardTitle>Invite Member</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="email@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Select value={role} onValueChange={(v) => setRole(v as "ADMIN" | "MEMBER")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={isPending || !email}>
              {isPending ? (
                <Icons.spinner className="size-4 animate-spin" />
              ) : (
                "Invite"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Member list */}
      <Card>
        <CardHeader>
          <CardTitle>Current Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {member.name}
                      {member.userId === currentUserId && (
                        <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {member.role === "OWNER" ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      Owner
                    </span>
                  ) : currentUserRole === "OWNER" && member.userId !== currentUserId ? (
                    <Select
                      value={member.role}
                      onValueChange={(v) =>
                        handleRoleChange(member.userId, v as "ADMIN" | "MEMBER")
                      }
                    >
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MEMBER">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                      {member.role.toLowerCase()}
                    </span>
                  )}

                  {member.role !== "OWNER" &&
                    member.userId !== currentUserId &&
                    (currentUserRole === "OWNER" ||
                      (currentUserRole === "ADMIN" && member.role === "MEMBER")) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(member.userId, member.name)}
                        disabled={isPending}
                      >
                        Remove
                      </Button>
                    )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
