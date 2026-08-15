import { redirect } from "next/navigation";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { NavShell } from "@/components/ui/NavShell";
import { StravaGateBanner } from "@/components/features/StravaGateBanner";
import { checkAndSendBirthdayWish } from "@/lib/birthday";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getOrCreateCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.weightKg || !user.heightCm || !user.username) redirect("/onboarding");

  // Cheap on every non-birthday request — see lib/birthday.ts for why this is safe to call here.
  await checkAndSendBirthdayWish(user);

  const stravaConnected = Boolean(user.stravaAthleteId);

  return (
    // data-mode scopes the Beginner-Friendly Mode CSS overrides in globals.css to the entire
    // authenticated app — see the [data-mode="beginner"] rules there for why this wraps here
    // instead of the <html> tag in the root layout.
    <div data-mode={user.beginnerMode ? "beginner" : "core"}>
      <NavShell user={{ name: user.name, avatarUrl: user.avatarUrl, beginnerMode: Boolean(user.beginnerMode) }}>
        {stravaConnected ? (
          children
        ) : (
          <>
            <StravaGateBanner beginnerMode={Boolean(user.beginnerMode)} />
            {/* Dimmed so the banner is the only thing drawing the eye — but left interactive on
                purpose (see StravaGateBanner). Not aria-hidden for the same reason: the content
                is still reachable, so hiding it from assistive tech would be a lie. */}
            <div className="opacity-40 transition-opacity">{children}</div>
          </>
        )}
      </NavShell>
    </div>
  );
}
