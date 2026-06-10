import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md bg-background-card rounded-2xl p-8 border border-white/5 shadow-glass glass-panel flex flex-col items-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          JabWeMet
        </h1>
        <p className="text-text-secondary text-sm mb-6 text-center">
          Create your creator account
        </p>
        <SignUp
          appearance={{
            elements: {
              card: "bg-transparent border-0 shadow-none",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "bg-background-elevated border border-white/10 text-white hover:bg-white/5",
              formButtonPrimary: "bg-primary text-white hover:bg-primary-hover",
              footerActionLink: "text-primary hover:text-primary-neon",
              formFieldInput: "bg-background-elevated border border-white/10 text-white",
            },
          }}
        />
      </div>
    </div>
  );
}
