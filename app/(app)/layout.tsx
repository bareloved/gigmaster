import { TopNav } from "@/components/layout/top-nav";

// PERFORMANCE: This is now a Server Component!
// Auth is handled by middleware.ts at the edge, so we don't need
// client-side auth checks or loading states here.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* TopNav is a Client Component for interactivity */}
      <TopNav />
      
      {/* Main Content Area */}
      <main className="container mx-auto p-6 max-w-7xl">
        {children}
      </main>
    </div>
  );
}
