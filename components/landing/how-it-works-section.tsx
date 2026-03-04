import { CirclePlus, UserPlus, BadgeDollarSign } from "lucide-react";

const steps = [
  {
    icon: CirclePlus,
    label: "Step 1",
    title: "Create a gig",
    description:
      "Add the venue, date, time, and all the details for your performance.",
  },
  {
    icon: UserPlus,
    label: "Step 2",
    title: "Build your lineup",
    description:
      "Add musicians from your circle or invite new ones via email or WhatsApp.",
  },
  {
    icon: BadgeDollarSign,
    label: "Step 3",
    title: "Get paid & track everything",
    description:
      "Mark payments, export to your calendar, and stay organized effortlessly.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">How it works</h2>
          <p className="mt-4 text-muted-foreground">
            Get up and running in minutes. No learning curve, no complexity.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.label} className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <step.icon className="h-8 w-8" />
              </div>
              <p className="mt-4 text-sm font-bold text-primary">
                {step.label}
              </p>
              <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
