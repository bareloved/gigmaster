"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/lib/providers/user-provider";
import { searchSystemUsers } from "@/lib/api/users";
import { searchContacts } from "@/lib/api/musician-contacts";
import { getRecentMusicians, type RecentMusician } from "@/lib/api/gig-roles";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Member data returned from search selection */
export interface SelectedMember {
  name: string;
  role: string;
  /** System user ID if selecting from Ensemble Users */
  userId?: string;
  /** Linked user ID if contact is linked to a user account */
  linkedUserId?: string | null;
  /** Contact ID if selecting from My Circle */
  contactId?: string;
  /** Email from contact or user profile */
  email?: string | null;
  /** Phone from contact */
  phone?: string | null;
}

/** Current lineup member info for filtering */
export interface CurrentLineupMember {
  name?: string;
  contactId?: string;
  userId?: string;
  linkedUserId?: string | null;
}

interface LineupSearchInputProps {
  /** Callback when a member is selected */
  onSelectMember: (member: SelectedMember) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the search is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
  /** Current lineup members to filter out from suggestions */
  currentLineup?: CurrentLineupMember[];
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

export function LineupSearchInput({
  onSelectMember,
  placeholder = "Search musicians...",
  disabled = false,
  className,
  currentLineup = [],
}: LineupSearchInputProps) {
  const { user } = useUser();
  const [searchValue, setSearchValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch recent musicians from gig history
  const { data: recentMusicians = [] } = useQuery({
    queryKey: ["recent-musicians", user?.id],
    queryFn: () => getRecentMusicians(10), // Fetch 10 for buffer, display 3 at a time
    enabled: !!user && isOpen,
    staleTime: 2 * 60 * 1000,
  });

  // Filter recent musicians to exclude those already in lineup, show only 3 at a time
  const filteredRecentMusicians = useMemo(() => {
    return recentMusicians.filter((musician) => {
      const isInLineup = currentLineup.some(
        (member) =>
          (member.contactId && member.contactId === musician.contactId) ||
          (member.userId && member.userId === musician.userId) ||
          (member.linkedUserId && member.linkedUserId === musician.linkedUserId) ||
          (member.name && member.name.toLowerCase() === musician.name.toLowerCase())
      );
      return !isInLineup;
    }).slice(0, 3); // Only show 3 at a time
  }, [recentMusicians, currentLineup]);

  // Search My Circle
  const { data: circleResults = [] } = useQuery({
    queryKey: ["contacts-search", user?.id, searchValue],
    queryFn: () => searchContacts(user!.id, searchValue),
    enabled: !!user && searchValue.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  // Filter circle results to exclude those already in lineup
  const filteredCircleResults = useMemo(() => {
    return circleResults.filter((contact) => {
      const isInLineup = currentLineup.some(
        (member) =>
          (member.contactId && member.contactId === contact.id) ||
          (member.linkedUserId && member.linkedUserId === contact.linked_user_id) ||
          (member.name && member.name.toLowerCase() === contact.contact_name.toLowerCase())
      );
      return !isInLineup;
    });
  }, [circleResults, currentLineup]);

  // Search System Users
  const { data: systemUsers = [] } = useQuery({
    queryKey: ["system-users-search", searchValue],
    queryFn: () => searchSystemUsers(searchValue),
    enabled: searchValue.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  // Filter out current user, contacts already in circle, and those already in lineup
  const filteredSystemUsers = useMemo(() => {
    return systemUsers.filter((su) => {
      // Exclude current user
      if (su.id === user?.id) return false;
      // Exclude users already in circle results
      if (filteredCircleResults.some((cr) => cr.linked_user_id === su.id)) return false;
      // Exclude users already in lineup
      const isInLineup = currentLineup.some(
        (member) =>
          (member.userId && member.userId === su.id) ||
          (member.linkedUserId && member.linkedUserId === su.id) ||
          (member.name && su.name && member.name.toLowerCase() === su.name.toLowerCase())
      );
      return !isInLineup;
    });
  }, [systemUsers, user?.id, filteredCircleResults, currentLineup]);

  const hasSearchResults = filteredCircleResults.length > 0 || filteredSystemUsers.length > 0;
  const showRecentSection = searchValue.length < 2 && filteredRecentMusicians.length > 0;

  const handleSelectContact = (contact: typeof circleResults[0]) => {
    onSelectMember({
      name: contact.contact_name,
      role: contact.default_roles?.[0] || contact.primary_instrument || "",
      contactId: contact.id,
      linkedUserId: contact.linked_user_id,
      email: contact.email,
      phone: contact.phone,
    });
    setSearchValue("");
    // Keep focus on input for continuous adding
    inputRef.current?.focus();
  };

  const handleSelectRecentMusician = (musician: RecentMusician) => {
    onSelectMember({
      name: musician.name,
      role: musician.role,
      userId: musician.userId,
      contactId: musician.contactId,
      linkedUserId: musician.linkedUserId,
      email: musician.email,
      phone: musician.phone,
    });
    setSearchValue("");
    inputRef.current?.focus();
  };

  const handleSelectSystemUser = (systemUser: typeof systemUsers[0]) => {
    onSelectMember({
      name: systemUser.name || "Unknown",
      role: systemUser.main_instrument || "",
      userId: systemUser.id,
      email: systemUser.email,
    });
    setSearchValue("");
    inputRef.current?.focus();
  };

  const handleAddManual = () => {
    if (searchValue.trim()) {
      onSelectMember({
        name: searchValue.trim(),
        role: "",
      });
      setSearchValue("");
      inputRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Command shouldFilter={false} className="border rounded-lg">
        <div className="flex items-center border-b px-3">
          <CommandInput
            ref={inputRef}
            placeholder={placeholder}
            value={searchValue}
            onValueChange={setSearchValue}
            onFocus={() => setIsOpen(true)}
            disabled={disabled}
            className="border-0 focus:ring-0"
          />
        </div>

        {isOpen && (
          <CommandList className="max-h-[300px]">
            {/* Recent Musicians Section - shown when not searching */}
            {showRecentSection && (
              <CommandGroup heading="Recent">
                {filteredRecentMusicians.map((musician, index) => (
                  <CommandItem
                    key={`recent-${musician.name}-${index}`}
                    value={`recent-${musician.name}-${index}`}
                    onSelect={() => handleSelectRecentMusician(musician)}
                    className="flex items-center gap-3 py-2 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-muted">
                        {getInitials(musician.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{musician.name}</p>
                      {musician.role && (
                        <p className="text-xs text-muted-foreground truncate">
                          {musician.role}
                        </p>
                      )}
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* No input yet - show prompt */}
            {searchValue.length < 2 && !showRecentSection && (
              <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                Start typing to search musicians...
              </CommandEmpty>
            )}

            {/* No search results */}
            {searchValue.length >= 2 && !hasSearchResults && (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">No matches found</p>
                <CommandItem
                  onSelect={handleAddManual}
                  className="flex items-center justify-center gap-2 cursor-pointer mx-2"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add &quot;{searchValue}&quot; as new member</span>
                </CommandItem>
              </div>
            )}

            {/* My Circle Results */}
            {filteredCircleResults.length > 0 && (
              <CommandGroup heading="My Circle">
                {filteredCircleResults.map((contact) => {
                  const linkedUser = systemUsers.find(su => su.id === contact.linked_user_id);
                  return (
                    <CommandItem
                      key={contact.id}
                      value={contact.id}
                      onSelect={() => handleSelectContact(contact)}
                      className="flex items-center gap-3 py-2 cursor-pointer"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={linkedUser?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-muted">
                          {getInitials(contact.contact_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{contact.contact_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.email || contact.primary_instrument || ""}
                        </p>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {/* System Users Results */}
            {filteredSystemUsers.length > 0 && (
              <CommandGroup heading="GigMaster Users">
                {filteredSystemUsers.map((systemUser) => (
                  <CommandItem
                    key={systemUser.id}
                    value={systemUser.id}
                    onSelect={() => handleSelectSystemUser(systemUser)}
                    className="flex items-center gap-3 py-2 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={systemUser.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-muted">
                        {systemUser.name ? getInitials(systemUser.name) : "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {systemUser.name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {systemUser.email || systemUser.main_instrument || ""}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Option to add manually when there are results */}
            {hasSearchResults && searchValue.trim() && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleAddManual}
                  className="flex items-center gap-3 py-2 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add &quot;{searchValue}&quot; as new member</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        )}
      </Command>
    </div>
  );
}
