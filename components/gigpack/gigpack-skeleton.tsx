import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for the GigPack page.
 * Mirrors the real GigPackLayout structure:
 *   Hero → Floating info card → Main column + Sidebar grid
 */
export function GigPackSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* ─── Top nav bar ─── */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Skeleton className="h-8 w-28" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>

      {/* ─── Hero image placeholder ─── */}
      <Skeleton className="h-[280px] sm:h-[320px] md:h-[400px] w-full rounded-none" />

      {/* ─── Content container ─── */}
      <div className="max-w-5xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24">

        {/* ─── Floating info card ─── */}
        <div className="-mt-40 md:-mt-56 mb-10 relative z-10">
          <div className="mx-auto bg-card border rounded-xl shadow-xl p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:gap-0">
              {/* Left — gig info */}
              <div className="flex-1 min-w-0 lg:pr-8 space-y-6">
                {/* Title + band */}
                <div className="space-y-2">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-5 w-40" />
                </div>

                {/* Date and time section */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <Skeleton className="h-5 w-56" />
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                </div>

                {/* Address section */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-44" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right — lineup (desktop) */}
              <div className="hidden lg:block w-px bg-border/50 shrink-0" />
              <div className="hidden lg:block lg:pl-8 lg:w-[280px] shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-6 rounded-full" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lineup — mobile avatar stack */}
              <div className="lg:hidden mt-5 pt-5 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-9 rounded-full border-2 border-card" />
                    ))}
                  </div>
                  <Skeleton className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Main + Sidebar Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-10 gap-y-8">

          {/* Main column */}
          <div className="lg:col-span-3 space-y-8">
            {/* Logistics items */}
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-4 w-4 mt-1 shrink-0 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-4 w-full max-w-xs" />
                  </div>
                </div>
              ))}
            </div>

            {/* Setlist placeholder */}
            <div className="border-t border-border/30 pt-6">
              <Skeleton className="h-6 w-20 mb-4" />
              <Skeleton className="h-[180px] w-full rounded-lg" />
            </div>
          </div>

          {/* Sidebar column */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-6 space-y-6">
              {/* Schedule card */}
              <div className="hidden lg:block border rounded-xl p-5">
                <Skeleton className="h-5 w-24 mb-3" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-5 w-14" />
                      <Skeleton className="h-4 w-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact card */}
              <div className="border rounded-xl p-5">
                <Skeleton className="h-5 w-28 mb-3" />
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pb-8 flex justify-center">
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    </div>
  );
}
