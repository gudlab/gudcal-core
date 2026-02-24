export { auth as proxy } from "auth"

// Read more: https://nextjs.org/docs/app/building-your-application/routing/proxy#matcher
// Use [^?#]* instead of .* to avoid ReDoS (RangeError: Maximum call stack size exceeded at RegExp.exec)
export const config = {
  matcher: [
    "/((?!api|_next|favicon\\.ico|booking)[^?#]*)",
  ],
}
