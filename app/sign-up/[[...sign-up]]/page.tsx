import { SignUp } from "@clerk/nextjs";
import { IchorLogo } from "@/components/ui/IchorMark";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <IchorLogo className="justify-center mb-4" textClassName="text-2xl" />
          <p className="text-sm text-white/50">Turn sweat into lore.</p>
        </div>
        <SignUp
          fallbackRedirectUrl="/feed"
          appearance={{
            elements: {
              card: "bg-midnight-raised border border-border-ichor shadow-xl",
              // Same as the sign-in page: this Clerk version has no client-side override for
              // the built-in header text (it renders the Dashboard's stale "dhaav" Application
              // name), so it's hidden in favor of the page's own ICHOR-branded header above.
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
