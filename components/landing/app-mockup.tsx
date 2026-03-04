/* eslint-disable @next/next/no-img-element */
export function AppMockup() {
  return (
    <div className="relative mx-auto w-full max-w-lg pb-20 pt-10">
      {/* ===== Mini Gigpack — center piece ===== */}
      <div className="relative z-10 mx-auto w-[280px] overflow-hidden rounded-xl border bg-card shadow-2xl sm:w-[310px]">
        {/* Hero image */}
        <div className="relative h-32 overflow-hidden sm:h-36">
          <img
            src="/gig-fallbacks/club-stage-1.jpeg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
          <div className="absolute left-2.5 top-2.5 rounded-lg bg-white/90 px-1.5 py-1 shadow-md">
            <span className="text-[8px] font-black tracking-tight text-slate-800">
              TJC
            </span>
          </div>
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[8px] font-semibold text-purple-100 backdrop-blur-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-purple-300" />
            Club Show
          </div>
        </div>

        {/* Floating info card */}
        <div className="-mt-10 relative z-10 mx-2.5 rounded-lg border bg-card p-3 shadow-lg sm:mx-3 sm:p-3.5">
          <h3 className="text-[13px] font-bold leading-tight text-foreground sm:text-sm">
            Jazz at the Blue Note
          </h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            The Jazz Collective
          </p>
          <div className="mt-2.5">
            <div className="mb-1 flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary/60" />
              <span className="text-[8px] font-semibold uppercase tracking-wider text-primary">
                Date & Time
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-foreground">
                Friday, March 14
              </span>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-muted-foreground">Call</span>
                <span className="font-semibold">18:30</span>
                <span className="text-muted-foreground/40">|</span>
                <span className="text-muted-foreground">Stage</span>
                <span className="font-semibold">21:00</span>
              </div>
            </div>
          </div>
          <div className="mt-2">
            <div className="mb-1 flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary/60" />
              <span className="text-[8px] font-semibold uppercase tracking-wider text-primary">
                Address
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-[11px]">
                <span className="font-medium text-foreground">
                  The Blue Note
                </span>
                <p className="text-[10px] text-muted-foreground">
                  32 Rothschild Blvd, Tel Aviv
                </p>
              </div>
              <span className="flex h-5 w-5 items-center justify-center rounded border bg-muted/50 text-[8px]">
                📍
              </span>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-2 border-t pt-2">
            <div className="flex -space-x-1.5">
              {["DS", "MK", "RL", "AB"].map((initials) => (
                <div
                  key={initials}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-primary/10 text-[7px] font-bold text-primary"
                >
                  {initials}
                </div>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">
              4 musicians
            </span>
          </div>
        </div>

        {/* Setlist preview */}
        <div className="mx-2.5 mt-2.5 mb-3 sm:mx-3">
          <div className="text-[10px] font-bold text-foreground mb-1.5">
            Setlist
          </div>
          <div className="rounded-md border bg-white p-2 text-[10px] leading-relaxed text-slate-700">
            <div className="border-b border-dashed border-slate-200 pb-1 mb-1 text-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                The Jazz Collective
              </span>
            </div>
            <ol className="list-decimal pl-4 space-y-0.5 text-[10px]">
              <li>Autumn Leaves</li>
              <li>Blue in Green</li>
              <li>Take Five</li>
              <li className="text-slate-400">So What</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 border-t py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="text-[8px] text-muted-foreground">
            Powered by{" "}
            <span className="font-semibold text-primary">GigMaster</span>
          </span>
        </div>
      </div>

      {/* ===== Mini gigs grid — top-right ===== */}
      <div className="absolute -right-1 -top-2 z-20 w-[168px] rotate-2 rounded-xl border bg-card p-2 shadow-lg sm:-right-6 sm:w-[185px]">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[9px] font-bold text-foreground">My Gigs</span>
          <div className="flex gap-0.5">
            <span className="rounded bg-muted px-1 py-0.5 text-[7px] font-medium text-muted-foreground">
              List
            </span>
            <span className="rounded bg-primary/10 px-1 py-0.5 text-[7px] font-semibold text-primary">
              Grid
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          {[
            {
              img: "/gig-fallbacks/bar-1.jpeg",
              month: "MAR",
              day: "21",
              title: "Wedding Reception",
              venue: "Herzliya Marina",
              badge: "You",
              badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
            },
            {
              img: "/gig-fallbacks/coffeehouse-1.jpeg",
              month: "MAR",
              day: "28",
              title: "Friday Jazz Night",
              venue: "Cafe Noir",
              badge: "Dan L.",
              badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
            },
          ].map((g) => (
            <div
              key={g.day}
              className="overflow-hidden rounded-md border bg-card"
            >
              <div className="relative h-10 overflow-hidden sm:h-12">
                <img
                  src={g.img}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute left-1 top-1 flex flex-col items-center rounded-sm bg-background/90 px-1 py-0.5 leading-none backdrop-blur-sm">
                  <span className="text-[6px] uppercase text-muted-foreground">
                    {g.month}
                  </span>
                  <span className="text-[10px] font-bold">{g.day}</span>
                </div>
                <div className="absolute right-1 top-1">
                  <span
                    className={`rounded-sm border px-1 py-0.5 text-[6px] font-semibold backdrop-blur-sm ${g.badgeClass}`}
                  >
                    {g.badge}
                  </span>
                </div>
              </div>
              <div className="px-1.5 py-1">
                <div className="text-[9px] font-semibold leading-tight text-foreground">
                  {g.title}
                </div>
                <div className="mt-0.5 text-[8px] text-muted-foreground truncate">
                  {g.venue}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Invitation toast — top-left ===== */}
      <div className="absolute -left-1 top-0 z-20 w-40 -rotate-3 rounded-xl border bg-card p-2.5 shadow-lg sm:-left-4 sm:w-44">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[8px] font-bold text-blue-700">
            AB
          </div>
          <div className="min-w-0">
            <div className="truncate text-[10px] font-semibold text-foreground">
              Arik invited you
            </div>
            <div className="truncate text-[8px] text-muted-foreground">
              Wedding &middot; Mar 21
            </div>
          </div>
        </div>
        <div className="mt-1.5 flex gap-1">
          <span className="flex-1 rounded-md bg-primary py-0.5 text-center text-[8px] font-medium text-primary-foreground">
            Accept
          </span>
          <span className="flex-1 rounded-md border py-0.5 text-center text-[8px] font-medium text-muted-foreground">
            Decline
          </span>
        </div>
      </div>

      {/* ===== Calendar mini — bottom-left ===== */}
      <div className="absolute -left-1 bottom-2 z-20 w-32 -rotate-1 rounded-xl border bg-card p-2.5 shadow-lg sm:-left-4 sm:w-36">
        <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          March 2026
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[7px]">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={i} className="font-medium text-muted-foreground">
              {d}
            </span>
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {Array.from({ length: 31 }, (_, i) => {
            const day = i + 1;
            const isGig = day === 14 || day === 21 || day === 28;
            return (
              <span
                key={day}
                className={
                  isGig
                    ? "flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-primary-foreground"
                    : "flex h-3 w-3 items-center justify-center text-foreground"
                }
              >
                {day}
              </span>
            );
          })}
        </div>
      </div>

      {/* ===== Payments card — bottom-right ===== */}
      <div className="absolute -right-1 bottom-6 z-20 w-44 rotate-1 rounded-xl border bg-card p-2.5 shadow-lg sm:-right-4 sm:w-48">
        <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          Payments
        </div>
        <div className="space-y-1">
          {[
            { name: "D. Schwartz", amount: "$600", status: "Paid" },
            { name: "M. Klein", amount: "$600", status: "Paid" },
            { name: "R. Levi", amount: "$600", status: "Pending" },
          ].map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-between text-[10px]"
            >
              <span className="text-muted-foreground">{p.name}</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground">
                  {p.amount}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[7px] font-medium ${
                    p.status === "Paid"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
