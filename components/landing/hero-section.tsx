import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppMockup } from './app-mockup';

export function HeroSection() {
  return (
    <section className="px-4 pb-16 pt-12 sm:px-6 md:pb-24 md:pt-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        {/* Left — text */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            The operating system for gigging musicians
          </h1>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
            Manage your gigs, bands, setlists, and payments in one place.
            Spend less time organizing and more time playing.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" asChild>
              <Link href="/auth/sign-up">Get Started Free</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/auth/sign-in"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Right — mockup */}
        <div>
          <AppMockup />
        </div>
      </div>
    </section>
  );
}
