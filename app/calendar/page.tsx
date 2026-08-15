"use client";

import "./calendar.css";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, Coffee, Repeat } from "lucide-react";

type CalEvent = {
  /** YYYY-MM-DD, local — never derive from toISOString (timezone shifts the date). */
  date: string;
  title: string;
  subtitle: string;
  /** Solid purple fill = locked date. Dashed outline = date not locked yet. */
  confirmed: boolean;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
};

// Add new rows here as more dates lock in — the grid below needs no other changes.
const EVENTS: CalEvent[] = [
  {
    date: "2026-08-21",
    title: "RU-Rox 1.0",
    subtitle: "2030 Batch · Neem Tree Ground · 7:00 AM",
    confirmed: true,
    href: "/ru-rox",
    icon: Flag,
  },
  {
    date: "2026-08-29",
    title: "RU-Rox 2.0",
    subtitle: "All Batches · Neem Tree Ground · 7:00 AM",
    confirmed: true,
    href: "/ru-rox",
    icon: Flag,
  },
  {
    date: "2026-09-05",
    title: "Coffee Rave Run",
    subtitle: "+ Afterparty · Paid Run · exact date TBC",
    confirmed: false,
    icon: Coffee,
  },
];

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthGrid(year: number, month: number): (Date | null)[][] {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0 .. Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date(2026, 7, 1)); // defaults to Aug 2026

  const eventsByDate = useMemo(() => new Map(EVENTS.map((e) => [e.date, e])), []);
  const weeks = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const today = dateKey(new Date());

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="px-6 md:px-12 pt-6">
        <Link href="/" className="text-sm font-medium text-white/50 hover:text-white transition-colors">
          ← ICHOR
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-10 pb-24">
        <div className="mb-2 text-xs font-medium tracking-widest uppercase text-momentum">Event Calendar</div>
        <h1 className="font-display italic font-bold text-4xl md:text-5xl mb-3">What&apos;s coming up</h1>
        <p className="text-white/50 mb-10 max-w-xl">
          Two weekly runs — one on a weekday, one on the weekend — plus the events below. More gets added as
          dates lock in.
        </p>

        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="w-9 h-9 rounded-full border border-border-ichor flex items-center justify-center hover:border-momentum/40 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-display italic font-bold text-xl">{monthLabel}</h2>
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="w-9 h-9 rounded-full border border-border-ichor flex items-center justify-center hover:border-momentum/40 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="text-center text-[11px] font-medium text-white/30 uppercase tracking-wide">
              {w}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="space-y-1.5">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1.5">
              {week.map((day, di) => {
                if (!day) return <div key={di} className="aspect-square" />;
                const key = dateKey(day);
                const event = eventsByDate.get(key);
                const isToday = key === today;

                return (
                  <div
                    key={di}
                    className={
                      "relative aspect-square rounded-lg border p-1.5 flex flex-col overflow-hidden " +
                      (event?.confirmed
                        ? "bg-momentum border-momentum text-midnight"
                        : event
                          ? "border-2 border-dashed border-momentum/70 text-momentum bg-momentum/5"
                          : "border-border-ichor bg-midnight-raised text-white/70") +
                      (isToday && !event ? " ring-1 ring-white/40" : "")
                    }
                  >
                    <span className="text-[11px] leading-none font-medium">{day.getDate()}</span>
                    {event ? (
                      <span className="mt-auto text-[9px] leading-tight font-semibold line-clamp-2">
                        {event.title}
                      </span>
                    ) : (
                      <span className="ichor-cal-scan-dot" style={{ animationDelay: `${di}s` }} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-xs text-white/50">
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-momentum inline-block" />
            Confirmed date
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm border-2 border-dashed border-momentum/70 inline-block" />
            Date not locked yet
          </span>
          <span className="inline-flex items-center gap-2">
            <Repeat className="w-3.5 h-3.5" />
            Pulsing dot — weekly run rhythm, exact day rotating
          </span>
        </div>

        {/* Upcoming list */}
        <div className="mt-16">
          <h3 className="text-sm uppercase tracking-widest text-white/40 mb-4">Upcoming</h3>
          <div className="space-y-3">
            {EVENTS.slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((e) => {
                const Icon = e.icon;
                const dateLabel = new Date(`${e.date}T00:00:00`).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                const rowClass =
                  "flex items-center gap-4 bg-midnight-raised border border-border-ichor rounded-xl px-4 py-3 hover:border-momentum/40 transition-colors";
                const rowContent = (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-momentum/15 text-momentum flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{e.title}</p>
                      <p className="text-xs text-white/50">{e.subtitle}</p>
                    </div>
                    <span className="ml-auto text-xs font-medium text-white/40 whitespace-nowrap">
                      {dateLabel}
                      {!e.confirmed && " · TBC"}
                    </span>
                  </>
                );
                return e.href ? (
                  <Link key={e.date + e.title} href={e.href} className={rowClass}>
                    {rowContent}
                  </Link>
                ) : (
                  <div key={e.date + e.title} className={rowClass}>
                    {rowContent}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
