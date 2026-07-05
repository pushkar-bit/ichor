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
          appearance={{
            elements: {
              card: "bg-midnight-raised border border-border-ichor shadow-xl",
              headerTitle: "text-foreground font-display italic",
              headerSubtitle: "text-white/50",
              formButtonPrimary: "bg-momentum hover:bg-momentum-dim text-midnight font-semibold",
              footerActionLink: "text-momentum hover:text-afterrun",
              socialButtonsBlockButton: "border-border-ichor text-foreground",
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
