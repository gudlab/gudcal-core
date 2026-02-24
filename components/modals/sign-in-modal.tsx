import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogTitle } from "@/components/ui/dialog";
import { Modal } from "@/components/ui/modal";
import { Icons } from "@/components/shared/icons";
import { toast } from "sonner";

function SignInModal({
  showSignInModal,
  setShowSignInModal,
}: {
  showSignInModal: boolean;
  setShowSignInModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const [signInClicked, setSignInClicked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password.");
        setIsLoading(false);
        return;
      }

      setShowSignInModal(false);
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <Modal showModal={showSignInModal} setShowModal={setShowSignInModal}>
      <div className="w-full">
        <div className="flex flex-col items-center justify-center space-y-3 border-b bg-background px-4 py-6 pt-8 text-center md:px-16">
          <a href={siteConfig.url}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/gudcal-logo.png"
              alt={siteConfig.name}
              className="size-10"
            />
          </a>
          <DialogTitle className="font-satoshi text-2xl font-black">
            Sign In
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Sign in to your GudCal account to manage your scheduling.
          </p>
        </div>

        <div className="flex flex-col space-y-4 bg-secondary/50 px-4 py-8 md:px-16">
          <form onSubmit={handleCredentialsLogin} className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="modal-email">Email</Label>
              <Input
                id="modal-email"
                placeholder="name@example.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || signInClicked}
                required
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="modal-password">Password</Label>
              <Input
                id="modal-password"
                placeholder="Your password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || signInClicked}
                required
              />
            </div>
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                onClick={() => setShowSignInModal(false)}
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
            <Button type="submit" disabled={isLoading || signInClicked}>
              {isLoading && (
                <Icons.spinner className="mr-2 size-4 animate-spin" />
              )}
              Sign In
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-secondary/50 px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            disabled={signInClicked || isLoading}
            onClick={async () => {
              setSignInClicked(true);
              try {
                const result = await signIn("google", {
                  redirect: false,
                  callbackUrl: "/dashboard",
                });
                if (result?.url) {
                  window.location.href = result.url;
                } else if (result?.error) {
                  toast.error(result.error);
                  setSignInClicked(false);
                } else {
                  setShowSignInModal(false);
                  router.push("/dashboard");
                  router.refresh();
                  setSignInClicked(false);
                }
              } catch {
                toast.error("Something went wrong. Please try again.");
                setSignInClicked(false);
              }
            }}
          >
            {signInClicked ? (
              <Icons.spinner className="mr-2 size-4 animate-spin" />
            ) : (
              <Icons.google className="mr-2 size-4" />
            )}{" "}
            Sign In with Google
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              onClick={() => setShowSignInModal(false)}
              className="underline underline-offset-4 hover:text-foreground"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </Modal>
  );
}

export function useSignInModal() {
  const [showSignInModal, setShowSignInModal] = useState(false);

  const SignInModalCallback = useCallback(() => {
    return (
      <SignInModal
        showSignInModal={showSignInModal}
        setShowSignInModal={setShowSignInModal}
      />
    );
  }, [showSignInModal, setShowSignInModal]);

  return useMemo(
    () => ({
      setShowSignInModal,
      SignInModal: SignInModalCallback,
    }),
    [setShowSignInModal, SignInModalCallback],
  );
}
