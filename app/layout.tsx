import type { Metadata } from "next";
import { Poppins, Barlow_Condensed } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "ICHOR — Sweat. Post. Dominate.",
  description:
    "ICHOR is a campus social fitness battleground. Import your runs, post them, get judged, and fight for territory.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#AE93F4",
          colorPrimaryForeground: "#171516",
          colorBackground: "#171516",
          colorText: "#f5f3f6",
          colorInputText: "#f5f3f6",
          colorNeutral: "#2a2527", // ichor-midnight-card (lighter than background)
          borderRadius: "0.75rem",
        },
      }}
    >
      <html lang="en" className={`${poppins.variable} ${barlowCondensed.variable} h-full`}>
        <body className="min-h-full flex flex-col antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
