"use client";

import { useState, useMemo } from "react";
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
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/currency";

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
}

/** Current lineup member info for filtering */
export interface CurrentLineupMember {
  name?: string;
  contactId?: string;
  userId?: string;
  linkedUserId?: string | null;
}

interface LineupMemberSearchProps {
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

export function LineupMemberSearch({
  onSelectMember,
  placeholder = "Search musicians...",
  disabled = false,
  className,
  currentLineup = [],
}: LineupMemberSearchProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Fetch recent musicians from gig history
  const { data: recentMusicians = [] } = useQuery({
    queryKey: ["recent-musicians", user?.id],
    queryFn: () => getRecentMusicians(10), // Get top 10, will filter to show 3
    enabled: !!user && open,
    staleTime: 2 * 60 * 1000,
  });

  // Filter recent musicians to exclude those already in lineup
  const filteredRecentMusicians = useMemo(() => {
    return recentMusicians.filter((musician) => {
      // Check if this musician is already in the lineup
      const isInLineup = currentLineup.some(
        (member) =>
          (member.contactId && member.contactId === musician.contactId) ||
          (member.userId && member.userId === musician.userId) ||
          (member.linkedUserId && member.linkedUserId === musician.linkedUserId) ||
          (member.name && member.name.toLowerCase() === musician.name.toLowerCase())
      );
      return !isInLineup;
    }).slice(0, 3); // Show up to 3 recent musicians
  }, [recentMusicians, currentLineup]);

  // Search My Circle
  const { data: circleResults = [] } = useQuery({
    queryKey: ["contacts-search", user?.id, searchValue],
    queryFn: () => searchContacts(user!.id, searchValue),
    enabled: !!user && searchValue.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  // Search System Users
  const { data: systemUsers = [] } = useQuery({
    queryKey: ["system-users-search", searchValue],
    queryFn: () => searchSystemUsers(searchValue),
    enabled: searchValue.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  // Filter out current user and contacts already in circle from system results
  const filteredSystemUsers = systemUsers.filter(
    (su) =>
      su.id !== user?.id &&
      !circleResults.some((cr) => cr.linked_user_id === su.id)
  );

  const hasResults = circleResults.length > 0 || filteredSystemUsers.length > 0;
  const showRecentSection = searchValue.length < 2 && filteredRecentMusicians.length > 0;

  const handleSelectContact = (contact: typeof circleResults[0]) => {
    onSelectMember({
      name: contact.contact_name,
      role: contact.default_roles?.[0] || contact.primary_instrument || "",
      contactId: contact.id,
      linkedUserId: contact.linked_user_id,
    });
    setOpen(false);
    setSearchValue("");
  };

  const handleSelectRecentMusician = (musician: RecentMusician) => {
    onSelectMember({
      name: musician.name,
      role: musician.role,
      userId: musician.userId,
      contactId: musician.contactId,
      linkedUserId: musician.linkedUserId,
    });
    setOpen(false);
    setSearchValue("");
  };

  const handleSelectSystemUser = (systemUser: typeof systemUsers[0]) => {
    onSelectMember({
      name: systemUser.name || "Unknown",
      role: systemUser.main_instrument || "",
      userId: systemUser.id,
    });
    setOpen(false);
    setSearchValue("");
  };

  const handleAddManual = () => {
    if (searchValue.trim()) {
      onSelectMember({
        name: searchValue.trim(),
        role: "",
      });
      setOpen(false);
      setSearchValue("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "text-muted-foreground hover:text-foreground justify-start",
            className
          )}
        >
          <Search className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
          {placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
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
                      <AvatarFallback className="text-xs">
                        {musician.name.substring(0, 2).toUpperCase()}
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

            {searchValue.length < 2 && !showRecentSection ? (
              <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
            ) : searchValue.length < 2 ? (
              <CommandSeparator className="my-2" />
            ) : null}

            {searchValue.length >= 2 && !hasResults ? (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">No matches found</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddManual}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Add &quot;{searchValue}&quot; as new member
                </Button>
              </div>
            ) : null}

            {/* My Circle Results */}
            {circleResults.length > 0 && (
              <>
                <CommandGroup heading="My Circle">
                  {circleResults.map((contact) => {
                    // Find matching system user to get avatar
                    const linkedUser = systemUsers.find(su => su.id === contact.linked_user_id);
                    return (
                    <CommandItem
                      key={contact.id}
                      value={contact.id}
                      onSelect={() => handleSelectContact(contact)}
                      className="flex items-center gap-3 py-3 cursor-pointer"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={linkedUser?.avatar_url || undefined} />
                        <AvatarFallback>
                          {contact.contact_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{contact.contact_name}</p>
                          {contact.status === "active_user" && (
                            <Badge variant="secondary" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {contact.primary_instrument && (
                            <span>{contact.primary_instrument}</span>
                          )}
                          {contact.default_fee && (
                            <>
                              <span>•</span>
                              <span>{formatCurrency(contact.default_fee, "ILS")}</span>
                            </>
                          )}
                          {contact.times_worked_together &&
                            contact.times_worked_together > 0 && (
                              <>
                                <span>•</span>
                                <span>{contact.times_worked_together}x</span>
                              </>
                            )}
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </CommandItem>
                  );
                  })}
                </CommandGroup>
                {filteredSystemUsers.length > 0 && <CommandSeparator />}
              </>
            )}

            {/* System Users Results */}
            {filteredSystemUsers.length > 0 && (
              <CommandGroup heading="GigMaster Users">
                {filteredSystemUsers.map((systemUser) => (
                  <CommandItem
                    key={systemUser.id}
                    value={systemUser.id}
                    onSelect={() => handleSelectSystemUser(systemUser)}
                    className="flex items-center gap-3 py-3 cursor-pointer"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={systemUser.avatar_url || undefined} />
                      <AvatarFallback>
                        {systemUser.name
                          ? systemUser.name.substring(0, 2).toUpperCase()
                          : "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {systemUser.name || "Unknown"}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {systemUser.main_instrument && (
                          <span>{systemUser.main_instrument}</span>
                        )}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Option to add manually when there are results */}
            {hasResults && searchValue.trim() && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleAddManual}
                    className="flex items-center gap-3 py-2 cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Add &quot;{searchValue}&quot; as new member</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
