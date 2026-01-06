import { TopNav } from "@/components/layout/top-nav";
import { AuthLoadingGate } from "@/components/layout/auth-loading-gate";

// Auth is handled by middleware.ts at the edge.
// AuthLoadingGate shows a loading screen while user state initializes.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLoadingGate>
      <div className="min-h-screen bg-background">
        {/* TopNav is a Client Component for interactivity */}
        <TopNav />

        {/* Main Content Area */}
        <main className="container mx-auto p-6 max-w-7xl">
          {children}
        </main>
      </div>
    </AuthLoadingGate>
  );
}
