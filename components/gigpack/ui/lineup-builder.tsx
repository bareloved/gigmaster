"use client";

import { useState } from "react";
import {
  LineupSearchInput,
  type SelectedMember,
  type CurrentLineupMember,
} from "./lineup-search-input";
import { LineupMemberRow } from "./lineup-member-row";
import type { LocalPaymentData } from "@/components/roles/role-payment-popover";
import { BulkPaymentPopoverContent } from "@/components/roles/bulk-payment-popover";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Users, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Generic lineup member type that works with both lib/types/gigpack and lib/gigpack/types */
interface LineupMemberBase {
  name?: string;
  role?: string | null;
  notes?: string;
  userId?: string;
  linkedUserId?: string | null;
  contactId?: string;
  invitationStatus?: string;
  gigRoleId?: string;
  agreedFee?: number | null;
  currency?: string | null;
  paymentMethod?: string | null;
  expectedPaymentDate?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface LineupBuilderProps {
  /** Current lineup members */
  lineup: LineupMemberBase[];
  /** Callback when a member is added from search */
  onAddMember: (member: SelectedMember) => void;
  /** Callback when a member's role is updated */
  onUpdateMember: (index: number, field: "role", value: string) => void;
  /** Callback when a member is removed */
  onRemoveMember: (index: number) => void;
  /** Search placeholder text */
  placeholder?: string;
  /** Whether the builder is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
  /** Band ID for payment defaults lookup */
  bandId?: string | null;
  /** Gig ID for bulk payment */
  gigId?: string;
  /** Callback when payment is saved on a role */
  onPaymentSaved?: () => void;
  /** Callback when payment is set locally (before gig is saved) */
  onLocalPaymentSave?: (index: number, data: LocalPaymentData) => void;
}

export function LineupBuilder({
  lineup,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
  placeholder = "Search musicians...",
  disabled = false,
  className,
  bandId,
  gigId,
  onPaymentSaved,
  onLocalPaymentSave,
}: LineupBuilderProps) {
  const [bulkPaymentOpen, setBulkPaymentOpen] = useState(false);

  // Convert lineup to CurrentLineupMember format for duplicate filtering
  const currentLineup: CurrentLineupMember[] = lineup.map((member) => ({
    name: member.name,
    contactId: member.contactId,
    userId: member.userId,
    linkedUserId: member.linkedUserId,
  }));

  // Filter out empty members for display (members without names)
  const displayLineup = lineup.filter((member) => member.name && member.name.trim());
  const hasSavedRoles = lineup.some((m) => m.gigRoleId);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search input at the top */}
      <LineupSearchInput
        onSelectMember={onAddMember}
        currentLineup={currentLineup}
        placeholder={placeholder}
        disabled={disabled}
      />

      {/* List of members */}
      {displayLineup.length > 0 ? (
        <div className="rounded-lg border bg-card">
          {lineup.map((member, index) => {
            // Skip empty members
            if (!member.name || !member.name.trim()) return null;

            return (
              <LineupMemberRow
                key={`${member.name}-${member.contactId || member.userId || index}`}
                name={member.name}
                role={member.role || ""}
                email={member.email}
                phone={member.phone}
                invitationStatus={member.invitationStatus}
                gigRoleId={member.gigRoleId}
                bandId={bandId}
                hasPayment={member.agreedFee != null}
                localPaymentData={!member.gigRoleId && member.agreedFee != null ? {
                  agreedFee: member.agreedFee ?? null,
                  currency: member.currency || 'ILS',
                  paymentMethod: member.paymentMethod || null,
                  expectedPaymentDate: member.expectedPaymentDate || null,
                } : undefined}
                onRoleChange={(role) => onUpdateMember(index, "role", role)}
                onRemove={() => onRemoveMember(index)}
                onPaymentSaved={onPaymentSaved}
                onLocalPaymentSave={onLocalPaymentSave ? (data) => onLocalPaymentSave(index, data) : undefined}
                disabled={disabled}
              />
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-8 px-4 rounded-lg border border-dashed text-center">
          <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            No musicians added yet
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Search above to add musicians — they can receive Google Calendar invites automatically
          </p>
        </div>
      )}

      {/* Bulk payment button — below the list */}
      {hasSavedRoles && gigId && (
        <div className="flex justify-end">
          <Popover open={bulkPaymentOpen} onOpenChange={setBulkPaymentOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
              >
                <Banknote className="h-3.5 w-3.5" />
                Set Payment for All
              </Button>
            </PopoverTrigger>
            {bulkPaymentOpen && (
              <BulkPaymentPopoverContent
                gigId={gigId}
                bandId={bandId ?? null}
                onSaved={() => {
                  onPaymentSaved?.();
                  setBulkPaymentOpen(false);
                }}
                onClose={() => setBulkPaymentOpen(false)}
              />
            )}
          </Popover>
        </div>
      )}
    </div>
  );
}
