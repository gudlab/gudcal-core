"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

import { createApiKey, deleteApiKey } from "@/actions/api-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

interface ApiKeyData {
  id: string;
  name: string;
  key: string;
  lastUsed: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

interface ApiKeyManagerProps {
  initialKeys: ApiKeyData[];
}

export function ApiKeyManager({ initialKeys }: ApiKeyManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    if (!keyName.trim()) return;
    startTransition(async () => {
      const result = await createApiKey(keyName.trim());
      if (result.status === "success" && result.key) {
        setNewKey(result.key);
        setKeyName("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleDelete = (keyId: string, name: string) => {
    if (!confirm(`Delete API key "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteApiKey(keyId);
      if (result.status === "success") {
        toast.success("API key deleted");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mcpUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/mcp`;

  return (
    <div className="space-y-6 py-6">
      {/* New key reveal */}
      {newKey && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <CardContent className="p-4">
            <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-200">
              API key created! Copy it now &mdash; it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-white p-2 font-mono text-xs dark:bg-black">
                {newKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(newKey)}
              >
                {copied ? (
                  <Icons.check className="size-4" />
                ) : (
                  <Icons.copy className="size-4" />
                )}
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() => setNewKey(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create new key */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Use API keys to authenticate with the GudCal MCP server and API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Key name (e.g., My Agent)"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={isPending || !keyName.trim()}
            >
              {isPending ? (
                <Icons.spinner className="mr-2 size-4 animate-spin" />
              ) : null}
              Create Key
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing keys */}
      {initialKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Existing Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {initialKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{key.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {key.key}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created{" "}
                      {format(new Date(key.createdAt), "MMM d, yyyy")}
                      {key.lastUsed && (
                        <>
                          {" "}
                          &middot; Last used{" "}
                          {format(new Date(key.lastUsed), "MMM d, yyyy")}
                        </>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(key.id, key.name)}
                    disabled={isPending}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MCP Server info */}
      <Card>
        <CardHeader>
          <CardTitle>MCP Server</CardTitle>
          <CardDescription>
            Connect AI agents to your GudCal scheduling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Server URL</Label>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded bg-muted p-2 font-mono text-xs">
                {mcpUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(mcpUrl)}
              >
                <Icons.copy className="size-4" />
              </Button>
            </div>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="mb-1 text-xs font-medium">Available Tools</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                <code>list_event_types</code> &mdash; List a user&apos;s event
                types
              </li>
              <li>
                <code>get_availability</code> &mdash; Check available time slots
              </li>
              <li>
                <code>create_booking</code> &mdash; Book a time slot
              </li>
              <li>
                <code>cancel_booking</code> &mdash; Cancel a booking
              </li>
              <li>
                <code>get_bookings</code> &mdash; List your bookings (requires
                API key)
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
