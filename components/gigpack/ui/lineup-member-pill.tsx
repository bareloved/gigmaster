"use client";

import * as React from "react";
import { useState } from "react";
import { useContactAvatarLookup } from "@/hooks/use-contact-avatar-lookup";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleSelect } from "@/components/gigpack/ui/role-select";
import { cn } from "@/lib/utils";
import {
  X,
  Pencil,
  Check,
  Guitar,
  Piano,
  Mic2,
  Music,
  Drum,
  Radio,
  type LucideIcon,
} from "lucide-react";

/**
 * Map role names to instrument icons
 */
function getInstrumentIcon(role: string): LucideIcon | null {
  const roleLower = role.toLowerCase();

  // Guitar family
  if (roleLower.includes("guitar") || roleLower.includes("bass")) {
    return Guitar;
  }

  // Keys/Piano
  if (roleLower.includes("key") || roleLower.includes("piano") || roleLower.includes("organ")) {
    return Piano;
  }

  // Vocals
  if (roleLower.includes("vocal") || roleLower.includes("singer") || roleLower.includes("lead")) {
    return Mic2;
  }

  // Drums/Percussion
  if (roleLower.includes("drum") || roleLower.includes("percussion")) {
    return Drum;
  }

  // DJ
  if (roleLower.includes("dj") || roleLower.includes("track")) {
    return Radio;
  }

  // Wind instruments, strings, and others get generic music icon
  if (
    roleLower.includes("sax") ||
    roleLower.includes("trumpet") ||
    roleLower.includes("trombone") ||
    roleLower.includes("violin") ||
    roleLower.includes("cello") ||
    roleLower.includes("flute") ||
    roleLower.includes("clarinet")
  ) {
    return Music;
  }

  // MD / Band leader
  if (roleLower.includes("md") || roleLower.includes("leader") || roleLower.includes("director")) {
    return Mic2;
  }

  return null;
}

interface LineupMemberPillProps {
  name: string;
  role: string;
  notes?: string;
  onNameChange: (name: string) => void;
  onRoleChange: (role: string) => void;
  onNotesChange: (notes: string) => void;
  onRemove: () => void;
  disabled?: boolean;
  showRemove?: boolean;
}

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

export function LineupMemberPill({
  name,
  role,
  notes = "",
  onNameChange,
  onRoleChange,
  onNotesChange,
  onRemove,
  disabled = false,
  showRemove = true,
}: LineupMemberPillProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(name);

  // Look up avatar for the name
  const { avatarUrl, isLinkedUser, primaryInstrument } = useContactAvatarLookup(name);

  // Show empty state inputs when no name
  const hasName = name.trim().length > 0;

  // Handle edit mode
  const handleStartEdit = () => {
    if (disabled) return;
    setEditingName(name);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onNameChange(editingName);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditingName(name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  // Empty state - show inputs for new member
  if (!hasName && !isEditing) {
    return (
      <div className="flex gap-2 items-start group">
        <div className="flex-1 flex flex-col md:flex-row gap-2">
          <div className="md:flex-[2]">
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          <div className="md:flex-[1.5]">
            <RoleSelect
              value={role}
              onChange={onRoleChange}
              disabled={disabled}
            />
          </div>
          <div className="md:flex-[1.5]">
            <Input
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
        </div>
        {showRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={disabled}
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Pill view with avatar
  return (
    <div className="flex gap-2 items-center group">
      <div className="flex-1 flex flex-col md:flex-row gap-2 items-center">
        {/* Avatar + Name Pill */}
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border bg-muted/50 pl-1 pr-3 py-1 md:flex-[2]",
            !disabled && "hover:bg-accent/50 cursor-pointer transition-colors",
            isEditing && "bg-accent/50"
          )}
          onClick={() => !isEditing && handleStartEdit()}
        >
          {/* Avatar */}
          <Avatar className="h-7 w-7">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>

          {/* Name - editable or display */}
          {isEditing ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className="h-6 text-sm border-none bg-transparent p-0 focus-visible:ring-0"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveEdit();
                }}
                className="h-5 w-5"
              >
                <Check className="h-3 w-3 text-green-600" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
                className="h-5 w-5"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-medium text-sm truncate">{name}</span>
              {isLinkedUser && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Active
                </Badge>
              )}
              {!disabled && (
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
              )}
            </div>
          )}
        </div>

        {/* Role Badge/Select */}
        <div className="md:flex-[1.5]">
          {role ? (
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm",
                "bg-secondary/80 text-secondary-foreground",
                !disabled && "hover:bg-secondary cursor-pointer transition-colors"
              )}
              onClick={() => {
                // Could open role editor, for now just use RoleSelect
              }}
            >
              <RoleSelect
                value={role}
                onChange={onRoleChange}
                disabled={disabled}
                className="border-none bg-transparent shadow-none h-auto p-0"
              />
            </div>
          ) : (
            <RoleSelect
              value={role}
              onChange={onRoleChange}
              disabled={disabled}
            />
          )}
        </div>

        {/* Instrument Icon */}
        {role && (() => {
          const IconComponent = getInstrumentIcon(role);
          return IconComponent ? (
            <div className="hidden md:flex items-center justify-center w-8 shrink-0">
              <IconComponent className="h-5 w-5 text-muted-foreground/60" />
            </div>
          ) : null;
        })()}

        {/* Notes input */}
        <div className="md:flex-[1.5]">
          <Input
            placeholder="Notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Remove button */}
      {showRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={disabled}
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
