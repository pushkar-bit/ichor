import { redirect } from "next/navigation";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { NavShell } from "@/components/ui/NavShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getOrCreateCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.weightKg || !user.heightCm || !user.username) redirect("/onboarding");

  return (
    <NavShell isAdmin user={{ name: user.name, avatarUrl: user.avatarUrl }}>
      {children}
    </NavShell>
  );
}
