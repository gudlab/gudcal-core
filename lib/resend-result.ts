export type ResendErrorLike = {
  name?: string;
  message?: string;
} | null;

export function recipientDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return "unknown";
  return email.slice(at + 1).toLowerCase();
}

function normalizeResendError(
  error: ResendErrorLike | string | undefined,
): { name: string; message: string } | null {
  if (!error) return null;
  if (typeof error === "string") {
    return { name: "ResendError", message: error };
  }
  return {
    name: error.name ?? "ResendError",
    message: error.message ?? "unknown",
  };
}

/**
 * Resend's SDK resolves `{ error }` instead of throwing. Log name/message and
 * the recipient domain only (never the mailbox).
 */
export function handleResendSendResult(
  result: { error?: ResendErrorLike | string } | null | undefined,
  recipient: string,
  options: { throwOnError?: boolean } = {},
): void {
  const error = normalizeResendError(result?.error);
  if (!error) return;
  console.error("Resend send failed", {
    name: error.name,
    message: error.message,
    domain: recipientDomain(recipient),
  });
  if (options.throwOnError) {
    throw new Error(error.message);
  }
}
