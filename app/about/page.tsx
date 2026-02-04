import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Users, Calendar, DollarSign } from "lucide-react";

export const metadata = {
  title: "About | GigMaster",
  description: "Built by musicians, for musicians - Learn about GigMaster",
};

const features = [
  {
    icon: Music,
    title: "Gig Management",
    description: "Keep track of all your gigs in one place - dates, venues, setlists, and more.",
  },
  {
    icon: Users,
    title: "Band Coordination",
    description: "Manage your bands, invite musicians, and coordinate lineups effortlessly.",
  },
  {
    icon: Calendar,
    title: "Calendar Sync",
    description: "Sync with Google Calendar and never double-book a gig again.",
  },
  {
    icon: DollarSign,
    title: "Payment Tracking",
    description: "Track who's been paid and manage your gig finances.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              &larr; Back
            </Button>
          </Link>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <Image
            src="/gigmasterlogo.png"
            alt="GigMaster"
            width={200}
            height={158}
            className="mx-auto mb-6 w-auto"
            priority
          />
          <h1 className="text-4xl font-bold mb-4">About GigMaster</h1>
          <p className="text-xl text-muted-foreground">
            Built by a musician, for musicians
          </p>
        </div>

        {/* Story Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Our Story</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              GigMaster was born out of a simple frustration: managing gigs shouldn&apos;t be harder
              than playing them. As a working musician, I found myself juggling spreadsheets,
              WhatsApp groups, and endless email threads just to keep track of who&apos;s playing
              what, when, and where.
            </p>
            <p>
              So I built GigMaster - a platform designed specifically for the way musicians
              actually work. No corporate jargon, no unnecessary complexity. Just the tools
              you need to manage your gigs, coordinate with your band, and focus on what
              matters most: the music.
            </p>
            <p>
              Whether you&apos;re a solo artist managing your own bookings, a bandleader
              coordinating multiple musicians, or part of a busy function band, GigMaster
              helps you stay organized and professional.
            </p>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 text-center">What GigMaster Does</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="bg-muted">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Ready to simplify your gig life?</h2>
            <p className="text-muted-foreground mb-4">
              Join GigMaster today and spend less time organizing, more time playing.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/sign-up">
                <Button>Get Started</Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline">Contact Us</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
