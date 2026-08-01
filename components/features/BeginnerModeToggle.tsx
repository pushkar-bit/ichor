"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/Switch";

/** Flips Beginner-Friendly Mode from Profile — full reload on success so the (app) layout's
 * server-side data-mode + nav relabeling re-resolve from Mongo (see app/(app)/layout.tsx). */
export function BeginnerModeToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle(next: boolean) {
    setEnabled(next);
    setSaving(true);
    const res = await fetch("/api/users/beginner-mode", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beginnerMode: next }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      setEnabled(!next);
      setSaving(false);
    }
  }

  return <Switch checked={enabled} onChange={toggle} disabled={saving} label="Beginner-Friendly Mode" />;
}
