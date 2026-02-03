# Gig Contacts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add gig contacts feature so musicians know who to contact about gig questions.

**Architecture:** New `gig_contacts` table with RLS, API layer following existing patterns, "Need Help?" section in gig pack display, contacts management in gig editor panel.

**Tech Stack:** Supabase (Postgres + RLS), TypeScript, React, TanStack Query, shadcn/ui

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260203000000_add_gig_contacts.sql`

**Step 1: Write the migration SQL**

```sql
-- Create gig_contacts table
CREATE TABLE IF NOT EXISTS gig_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  label text NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'lineup', 'contact')),
  source_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT phone_or_email_required CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- Index for gig_id lookups
CREATE INDEX idx_gig_contacts_gig_id ON gig_contacts(gig_id);

-- Enable RLS
ALTER TABLE gig_contacts ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone who can view the gig can read contacts
CREATE POLICY "gig_contacts_select_policy" ON gig_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = gig_contacts.gig_id
      AND (
        gigs.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM gig_roles
          WHERE gig_roles.gig_id = gigs.id
          AND gig_roles.musician_id = auth.uid()
        )
      )
    )
  );

-- RLS: Only gig owner can insert
CREATE POLICY "gig_contacts_insert_policy" ON gig_contacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = gig_contacts.gig_id
      AND gigs.owner_id = auth.uid()
    )
  );

-- RLS: Only gig owner can update
CREATE POLICY "gig_contacts_update_policy" ON gig_contacts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = gig_contacts.gig_id
      AND gigs.owner_id = auth.uid()
    )
  );

-- RLS: Only gig owner can delete
CREATE POLICY "gig_contacts_delete_policy" ON gig_contacts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = gig_contacts.gig_id
      AND gigs.owner_id = auth.uid()
    )
  );
```

**Step 2: Apply migration via Supabase Dashboard**

1. Go to Supabase Dashboard → SQL Editor
2. Paste the migration SQL
3. Run it

**Step 3: Verify table creation**

Run in SQL Editor:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'gig_contacts';
```

Expected: See all columns (id, gig_id, label, name, phone, email, source_type, source_id, sort_order, created_at)

**Step 4: Verify RLS policies**

Run in SQL Editor:
```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'gig_contacts';
```

Expected: 4 policies (select, insert, update, delete)

**Step 5: Commit migration file**

```bash
git add supabase/migrations/20260203000000_add_gig_contacts.sql
git commit -m "feat(db): add gig_contacts table with RLS

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add TypeScript Types

**Files:**
- Modify: `lib/types/shared.ts` (add after line ~400, after SystemUser interface)
- Modify: `lib/types/gigpack.ts` (add contacts to GigPack interface)

**Step 1: Add GigContact types to shared.ts**

Add after the `SystemUser` interface (around line 400):

```typescript
/**
 * Gig Contact - People musicians can contact about the gig
 */
export interface GigContact {
  id: string;
  gigId: string;
  label: string;
  name: string;
  phone: string | null;
  email: string | null;
  sourceType: 'manual' | 'lineup' | 'contact';
  sourceId: string | null;
  sortOrder: number;
  createdAt: string;
}

export type GigContactInsert = Omit<GigContact, 'id' | 'createdAt'>;
export type GigContactUpdate = Partial<Omit<GigContact, 'id' | 'gigId' | 'createdAt'>>;
```

**Step 2: Add contacts to GigPack interface in gigpack.ts**

Find the `GigPack` interface (around line 86) and add after `schedule`:

```typescript
  // Gig contacts - people musicians can reach out to
  contacts: GigContact[] | null;
```

Also add the import at the top of the file:

```typescript
import type { GigContact } from '@/lib/types/shared';
```

**Step 3: Run TypeScript check**

Run: `npm run check`
Expected: No errors related to GigContact types

**Step 4: Commit**

```bash
git add lib/types/shared.ts lib/types/gigpack.ts
git commit -m "feat(types): add GigContact types

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create API Functions

**Files:**
- Create: `lib/api/gig-contacts.ts`

**Step 1: Create the API file**

