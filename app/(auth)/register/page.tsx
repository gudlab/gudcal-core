import Link from "next/link"
import { Suspense } from "react"

import { UserAuthForm } from "@/components/forms/user-auth-form"

export const metadata = {
  title: "Create an account",
  description: "Create an account to get started.",
}

export default function RegisterPage() {
  return (
    <div className="container flex flex-col items-center justify-center py-12 sm:py-20">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gudcal-logo.png" alt="GudCal" className="mx-auto size-10" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Create an account
          </h1>
          <p className="text-sm text-muted-foreground">
            Fill in your details to get started
          </p>
        </div>
        <Suspense>
          <UserAuthForm type="register" />
        </Suspense>
        <p className="px-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="hover:text-brand underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
        <p className="px-8 text-center text-sm text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Link
            href="/terms"
            className="hover:text-brand underline underline-offset-4"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="hover:text-brand underline underline-offset-4"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
