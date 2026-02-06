"use client";

import {
  LineupSearchInput,
  type SelectedMember,
  type CurrentLineupMember,
} from "./lineup-search-input";
import { LineupMemberRow } from "./lineup-member-row";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

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
}

export function LineupBuilder({
  lineup,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
  placeholder = "Search musicians...",
  disabled = false,
  className,
}: LineupBuilderProps) {
  // Convert lineup to CurrentLineupMember format for duplicate filtering
  const currentLineup: CurrentLineupMember[] = lineup.map((member) => ({
    name: member.name,
    contactId: member.contactId,
    userId: member.userId,
    linkedUserId: member.linkedUserId,
  }));

  // Filter out empty members for display (members without names)
  const displayLineup = lineup.filter((member) => member.name && member.name.trim());

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
                onRoleChange={(role) => onUpdateMember(index, "role", role)}
                onRemove={() => onRemoveMember(index)}
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
            Search above to add musicians to the lineup
          </p>
        </div>
      )}
    </div>
  );
}