```typescript
import { createClient } from '@/lib/supabase/client';
import type { GigContact, GigContactInsert, GigContactUpdate } from '@/lib/types/shared';

/**
 * List all contacts for a gig
 */
export async function listGigContacts(gigId: string): Promise<GigContact[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('gig_contacts')
    .select('*')
    .eq('gig_id', gigId)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    gigId: row.gig_id,
    label: row.label,
    name: row.name,
    phone: row.phone,
    email: row.email,
    sourceType: row.source_type as GigContact['sourceType'],
    sourceId: row.source_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }));
}

/**
 * Create a new contact for a gig
 */
export async function createGigContact(data: GigContactInsert): Promise<GigContact> {
  const supabase = createClient();

  const { data: row, error } = await supabase
    .from('gig_contacts')
    .insert({
      gig_id: data.gigId,
      label: data.label,
      name: data.name,
      phone: data.phone,
      email: data.email,
      source_type: data.sourceType,
      source_id: data.sourceId,
      sort_order: data.sortOrder,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: row.id,
    gigId: row.gig_id,
    label: row.label,
    name: row.name,
    phone: row.phone,
    email: row.email,
    sourceType: row.source_type as GigContact['sourceType'],
    sourceId: row.source_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

/**
 * Update an existing contact
 */
export async function updateGigContact(id: string, data: GigContactUpdate): Promise<GigContact> {
  const supabase = createClient();

  const updateData: Record<string, unknown> = {};
  if (data.label !== undefined) updateData.label = data.label;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.sourceType !== undefined) updateData.source_type = data.sourceType;
  if (data.sourceId !== undefined) updateData.source_id = data.sourceId;
  if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

  const { data: row, error } = await supabase
    .from('gig_contacts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: row.id,
    gigId: row.gig_id,
    label: row.label,
    name: row.name,
    phone: row.phone,
    email: row.email,
    sourceType: row.source_type as GigContact['sourceType'],
    sourceId: row.source_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

/**
 * Delete a contact
 */
export async function deleteGigContact(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('gig_contacts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Reorder contacts for a gig
 */
export async function reorderGigContacts(gigId: string, orderedIds: string[]): Promise<void> {
  const supabase = createClient();

  // Update each contact's sort_order based on position in array
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('gig_contacts')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('gig_id', gigId)
  );

  const results = await Promise.all(updates);
  const errors = results.filter(r => r.error);
  if (errors.length > 0) throw errors[0].error;
}
```

**Step 2: Run TypeScript check**

Run: `npm run check`
Expected: No errors

**Step 3: Commit**

```bash
git add lib/api/gig-contacts.ts
git commit -m "feat(api): add gig-contacts CRUD functions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update Gig Pack Query

**Files:**
- Modify: `lib/api/gig-pack.ts`

**Step 1: Add gig_contacts to the query in getGigPackFull**

Find the query around line 64-103 and add `gig_contacts` to the select:

```typescript
gig_contacts(
  id,
  label,
  name,
  phone,
  email,
  source_type,
  source_id,
  sort_order
)
```

**Step 2: Add interface for the row type**

Add after `GigOwnerProfile` interface (around line 46):

```typescript
interface GigContactRow {
  id: string;
  label: string;
  name: string;
  phone: string | null;
  email: string | null;
  source_type: string;
  source_id: string | null;
  sort_order: number;
}
```

**Step 3: Transform contacts in the return object**

Add after materials transformation (around line 186):

```typescript
// Transform contacts
const contacts = ((gig.gig_contacts as GigContactRow[]) || [])
  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  .map((c) => ({
    id: c.id,
    gigId: gig.id,
    label: c.label,
    name: c.name,
    phone: c.phone,
    email: c.email,
    sourceType: c.source_type as 'manual' | 'lineup' | 'contact',
    sourceId: c.source_id,
    sortOrder: c.sort_order,
    createdAt: '', // Not fetched, not needed for display
  }));
```

**Step 4: Add contacts to the GigPack return object**

In the `gigPack` object construction (around line 237), add:

```typescript
contacts: contacts.length > 0 ? contacts : null,
```

**Step 5: Run TypeScript check**

Run: `npm run check`
Expected: No errors

**Step 6: Commit**

```bash
git add lib/api/gig-pack.ts
git commit -m "feat(api): include contacts in gig pack query

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create Need Help Display Component

**Files:**
- Create: `components/gigpack/need-help-section.tsx`

**Step 1: Create the component**

```typescript
"use client";

import { Phone, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GigContact } from "@/lib/types/shared";

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
```

**Step 2: Run TypeScript check**

Run: `npm run check`
Expected: No errors

**Step 3: Commit**

```bash
git add components/gigpack/need-help-section.tsx
git commit -m "feat(ui): add NeedHelpSection component for gig pack

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Add Need Help to MinimalLayout

**Files:**
- Modify: `components/gigpack/layouts/minimal-layout.tsx`

**Step 1: Import the component**

Add at the top with other imports:

```typescript
import { NeedHelpSection } from "@/components/gigpack/need-help-section";
```

**Step 2: Add the section before GigActivityWidget**

Find the `GigActivityWidget` (around line 589) and add before it:

```typescript
{/* Need Help - Contacts */}
{gigPack.contacts && gigPack.contacts.length > 0 && (
  <div className="mt-8">
    <NeedHelpSection
      contacts={gigPack.contacts}
      accentColor={accentColor}
    />
  </div>
)}
```

**Step 3: Run TypeScript check**

Run: `npm run check`
Expected: No errors (may show warning if GigPack type doesn't have contacts yet - that's from gigpack.ts)

**Step 4: Commit**

```bash
git add components/gigpack/layouts/minimal-layout.tsx
git commit -m "feat(ui): add NeedHelpSection to gig pack layout

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create Contact Form Dialog

