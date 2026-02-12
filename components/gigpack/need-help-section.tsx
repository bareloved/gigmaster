"use client";

import { Phone, Mail, User, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GigContact } from "@/lib/gigpack/types";

/**
 * Normalize a phone number for WhatsApp wa.me links.
 * wa.me expects digits only with country code (no leading + or 0).
 * Israeli local numbers (starting with 0) get 972 prefix automatically.
 */
function normalizePhoneForWhatsApp(phone: string): string {
  // Strip everything except digits and +
  const cleaned = phone.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    // Already has country code — just remove the +
    return cleaned.slice(1);
  }

  if (cleaned.startsWith("0")) {
    // Local Israeli number (e.g. 0501234567) → 972501234567
    return "972" + cleaned.slice(1);
  }

  // Assume it already has a country code without +
  return cleaned;
}

interface NeedHelpSectionProps {
  contacts: GigContact[];
  accentColor?: string;
}

export function NeedHelpSection({ contacts, accentColor }: NeedHelpSectionProps) {
  if (!contacts || contacts.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <User className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className="font-semibold text-lg">Contact</h3>
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
                  <>
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      asChild
                    >
                      <a
                        href={`https://wa.me/${normalizePhoneForWhatsApp(contact.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    </Button>
                  </>
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
