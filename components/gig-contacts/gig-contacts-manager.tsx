"use client";

import { Trash2, Phone, Mail, User, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Simple contact shape — matches what the RPC expects
export interface GigContactItem {
  id: string;
  label: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface GigContactsManagerProps {
  value: GigContactItem[];
  onChange: (contacts: GigContactItem[]) => void;
  disabled?: boolean;
}

/**
 * Simple contacts editor — pure local state, saves with the gig form.
 * Same pattern as MaterialsEditor: value/onChange, no database calls.
 */
export function GigContactsManager({
  value: contacts,
  onChange: setContacts,
  disabled = false,
}: GigContactsManagerProps) {
  const handleAdd = () => {
    setContacts([
      ...contacts,
      {
        id: crypto.randomUUID(),
        label: "",
        name: "",
        phone: null,
        email: null,
      },
    ]);
  };

  const handleUpdate = (
    id: string,
    field: keyof Omit<GigContactItem, "id">,
    value: string
  ) => {
    setContacts(
      contacts.map((c) =>
        c.id === id ? { ...c, [field]: value || null } : c
      )
    );
  };

  const handleDelete = (id: string) => {
    setContacts(contacts.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-2">
      {contacts.map((contact) => (
        <ContactRow
          key={contact.id}
          contact={contact}
          onUpdate={(field, value) => handleUpdate(contact.id, field, value)}
          onDelete={() => handleDelete(contact.id)}
          disabled={disabled}
        />
      ))}

      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        + Add another contact
      </button>
    </div>
  );
}

interface ContactRowProps {
  contact: GigContactItem;
  onUpdate: (field: keyof Omit<GigContactItem, "id">, value: string) => void;
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
            value={contact.name || ""}
            onChange={(e) => onUpdate("name", e.target.value)}
            placeholder="Name"
            disabled={disabled}
            className="h-8 text-sm pl-7"
          />
        </div>
        <div className="flex-1 relative">
          <Tag className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={contact.label || ""}
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
            placeholder="+972 or 05..."
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
