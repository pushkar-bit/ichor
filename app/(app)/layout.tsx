import { redirect } from "next/navigation";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { NavShell } from "@/components/ui/NavShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getOrCreateCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.weightKg || !user.heightCm || !user.username) redirect("/onboarding");

  return (
    // data-mode scopes the Beginner-Friendly Mode CSS overrides in globals.css to the entire
    // authenticated app — see the [data-mode="beginner"] rules there for why this wraps here
    // instead of the <html> tag in the root layout.
    <div data-mode={user.beginnerMode ? "beginner" : "core"}>
      <NavShell user={{ name: user.name, avatarUrl: user.avatarUrl, beginnerMode: Boolean(user.beginnerMode) }}>
        {children}
      </NavShell>
    </div>
  );
}
