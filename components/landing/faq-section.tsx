import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Is GigMaster free?",
    answer:
      "Yes! GigMaster is completely free to use. We believe every musician deserves great tools to manage their gigs without paying a fortune.",
  },
  {
    question: "Who is GigMaster for?",
    answer:
      "GigMaster is built for gigging musicians, band leaders, and music managers. Whether you play solo gigs, lead a jazz quartet, or manage multiple function bands \u2014 it\u2019s for you.",
  },
  {
    question: "Can I use it on my phone?",
    answer:
      "Absolutely. GigMaster is a fully responsive web app that works great on phones, tablets, and desktops. A dedicated mobile app is also in development.",
  },
  {
    question: "How do invitations work?",
    answer:
      "You can invite musicians to your gigs via email or WhatsApp. They receive a magic link, click it, and they\u2019re in. No account required to view the gig \u2014 but signing up lets them manage everything from their own dashboard.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. GigMaster uses row-level security, which means your data is isolated and encrypted. Only you can see your gigs, and only musicians you invite can see theirs.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
