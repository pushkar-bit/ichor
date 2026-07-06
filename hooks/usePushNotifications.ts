"use client";

import { useEffect } from "react";
import { requestPushToken } from "@/lib/firebase";

export function usePushNotifications() {
  useEffect(() => {
    let cancelled = false;
    requestPushToken().then((token) => {
      if (cancelled || !token) return;
      fetch("/api/users/fcm-token", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, []);
}
