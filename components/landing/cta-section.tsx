import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="bg-primary/5 py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Ready to get organized?
        </h2>
        <p className="mt-4 text-muted-foreground">
          Join GigMaster today and spend less time organizing, more time playing.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/auth/sign-up">Get Started Free</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
