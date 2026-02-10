"use client";

import { useState, useCallback } from "react";
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

  // Draft contacts: kept in local state until they have a phone or email,
  // then persisted to the database on blur. This avoids violating the
  // "phone_or_email_required" check constraint on gig_contacts.
  const [drafts, setDrafts] = useState<PendingContact[]>([]);

  // Track which draft IDs are currently being persisted to avoid double-saves
  const [persistingIds, setPersistingIds] = useState<Set<string>>(new Set());

  // Database mode: fetch contacts for existing gig
  const { data: dbContacts = [], isLoading } = useQuery({
    queryKey: ["gig-contacts", gigId, user?.id],
    queryFn: () => listGigContacts(gigId!),
    enabled: !!gigId && !!user,
  });

  // Combine database contacts + local drafts (for existing gigs), or just pending contacts (for new gigs)
  const contacts: (GigContact | PendingContact)[] = gigId
    ? [...dbContacts, ...drafts]
    : pendingContacts;

  // Helper: check if a contact ID belongs to a local draft
  const isDraft = (id: string) => drafts.some((d) => d.id === id);

  // Create mutation (only for database mode — used to persist drafts)
  const createMutation = useMutation({
    mutationFn: ({
      draftId,
      ...data
    }: Parameters<typeof createGigContact>[0] & { draftId: string }) =>
      createGigContact(data),
    onSuccess: (_result, variables) => {
      setDrafts((prev) => prev.filter((d) => d.id !== variables.draftId));
      setPersistingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.draftId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["gig-contacts", gigId] });
      queryClient.invalidateQueries({ queryKey: ["gig-pack-full", gigId] });
    },
    onError: (_err, variables) => {
      setPersistingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.draftId);
        return next;
      });
      toast.error("Failed to add contact");
    },
  });

  // Update mutation (only for database mode)
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof updateGigContact>[1];
    }) => updateGigContact(id, data),
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

  /** Try to persist a draft to the DB. Only works if it has phone or email. */
  const tryPersistDraft = useCallback(
    (id: string) => {
      if (!gigId || persistingIds.has(id)) return;

      setDrafts((prev) => {
        const draft = prev.find((d) => d.id === id);
        if (!draft || (!draft.phone && !draft.email)) return prev;

        // Persist this draft
        setPersistingIds((p) => new Set(p).add(id));
        createMutation.mutate({
          draftId: draft.id,
          gigId,
          label: draft.label,
          name: draft.name,
          phone: draft.phone,
          email: draft.email,
          sourceType: draft.sourceType,
          sourceId: draft.sourceId,
          sortOrder: dbContacts.length + prev.indexOf(draft),
        });

        return prev;
      });
    },
    [gigId, persistingIds, createMutation, dbContacts.length]
  );

  const handleAddContact = () => {
    if (gigId) {
      // Database mode: add as local draft (not saved to DB yet)
      const newDraft: PendingContact = {
        id: crypto.randomUUID(),
        label: "",
        name: "",
        phone: null,
        email: null,
        sourceType: "manual",
        sourceId: null,
      };
      setDrafts((prev) => [...prev, newDraft]);
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
      if (isDraft(id)) {
        // Update the local draft only — persistence happens on blur
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, [field]: value || null } : d
          )
        );
      } else {
        // Already in DB: update directly
        updateMutation.mutate({
          id,
          data: { [field]: value || null },
        });
      }
    } else {
      // Local mode: update pending contacts
      onPendingContactsChange?.(
        pendingContacts.map((c) =>
          c.id === id ? { ...c, [field]: value || null } : c
        )
      );
    }
  };

  const handleBlurContact = (id: string) => {
    if (gigId && isDraft(id)) {
      tryPersistDraft(id);
    }
  };

  const handleDeleteContact = (id: string) => {
    if (gigId) {
      if (isDraft(id)) {
        // Just remove the local draft
        setDrafts((prev) => prev.filter((d) => d.id !== id));
      } else {
        // Database mode: delete from DB
        deleteMutation.mutate(id);
      }
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
          onUpdate={(field, value) =>
            handleUpdateContact(contact.id, field, value)
          }
          onBlur={() => handleBlurContact(contact.id)}
          onDelete={() => handleDeleteContact(contact.id)}
          disabled={
            disabled ||
            deleteMutation.isPending ||
            persistingIds.has(contact.id)
          }
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
  onUpdate: (
    field: "label" | "name" | "phone" | "email",
    value: string
  ) => void;
  onBlur: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

function ContactRow({
  contact,
  onUpdate,
  onBlur,
  onDelete,
  disabled,
}: ContactRowProps) {
  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      {/* Row 1: Name and Role */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <User className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={contact.name}
            onChange={(e) => onUpdate("name", e.target.value)}
            onBlur={onBlur}
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
            onBlur={onBlur}
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
            onBlur={onBlur}
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
            onBlur={onBlur}
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
