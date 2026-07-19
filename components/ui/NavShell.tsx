"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IchorLogo } from "./IchorMark";
import { Flame, Map, PlusCircle, Trophy, Users, MessageCircle, User, Search, LogOut, Info, Castle } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Avatar } from "./Avatar";
import { CoachWidget } from "@/components/features/CoachWidget";
import { NotificationBell } from "@/components/features/NotificationBell";

/**
 * Nav items.
 * splashTo: when set, clicking this item plays the splash animation first,
 * then redirects to `splashTo` destination instead of navigating directly.
 */
type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  splashTo?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/feed", label: "Feed", icon: Flame },
  { href: "/map", label: "Territory", icon: Map },
  { href: "/post/create", label: "Post", icon: PlusCircle },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/clans", label: "Clans", icon: Users },
  { href: "/empire", label: "Empire", icon: Castle },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/search", label: "Search", icon: Search },
  { href: "/about", label: "About", icon: Info, splashTo: "about" },
];

type NavUser = { name: string; avatarUrl: string };

export function NavShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: NavUser;
}) {
  const pathname = usePathname();
  const router = useRouter();
  usePushNotifications();

  /** Handle nav item click — splash-intercepted items go through /splash?to=<dest> first */
  function handleNavClick(item: NavItem, e: React.MouseEvent) {
    if (item.splashTo) {
      e.preventDefault();
      router.push(`/splash?to=${item.splashTo}`);
    }
    // otherwise, the <Link> handles it normally
  }

  function renderNavItem(item: NavItem, compact = false) {
    const active = pathname === item.href || (item.href !== "/feed" && pathname?.startsWith(item.href));
    const Icon = item.icon;

    if (compact) {
      // Mobile bottom nav (icon + label, no motion wrapper)
      return (
        <Link
          key={item.href}
          href={item.splashTo ? "#" : item.href}
          onClick={(e) => handleNavClick(item, e)}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-none text-[10px] font-medium ${
            active ? "text-momentum" : "text-white/60"
          }`}
        >
          <Icon className="w-5 h-5" />
          {item.label}
        </Link>
      );
    }

    return (
      // CSS transitions instead of framer-motion so the always-mounted nav shell
      // doesn't pull the animation library into every page's bundle. hover:translate-x-1
      // (4px) and active:scale-[0.96] mirror the previous whileHover/whileTap.
      <div key={item.href} className="transition-transform duration-150 hover:translate-x-1 active:scale-[0.96]">
        <Link
          href={item.splashTo ? "#" : item.href}
          onClick={(e) => handleNavClick(item, e)}
          className={`flex items-center gap-3 px-3 py-2.5 outline-none transition-all ${
            active
              ? "rounded-none border-2 border-border-ichor shadow-[4px_4px_0_var(--ichor-border)] bg-momentum text-midnight -translate-y-0.5"
              : "rounded-none text-white/60 hover:text-white hover:bg-midnight-raised"
          }`}
        >
          {item.label === "Profile" && user.avatarUrl ? (
            <Avatar src={user.avatarUrl} name={user.name} size={18} />
          ) : (
            <Icon className="w-[18px] h-[18px]" />
          )}
          {item.label}
        </Link>
      </div>
    );
  }

  const mobileNavItems = NAV_ITEMS.filter((i) =>
    ["/feed", "/map", "/post/create", "/leaderboard", "/search"].includes(i.href)
  );

  return (
    <div className="min-h-screen bg-midnight-raised md:bg-midnight flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-border-ichor px-4 py-6 sticky top-0 h-screen">
        <div className="px-2 mb-8">
          {/* Logo — plain link back to feed (no splash trigger) */}
          <Link href="/feed" aria-label="Go to feed">
            <IchorLogo textClassName="text-xl" />
          </Link>
        </div>
        <nav className="flex-1 space-y-3">
          {NAV_ITEMS.map((item) => renderNavItem(item))}
        </nav>
        <div className="mt-auto px-2 space-y-2 mb-4">
          <div className="flex items-center gap-2 px-1">
            <NotificationBell />
            <span className="text-xs text-white/40">Notifications</span>
          </div>
          <Link href="/profile" className="flex items-center gap-2 rounded-none px-1 py-1 hover:bg-midnight-raised transition-colors">
            {user.avatarUrl && <Avatar src={user.avatarUrl} name={user.name} size={32} />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
            </div>
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-none text-sm font-medium text-white/60 hover:text-white hover:bg-midnight-raised transition-colors"
            >
              <LogOut className="w-[18px] h-[18px]" />
              Log out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Top Header */}
        <div className="md:hidden">
          <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border-ichor sticky top-0 bg-black z-20">
            {/* Logo — plain link (no splash trigger) */}
            <Link href="/feed" aria-label="Go to feed">
              <IchorLogo textClassName="text-xl" />
            </Link>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Link href="/profile" aria-label="Go to profile">
                <Avatar src={user.avatarUrl} name={user.name} size={28} />
              </Link>
            </div>
          </header>

          {/* Floating Coach Widget for Mobile */}
          <div className="fixed bottom-[80px] right-4 z-[99]">
            <CoachWidget />
          </div>

          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden fixed bottom-0 inset-x-0 bg-black border-t border-border-ichor flex items-center justify-around py-2 z-20">
            {mobileNavItems.map((item) => renderNavItem(item, true))}
          </nav>
        </div>

        <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
