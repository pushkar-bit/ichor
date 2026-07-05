import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "800"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-oswald",
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
        variables: {
          colorPrimary: "#AE93F4",
          colorPrimaryForeground: "#171516",
          colorBackground: "#171516",
          colorForeground: "#f5f3f6",
          colorInput: "#231F20",
          colorInputForeground: "#f5f3f6",
          borderRadius: "0.75rem",
        },
      }}
    >
      <html lang="en" className={`${inter.variable} ${barlowCondensed.variable} h-full`}>
        <body className="min-h-full flex flex-col antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
