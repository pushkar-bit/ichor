import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import LandingExperience from "@/components/features/landing/LandingExperience";

export default async function LandingPage() {
  const userId = await getSessionUserId();
  if (userId) redirect("/feed");

  return <LandingExperience />;
}
