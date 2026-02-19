import { AuthLoadingGate } from "@/components/layout/auth-loading-gate";

export default function PackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLoadingGate>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </AuthLoadingGate>
  );
}
