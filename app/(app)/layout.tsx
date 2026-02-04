import { TopNav } from "@/components/layout/top-nav";
import { AuthLoadingGate } from "@/components/layout/auth-loading-gate";
import { AppFooter } from "@/components/layout/app-footer";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";

// Auth is handled by middleware.ts at the edge.
// AuthLoadingGate shows a loading screen while user state initializes.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLoadingGate>
      <div className="flex min-h-screen flex-col bg-background">
        {/* TopNav is a Client Component for interactivity */}
        <TopNav />

        {/* Main Content Area */}
        <main className="container mx-auto flex-1 p-6 max-w-7xl">
          {children}
        </main>

        {/* Footer */}
        <AppFooter />

        {/* Floating Feedback Button */}
        <FeedbackButton />
      </div>
    </AuthLoadingGate>
  );
}
