import { IchorLogo } from "@/components/ui/IchorMark";
import { GoogleSignInButton, GoogleNotConfiguredNotice } from "@/components/features/GoogleSignInButton";

export default function SignUpPage() {
  const googleConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <IchorLogo className="justify-center mb-4" textClassName="text-2xl" />
          <p className="text-sm text-white/50">Turn sweat into lore.</p>
        </div>
        <div className="bg-midnight-raised border border-border-ichor shadow-xl rounded-2xl p-6">
          <h1 className="font-display italic text-foreground text-xl text-center mb-1">Create your ICHOR account</h1>
          <p className="text-sm text-white/50 text-center mb-6">Turn sweat into lore.</p>
          {googleConfigured ? <GoogleSignInButton /> : <GoogleNotConfiguredNotice />}
        </div>
      </div>
    </div>
  );
}
