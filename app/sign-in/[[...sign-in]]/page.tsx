import { SignIn } from "@clerk/nextjs";
import { IchorLogo } from "@/components/ui/IchorMark";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <IchorLogo className="justify-center mb-4" textClassName="text-2xl" />
          <p className="text-sm text-white/50">Sweat. Post. Dominate.</p>
        </div>
        <SignIn
          fallbackRedirectUrl="/feed"
          appearance={{
            elements: {
              card: "bg-midnight-raised border border-border-ichor shadow-xl",
              // This version of Clerk has no client-side text override for the built-in
              // header (it always renders "Sign in to {Application name}" from the Clerk
              // Dashboard setting, currently a stale "dhaav"). Hidden since the page already
              // has its own ICHOR-branded header above the card.
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              formButtonPrimary: "bg-momentum hover:bg-momentum-dim text-midnight font-semibold",
              footerActionLink: "text-momentum hover:text-afterrun",
              socialButtonsBlockButton: "border border-border-ichor hover:bg-white/5 transition-colors",
              socialButtonsIconButton: "border border-border-ichor hover:bg-white/5 transition-colors",
              socialButtonsBlockButtonText: "text-white font-medium",
              formFieldInput: "bg-midnight border-border-ichor text-foreground",
              formFieldLabel: "text-white/60",
              identityPreviewText: "text-white/70",
              dividerLine: "bg-border-ichor",
              dividerText: "text-white/40",
            },
          }}
        />
      </div>
    </div>
  );
}
