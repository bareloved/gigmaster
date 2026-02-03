"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Phone, Mail, User, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/lib/providers/user-provider";
import { toast } from "sonner";
import {
  listGigContacts,
  createGigContact,
  updateGigContact,
  deleteGigContact,
} from "@/lib/api/gig-contacts";
import type { GigContact } from "@/lib/types/shared";

// Local contact type for new gigs (before saving to DB)
export interface PendingContact {
  id: string; // temporary ID
  label: string;
  name: string;
  phone: string | null;
  email: string | null;
  sourceType: "manual" | "lineup" | "contact";
  sourceId: string | null;
}

interface GigContactsManagerProps {
  /** Gig ID - if provided, uses database mode. If undefined, uses local mode. */
  gigId?: string;
  /** For local mode: pending contacts state */
  pendingContacts?: PendingContact[];
  /** For local mode: callback to update pending contacts */
  onPendingContactsChange?: (contacts: PendingContact[]) => void;
  disabled?: boolean;
}

export function GigContactsManager({
  gigId,
  pendingContacts = [],
  onPendingContactsChange,
  disabled = false,
}: GigContactsManagerProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Database mode: fetch contacts for existing gig
  const { data: dbContacts = [], isLoading } = useQuery({
    queryKey: ["gig-contacts", gigId, user?.id],
    queryFn: () => listGigContacts(gigId!),
    enabled: !!gigId && !!user,
  });

  // Use database contacts if gigId exists, otherwise use pending contacts
  const contacts: (GigContact | PendingContact)[] = gigId ? dbContacts : pendingContacts;

  // Track if we've auto-added the first contact
  const hasAutoAdded = useRef(false);

  // Auto-add empty contact when section opens with no contacts (for existing gigs)
  useEffect(() => {
    if (gigId && !isLoading && dbContacts.length === 0 && !hasAutoAdded.current) {
      hasAutoAdded.current = true;
      // Create an empty contact in the database
      createGigContact({
        gigId,
        label: "",
        name: "",
        phone: null,
        email: null,
        sourceType: "manual",
        sourceId: null,
        sortOrder: 0,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["gig-contacts", gigId] });
      });
    }
  }, [gigId, isLoading, dbContacts.length, queryClient]);

  // Create mutation (only for database mode)
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createGigContact>[0]) => createGigContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gig-contacts", gigId] });
      queryClient.invalidateQueries({ queryKey: ["gig-pack-full", gigId] });
    },
    onError: () => {
      toast.error("Failed to add contact");
    },
  });

  // Update mutation (only for database mode)
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateGigContact>[1] }) =>
      updateGigContact(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gig-contacts", gigId] });
      queryClient.invalidateQueries({ queryKey: ["gig-pack-full", gigId] });
    },
    onError: () => {
      toast.error("Failed to update contact");
    },
  });

  // Delete mutation (only for database mode)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGigContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gig-contacts", gigId] });
      queryClient.invalidateQueries({ queryKey: ["gig-pack-full", gigId] });
    },
    onError: () => {
      toast.error("Failed to remove contact");
    },
  });

  const handleAddContact = () => {
    if (gigId) {
      // Database mode: create empty contact
      createMutation.mutate({
        gigId,
        label: "",
        name: "",
        phone: null,
        email: null,
        sourceType: "manual",
        sourceId: null,
        sortOrder: contacts.length,
      });
    } else {
      // Local mode: add to pending contacts
      const newContact: PendingContact = {
        id: crypto.randomUUID(),
        label: "",
        name: "",
        phone: null,
        email: null,
        sourceType: "manual",
        sourceId: null,
      };
      onPendingContactsChange?.([...pendingContacts, newContact]);
    }
  };

  const handleUpdateContact = (
    id: string,
    field: "label" | "name" | "phone" | "email",
    value: string
  ) => {
    if (gigId) {
      // Database mode: update in DB
      updateMutation.mutate({
        id,
        data: { [field]: value || null },
      });
    } else {
      // Local mode: update pending contacts
      onPendingContactsChange?.(
        pendingContacts.map((c) =>
          c.id === id ? { ...c, [field]: value || null } : c
        )
      );
    }
  };

  const handleDeleteContact = (id: string) => {
    if (gigId) {
      // Database mode: delete from DB
      deleteMutation.mutate(id);
    } else {
      // Local mode: remove from pending contacts
      onPendingContactsChange?.(pendingContacts.filter((c) => c.id !== id));
    }
  };

  if (gigId && isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-2">
      {/* Contact List */}
      {contacts.map((contact) => (
        <ContactRow
          key={contact.id}
          contact={contact}
          onUpdate={(field, value) => handleUpdateContact(contact.id, field, value)}
          onDelete={() => handleDeleteContact(contact.id)}
          disabled={disabled || deleteMutation.isPending || updateMutation.isPending}
        />
      ))}

      {/* Add Button */}
      <button
        type="button"
        onClick={handleAddContact}
        disabled={disabled || createMutation.isPending}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        + Add another contact
      </button>
    </div>
  );
}

interface ContactRowProps {
  contact: GigContact | PendingContact;
  onUpdate: (field: "label" | "name" | "phone" | "email", value: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}

function ContactRow({ contact, onUpdate, onDelete, disabled }: ContactRowProps) {
  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      {/* Row 1: Name and Role */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <User className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={contact.name}
            onChange={(e) => onUpdate("name", e.target.value)}
            placeholder="Name"
            disabled={disabled}
            className="h-8 text-sm pl-7"
          />
        </div>
        <div className="flex-1 relative">
          <Tag className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={contact.label}
            onChange={(e) => onUpdate("label", e.target.value)}
            placeholder="Role"
            disabled={disabled}
            className="h-8 text-sm pl-7"
          />
        </div>
        {/* Spacer to match delete button width */}
        <div className="w-8 shrink-0" />
      </div>

      {/* Row 2: Phone and Email */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Phone className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={contact.phone || ""}
            onChange={(e) => onUpdate("phone", e.target.value)}
            placeholder="Phone"
            type="tel"
            disabled={disabled}
            className="h-8 text-sm pl-7"
          />
        </div>
        <div className="flex-1 relative">
          <Mail className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={contact.email || ""}
            onChange={(e) => onUpdate("email", e.target.value)}
            placeholder="Email"
            type="email"
            disabled={disabled}
            className="h-8 text-sm pl-7"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={disabled}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
