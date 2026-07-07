"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { IchorLogo } from "./IchorMark";
import { Flame, Map, PlusCircle, Trophy, Users, MessageCircle, User, ShieldAlert } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const NAV_ITEMS = [
  { href: "/feed", label: "Feed", icon: Flame },
  { href: "/map", label: "Territory", icon: Map },
  { href: "/post/create", label: "Post", icon: PlusCircle },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/clans", label: "Clans", icon: Users },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
];

export function NavShell({ children, isAdmin }: { children: React.ReactNode; isAdmin?: boolean }) {
  const pathname = usePathname();
  usePushNotifications();
  const { user } = useUser();
  const items = isAdmin ? [...NAV_ITEMS, { href: "/admin", label: "Admin", icon: ShieldAlert }] : NAV_ITEMS;

  return (
    <div className="min-h-screen bg-midnight flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-border-ichor px-4 py-6 sticky top-0 h-screen">
        <div className="px-2 mb-8">
          <IchorLogo textClassName="text-xl" />
        </div>
        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/feed" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? "bg-momentum text-midnight" : "text-white/60 hover:text-white hover:bg-midnight-raised"
                }`}
              >
                {item.label === "Profile" && user?.imageUrl ? (
                  <img src={user.imageUrl} alt="Profile" className="w-[18px] h-[18px] rounded-full object-cover shrink-0 bg-midnight-raised" />
                ) : (
                  <Icon className="w-[18px] h-[18px]" />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-2 pt-4 border-t border-border-ichor flex items-center gap-2">
          <UserButton />
          <span className="text-xs text-white/40 truncate">{user?.fullName || "Account"}</span>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border-ichor sticky top-0 bg-midnight/95 backdrop-blur z-20">
          <IchorLogo textClassName="text-lg" />
          <UserButton />
        </header>

        <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-midnight-raised border-t border-border-ichor flex items-center justify-around py-2 z-20">
          {items.slice(0, 5).map((item) => {
            const active = pathname === item.href || (item.href !== "/feed" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium ${
                  active ? "text-momentum" : "text-white/50"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
