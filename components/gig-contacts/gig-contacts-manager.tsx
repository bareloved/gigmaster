"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Phone, Mail, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/providers/user-provider";
import { toast } from "sonner";
import {
  listGigContacts,
  createGigContact,
  deleteGigContact,
} from "@/lib/api/gig-contacts";
import { GigContactForm } from "./gig-contact-form";
import type { GigContact, GigContactInsert, MusicianContact } from "@/lib/types/shared";
import type { LineupMember } from "@/lib/gigpack/types";

interface GigContactsManagerProps {
  gigId: string;
  lineup?: LineupMember[];
  disabled?: boolean;
}

export function GigContactsManager({
  gigId,
  lineup = [],
  disabled = false,
}: GigContactsManagerProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);

  // Fetch contacts for this gig
  const { data: gigContacts = [], isLoading } = useQuery({
    queryKey: ["gig-contacts", gigId, user?.id],
    queryFn: () => listGigContacts(gigId),
    enabled: !!gigId && !!user,
  });

  // Fetch My Circle contacts for the form
  const { data: myCircleContacts = [] } = useQuery<MusicianContact[]>({
    queryKey: ["musician-contacts", user?.id],
    queryFn: async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("musician_contacts")
        .select("*")
        .order("contact_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: GigContactInsert) => createGigContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gig-contacts", gigId] });
      queryClient.invalidateQueries({ queryKey: ["gig-pack-full", gigId] });
      toast.success("Contact added");
    },
    onError: () => {
      toast.error("Failed to add contact");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGigContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gig-contacts", gigId] });
      queryClient.invalidateQueries({ queryKey: ["gig-pack-full", gigId] });
      toast.success("Contact removed");
    },
    onError: () => {
      toast.error("Failed to remove contact");
    },
  });

  const handleAddContact = (
    data: Omit<GigContactInsert, "gigId" | "sortOrder">
  ) => {
    createMutation.mutate({
      ...data,
      gigId,
      sortOrder: gigContacts.length,
    });
  };

  const handleDeleteContact = (id: string) => {
    if (window.confirm("Remove this contact?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Gig Contacts
        </label>
        <p className="text-xs text-muted-foreground">
          Who should musicians contact about this gig?
        </p>
      </div>

      {/* Contact List */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : gigContacts.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2">
          No contacts added yet
        </div>
      ) : (
        <div className="space-y-2">
          {gigContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onDelete={() => handleDeleteContact(contact.id)}
              disabled={disabled || deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Add Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setFormOpen(true)}
        disabled={disabled || createMutation.isPending}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Contact
      </Button>

      {/* Form Dialog */}
      <GigContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleAddContact}
        lineup={lineup}
        contacts={myCircleContacts}
      />
    </div>
  );
}

interface ContactCardProps {
  contact: GigContact;
  onDelete: () => void;
  disabled?: boolean;
}

function ContactCard({ contact, onDelete, disabled }: ContactCardProps) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-md border bg-background">
      <div className="text-muted-foreground/40">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{contact.label}</div>
        <div className="text-sm text-muted-foreground">{contact.name}</div>
        <div className="flex flex-wrap gap-2 mt-1">
          {contact.phone && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {contact.phone}
            </span>
          )}
          {contact.email && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              {contact.email}
            </span>
          )}
        </div>
        {contact.sourceType !== "manual" && (
          <div className="text-xs text-muted-foreground/60 mt-1">
            From {contact.sourceType === "lineup" ? "lineup" : "My Circle"}
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={disabled}
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
