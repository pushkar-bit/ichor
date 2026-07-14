"use client";

import { useEffect } from "react";

export function usePushNotifications() {
  useEffect(() => {
    let cancelled = false;
    // Dynamic import keeps firebase/app + firebase/messaging out of the initial bundle
    // for every page — NavShell calls this hook unconditionally on every authenticated
    // route, so a static import here would ship the messaging SDK to users who never
    // grant push permission.
    import("@/lib/firebase").then(({ requestPushToken }) =>
      requestPushToken().then((token) => {
        if (cancelled || !token) return;
        fetch("/api/users/fcm-token", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }).catch(() => {});
      }),
    );
    return () => {
      cancelled = true;
    };
  }, []);
}