**Files:**
- Create: `components/gig-contacts/gig-contact-form.tsx`

**Step 1: Create the form dialog component**

```typescript
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GigContact, GigContactInsert } from "@/lib/types/shared";
import type { LineupMember } from "@/lib/gigpack/types";
import type { MusicianContact } from "@/lib/types/shared";

interface GigContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<GigContactInsert, 'gigId' | 'sortOrder'>) => void;
  lineup?: LineupMember[];
  contacts?: MusicianContact[];
  editingContact?: GigContact | null;
}

interface FormData {
  label: string;
  name: string;
  phone: string;
  email: string;
}

export function GigContactForm({
  open,
  onOpenChange,
  onSubmit,
  lineup = [],
  contacts = [],
  editingContact,
}: GigContactFormProps) {
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [selectedSource, setSelectedSource] = useState<{
    type: 'lineup' | 'contact';
    id: string;
    name: string;
    phone?: string;
    email?: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: editingContact
      ? {
          label: editingContact.label,
          name: editingContact.name,
          phone: editingContact.phone || "",
          email: editingContact.email || "",
        }
      : {
          label: "",
          name: "",
          phone: "",
          email: "",
        },
  });

  const handleSourceSelect = (source: typeof selectedSource) => {
    if (!source) return;
    setSelectedSource(source);
    setValue("name", source.name);
    setValue("phone", source.phone || "");
    setValue("email", source.email || "");
  };

  const onFormSubmit = (data: FormData) => {
    if (!data.phone && !data.email) {
      return; // Validation will show error
    }

    onSubmit({
      label: data.label,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      sourceType: selectedSource?.type || "manual",
      sourceId: selectedSource?.id || null,
    });

    reset();
    setSelectedSource(null);
    setActiveTab("manual");
    onOpenChange(false);
  };

  const handleClose = () => {
    reset();
    setSelectedSource(null);
    setActiveTab("manual");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingContact ? "Edit Contact" : "Add Contact"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          {!editingContact && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="lineup">From Lineup</TabsTrigger>
                <TabsTrigger value="circle">My Circle</TabsTrigger>
                <TabsTrigger value="manual">New Person</TabsTrigger>
              </TabsList>

              <TabsContent value="lineup" className="space-y-2">
                {lineup.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No lineup members yet
                  </p>
                ) : (
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {lineup.filter(m => m.name).map((member, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          handleSourceSelect({
                            type: "lineup",
                            id: member.gigRoleId || `lineup-${idx}`,
                            name: member.name || "",
                            phone: undefined, // Lineup doesn't have phone
                            email: undefined,
                          })
                        }
                        className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent ${
                          selectedSource?.id === (member.gigRoleId || `lineup-${idx}`)
                            ? "bg-accent"
                            : ""
                        }`}
                      >
                        <div className="font-medium">{member.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {member.role}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="circle" className="space-y-2">
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No contacts in My Circle
                  </p>
                ) : (
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {contacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() =>
                          handleSourceSelect({
                            type: "contact",
                            id: contact.id,
                            name: contact.name,
                            phone: contact.phone || undefined,
                            email: contact.email || undefined,
                          })
                        }
                        className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent ${
                          selectedSource?.id === contact.id ? "bg-accent" : ""
                        }`}
                      >
                        <div className="font-medium">{contact.name}</div>
                        {(contact.phone || contact.email) && (
                          <div className="text-xs text-muted-foreground">
                            {contact.phone || contact.email}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="manual">
                {/* Form fields shown below */}
              </TabsContent>
            </Tabs>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">
                Role/Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="label"
                placeholder="e.g., Venue Manager, MD, Production"
                {...register("label", { required: "Label is required" })}
              />
              {errors.label && (
                <p className="text-sm text-destructive">{errors.label.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Contact name"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="054-555-1234"
                {...register("phone")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@example.com"
                {...register("email")}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              At least one of phone or email is required.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editingContact ? "Save Changes" : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Run TypeScript check**

Run: `npm run check`
Expected: No errors

**Step 3: Commit**

```bash
git add components/gig-contacts/gig-contact-form.tsx
git commit -m "feat(ui): add GigContactForm dialog component

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Create Contacts Manager Component

**Files:**
- Create: `components/gig-contacts/gig-contacts-manager.tsx`

**Step 1: Create the manager component**

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Phone, Mail, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/providers/user-provider";
import { useToast } from "@/hooks/use-toast";
import {
  listGigContacts,
  createGigContact,
  deleteGigContact,
} from "@/lib/api/gig-contacts";
import { listContacts } from "@/lib/api/contacts";
import { GigContactForm } from "./gig-contact-form";
import type { GigContact, GigContactInsert } from "@/lib/types/shared";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);

  // Fetch contacts for this gig
  const { data: gigContacts = [], isLoading } = useQuery({
    queryKey: ["gig-contacts", gigId, user?.id],
    queryFn: () => listGigContacts(gigId),
    enabled: !!gigId && !!user,
  });

  // Fetch My Circle contacts for the form
  const { data: myCircleContacts = [] } = useQuery({
    queryKey: ["my-circle", user?.id],
    queryFn: listContacts,
    enabled: !!user,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: GigContactInsert) => createGigContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gig-contacts", gigId] });
      queryClient.invalidateQueries({ queryKey: ["gig-pack-full", gigId] });
      toast({ title: "Contact added" });
    },
    onError: () => {
      toast({ title: "Failed to add contact", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGigContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gig-contacts", gigId] });
      queryClient.invalidateQueries({ queryKey: ["gig-pack-full", gigId] });
      toast({ title: "Contact removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove contact", variant: "destructive" });
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
      <div className="text-muted-foreground/40 cursor-grab">
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
```

**Step 2: Run TypeScript check**

Run: `npm run check`
Expected: May show error about `listContacts` import - we need to verify it exists

**Step 3: Check if listContacts exists and fix import if needed**

If `listContacts` doesn't exist in `lib/api/contacts.ts`, replace with:
```typescript
import { listMusicianContacts as listContacts } from "@/lib/api/musician-contacts";
```

**Step 4: Commit**

```bash
git add components/gig-contacts/gig-contacts-manager.tsx
git commit -m "feat(ui): add GigContactsManager component

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Integrate into Gig Editor Panel

**Files:**
- Modify: `components/gigpack/editor/gig-editor-panel.tsx`

**Step 1: Import the GigContactsManager**

Add with other imports at the top:

```typescript
import { GigContactsManager } from "@/components/gig-contacts/gig-contacts-manager";
```

**Step 2: Add a "Contacts" tab**

Find the `tabs` array (around line 977) and add after materials:

```typescript
{ id: "contacts", label: "Contacts", icon: <Users className="h-4 w-4" /> },
```

**Step 3: Add the tab content**

After the Materials tab content (around line 1810), add:

```typescript
{/* Contacts Tab */}
{activeTab === "contacts" && gigPack?.id && (
  <GigContactsManager
    gigId={gigPack.id}
    lineup={lineup}
    disabled={isLoading}
  />
)}
```

**Step 4: Run TypeScript check**

Run: `npm run check`
Expected: No errors

**Step 5: Commit**

```bash
git add components/gigpack/editor/gig-editor-panel.tsx
git commit -m "feat(ui): add Contacts tab to gig editor panel

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Test End-to-End

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test creating a contact**

1. Navigate to an existing gig edit page
2. Click the "Contacts" tab
3. Click "Add Contact"
4. Fill in: Label = "Venue Manager", Name = "Test Person", Phone = "054-555-1234"
5. Click "Add Contact"

Expected: Contact appears in the list

**Step 3: Test gig pack display**

1. Navigate to the gig pack view for the same gig
2. Scroll to bottom

Expected: "Need Help?" section shows with the contact

**Step 4: Test deletion**

1. Go back to edit page
2. Click trash icon on the contact

Expected: Contact is removed

**Step 5: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete gig contacts feature

- Database migration with RLS
- TypeScript types
- API functions for CRUD
- NeedHelpSection display component
- GigContactForm dialog
- GigContactsManager for editing
- Integration in gig editor and pack view

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

**Total tasks:** 10
**New files:** 5
**Modified files:** 5
**Database:** 1 new table with RLS

**Files created:**
1. `supabase/migrations/20260203000000_add_gig_contacts.sql`
2. `lib/api/gig-contacts.ts`
3. `components/gigpack/need-help-section.tsx`
4. `components/gig-contacts/gig-contact-form.tsx`
5. `components/gig-contacts/gig-contacts-manager.tsx`

**Files modified:**
1. `lib/types/shared.ts`
2. `lib/types/gigpack.ts`
3. `lib/api/gig-pack.ts`
4. `components/gigpack/layouts/minimal-layout.tsx`
5. `components/gigpack/editor/gig-editor-panel.tsx`
