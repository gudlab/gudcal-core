import localFont from "next/font/local";

export const fontSans = localFont({
  src: [
    { path: "./Inter-Regular.ttf", weight: "400", style: "normal" },
    { path: "./Inter-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
});

export const fontHeading = localFont({
  src: "./CalSans-SemiBold.woff2",
  variable: "--font-heading",
});

export const fontSatoshi = localFont({
  src: "./satoshi-variable.woff2",
  variable: "--font-satoshi",
  weight: "300 900",
  display: "swap",
  style: "normal",
});
