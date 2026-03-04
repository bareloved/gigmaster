import {
  Music,
  Users,
  ListMusic,
  DollarSign,
  CalendarDays,
  Mail,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Music,
    title: 'Gig Management',
    description:
      'Create and track every gig with venue details, schedules, and notes.',
  },
  {
    icon: Users,
    title: 'Band & Lineup',
    description:
      'Organize your bands, assign roles, and invite musicians to your gigs.',
  },
  {
    icon: ListMusic,
    title: 'Setlists',
    description:
      'Build and reorder setlists for every performance with drag-and-drop.',
  },
  {
    icon: DollarSign,
    title: 'Payment Tracking',
    description:
      "Track who's been paid, what's pending, and see your total earnings.",
  },
  {
    icon: CalendarDays,
    title: 'Calendar Sync',
    description:
      'Export gigs to Google Calendar and import events back automatically.',
  },
  {
    icon: Mail,
    title: 'Smart Invitations',
    description:
      'Invite musicians via email or WhatsApp with one-click acceptance.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-muted/30 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to run your gigs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From booking to payment, GigMaster covers every step of your
            gigging workflow.
          </p>
        </div>

        {/* Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
