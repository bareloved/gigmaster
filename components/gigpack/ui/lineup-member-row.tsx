"use client";

import { useContactAvatarLookup } from "@/hooks/use-contact-avatar-lookup";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RoleSelect } from "@/components/gigpack/ui/role-select";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

/**
 * Get initials from a name (first 2 characters of first 2 words)
 */
function getInitials(name: string): string {
  if (!name.trim()) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Get status badge color based on invitation status
 */
function getStatusColor(status?: string): string {
  if (!status) return "bg-gray-400"; // Not invited yet

  switch (status) {
    case "accepted":
      return "bg-green-500";
    case "invited":
    case "pending":
      return "bg-yellow-500";
    case "declined":
      return "bg-red-500";
    case "needs_sub":
      return "bg-orange-500";
    case "tentative":
      return "bg-yellow-400";
    default:
      return "bg-gray-400";
  }
}

interface LineupMemberRowProps {
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  instrument?: string | null;
  invitationStatus?: string;
  avatarUrl?: string | null;
  onRoleChange: (role: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function LineupMemberRow({
  name,
  role,
  email,
  phone,
  instrument,
  invitationStatus,
  avatarUrl: propAvatarUrl,
  onRoleChange,
  onRemove,
  disabled = false,
}: LineupMemberRowProps) {
  // Look up avatar for the name if not provided via props
  const { avatarUrl: lookupAvatarUrl } = useContactAvatarLookup(name);
  const avatarUrl = propAvatarUrl || lookupAvatarUrl;

  // Determine secondary text (email > phone > instrument)
  const secondaryText = email || phone || instrument || null;

  // Status badge color
  const statusColor = getStatusColor(invitationStatus);

  return (
    <div className="group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Avatar with status badge */}
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-sm bg-primary/10 text-primary">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        {/* Status badge */}
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
            statusColor
          )}
          title={invitationStatus || "Not invited"}
        />
      </div>

      {/* Name and secondary info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{name}</p>
        {secondaryText && (
          <p className="text-xs text-muted-foreground truncate">{secondaryText}</p>
        )}
      </div>

      {/* Role dropdown */}
      <div className="shrink-0 w-28">
        <RoleSelect
          value={role}
          onChange={onRoleChange}
          disabled={disabled}
          className="h-8"
        />
      </div>

      {/* Remove button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disabled}
        className={cn(
          "h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive",
          "md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        )}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
