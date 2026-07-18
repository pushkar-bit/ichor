import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function formatPace(minPerKm: number | null | undefined): string {
  if (!minPerKm) return "—";
  const min = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - min) * 60);
  return `${min}:${String(sec).padStart(2, "0")}/km`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// The Monday (UTC, YYYY-MM-DD) that starts the calendar week containing `date`. Fixed to UTC
// rather than the viewer's local time so the week boundary — and the reset — is the same
// instant for every user, not staggered across time zones.
export function weekBucketKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const utcMidnight = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const daysSinceMonday = (utcMidnight.getUTCDay() + 6) % 7; // Mon=0 ... Sun=6
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() - daysSinceMonday);
  return utcMidnight.toISOString().slice(0, 10);
}
