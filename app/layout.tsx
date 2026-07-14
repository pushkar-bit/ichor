import type { Metadata } from "next";
import { Suspense } from "react";
import { Poppins, Barlow_Condensed } from "next/font/google";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { TopLoader } from "@/components/ui/TopLoader";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  // 600 dropped — no `font-display` element uses semibold (the many `font-semibold`
  // classes are body text in Poppins). 500 kept: the sign-in/up headings render at it.
  weight: ["500", "700", "800"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "ICHOR — Sweat. Post. Dominate.",
  description:
    "ICHOR is a campus social fitness battleground. Import your runs, post them, get judged, and fight for territory.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""}>
      <html lang="en" className={`${poppins.variable} ${barlowCondensed.variable} h-full`}>
        <body className="min-h-full flex flex-col antialiased">
          <Suspense fallback={null}>
            <TopLoader />
          </Suspense>
          {children}
        </body>
      </html>
    </GoogleOAuthProvider>
  );
}
