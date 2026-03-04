const testimonials = [
  {
    initials: "DL",
    name: "Daniel Levy",
    role: "Bandleader, The Brass Collective",
    quote:
      "I used to spend hours coordinating gigs over WhatsApp. GigMaster replaced all of that \u2014 now I send an invite and it\u2019s done.",
  },
  {
    initials: "MC",
    name: "Maya Cohen",
    role: "Session Musician",
    quote:
      "Finally, I can see all my upcoming gigs in one place. The calendar sync alone saves me from double-booking every week.",
  },
  {
    initials: "AB",
    name: "Arik Ben-David",
    role: "Music Director",
    quote:
      "Managing 4 different bands was a nightmare. GigMaster keeps everything organized \u2014 lineups, setlists, payments, all of it.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-muted/30 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What musicians are saying
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.initials} className="rounded-xl border bg-card p-6">
              <p className="text-sm italic text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
