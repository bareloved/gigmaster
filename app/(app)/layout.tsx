import { TopNav } from "@/components/layout/top-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
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
      <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
        {/* TopNav is a Client Component for interactivity */}
        <TopNav />

        {/* Main Content Area */}
        {/* Responsive padding: tighter on mobile, normal on desktop */}
        {/* pb-20 on mobile for bottom nav clearance */}
        <main className="flex-1 px-4 py-4 pb-6 sm:px-5 sm:py-5 lg:container lg:mx-auto lg:px-6 lg:py-6 lg:pb-6 lg:max-w-7xl">
          {children}
        </main>

        {/* Footer */}
        <div className="sm:mt-12">
          <AppFooter />
        </div>

        {/* Bottom Navigation - mobile only */}
        <BottomNav />

        {/* Floating Feedback Button */}
        <FeedbackButton />
      </div>
    </AuthLoadingGate>
  );
}
