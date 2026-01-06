"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/lib/providers/user-provider";
import { searchSystemUsers } from "@/lib/api/users";
import { searchContacts } from "@/lib/api/musician-contacts";
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
import { formatCurrency } from "@/lib/utils/currency";

/** Member data returned from search selection */
interface SelectedMember {
  name: string;
  role: string;
}

interface LineupMemberSearchProps {
  /** Callback when a member is selected */
  onSelectMember: (member: SelectedMember) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the search is disabled */
  disabled?: boolean;
}

export function LineupMemberSearch({
  onSelectMember,
  placeholder = "Search musicians...",
  disabled = false,
}: LineupMemberSearchProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Search My Circle
  const { data: circleResults = [] } = useQuery({
    queryKey: ["contacts-search", user?.id, searchValue],
    queryFn: () => searchContacts(user?.id!, searchValue),
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

  const handleSelectContact = (contact: typeof circleResults[0]) => {
    onSelectMember({
      name: contact.contact_name,
      role: contact.default_roles?.[0] || contact.primary_instrument || "",
    });
    setOpen(false);
    setSearchValue("");
  };

  const handleSelectSystemUser = (systemUser: typeof systemUsers[0]) => {
    onSelectMember({
      name: systemUser.name || "Unknown",
      role: systemUser.main_instrument || "",
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
          className="text-muted-foreground hover:text-foreground"
        >
          <Search className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
          {placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {searchValue.length < 2 ? (
              <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
            ) : !hasResults ? (
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
                  Add "{searchValue}" as new member
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
              <CommandGroup heading="Ensemble Users">
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
                    <span>Add "{searchValue}" as new member</span>
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
