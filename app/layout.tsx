import type { Metadata } from "next";
import { Poppins, Barlow_Condensed } from "next/font/google";
import { GoogleOAuthProvider } from "@react-oauth/google";
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
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""}>
      <html lang="en" className={`${poppins.variable} ${barlowCondensed.variable} h-full`}>
        <body className="min-h-full flex flex-col antialiased">{children}</body>
      </html>
    </GoogleOAuthProvider>
  );
}
