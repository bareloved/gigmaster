"use client";

import { Phone, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GigContact } from "@/lib/gigpack/types";

interface NeedHelpSectionProps {
  contacts: GigContact[];
  accentColor?: string;
}

export function NeedHelpSection({ contacts, accentColor }: NeedHelpSectionProps) {
  if (!contacts || contacts.length === 0) return null;

  return (
    <div className="bg-card border rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <User className="h-5 w-5" style={{ color: accentColor }} />
        <div>
          <h3 className="font-semibold text-lg">Need Help?</h3>
          <p className="text-sm text-muted-foreground">
            Contact these people about the gig
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {contacts.map((contact, index) => (
          <div key={contact.id}>
            {index > 0 && <hr className="border-muted-foreground/20 mb-4" />}
            <div className="space-y-2">
              <div className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
                {contact.label}
              </div>
              <div className="font-semibold">{contact.name}</div>
              <div className="flex flex-wrap gap-2">
                {contact.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    asChild
                  >
                    <a href={`tel:${contact.phone}`}>
                      <Phone className="h-4 w-4" />
                      {contact.phone}
                    </a>
                  </Button>
                )}
                {contact.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    asChild
                  >
                    <a href={`mailto:${contact.email}`}>
                      <Mail className="h-4 w-4" />
                      {contact.email}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
