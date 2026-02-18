"use client";

import { useState } from "react";
import { useContactAvatarLookup } from "@/hooks/use-contact-avatar-lookup";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { RoleSelect } from "@/components/gigpack/ui/role-select";
import { RolePaymentPopoverContent } from "@/components/roles/role-payment-popover";
import { cn } from "@/lib/utils";
import { X, Banknote } from "lucide-react";
import { InvitationStatusIcon } from "@/components/gigpack/ui/invitation-status-icon";

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


interface LineupMemberRowProps {
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  instrument?: string | null;
  invitationStatus?: string;
  avatarUrl?: string | null;
  gigRoleId?: string;
  bandId?: string | null;
  hasPayment?: boolean;
  onRoleChange: (role: string) => void;
  onRemove: () => void;
  onPaymentSaved?: () => void;
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
  gigRoleId,
  bandId,
  hasPayment = false,
  onRoleChange,
  onRemove,
  onPaymentSaved,
  disabled = false,
}: LineupMemberRowProps) {
  const [paymentOpen, setPaymentOpen] = useState(false);

  // Look up avatar for the name if not provided via props
  const { avatarUrl: lookupAvatarUrl } = useContactAvatarLookup(name);
  const avatarUrl = propAvatarUrl || lookupAvatarUrl;

  // Determine secondary text (email > phone > instrument)
  const secondaryText = email || phone || instrument || null;

  return (
    <div className="group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Avatar with status icon */}
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-sm bg-primary/10 text-primary">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <InvitationStatusIcon
          status={invitationStatus}
          size="sm"
          className="absolute -bottom-0.5 -right-0.5 border-2 border-background"
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
      <div className="shrink-0 w-40">
        <RoleSelect
          value={role}
          onChange={onRoleChange}
          disabled={disabled}
          className="h-8"
        />
      </div>

      {/* Payment popover — only for saved roles */}
      {gigRoleId && (
        <Popover open={paymentOpen} onOpenChange={setPaymentOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 shrink-0",
                hasPayment
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <Banknote className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          {paymentOpen && (
            <RolePaymentPopoverContent
              roleId={gigRoleId}
              bandId={bandId ?? null}
              onSaved={() => {
                onPaymentSaved?.();
                setPaymentOpen(false);
              }}
              onClose={() => setPaymentOpen(false)}
            />
          )}
        </Popover>
      )}

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
