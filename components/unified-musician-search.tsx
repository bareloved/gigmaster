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
import { Search, Plus, Mail, MessageSquare } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

interface UnifiedMusicianSearchProps {
  gigId: string;
  onAddFromCircle: (contactId: string, contactName: string, defaultRole: string, defaultFee: number | null) => void;
  onAddSystemUser: (userId: string, userName: string, instrument: string | null) => void;
  onInviteByEmail: () => void;
  onInviteByWhatsApp: () => void;
}

export function UnifiedMusicianSearch({
  gigId,
  onAddFromCircle,
  onAddSystemUser,
  onInviteByEmail,
  onInviteByWhatsApp,
}: UnifiedMusicianSearchProps) {
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-start text-muted-foreground"
        >
          <Search className="mr-2 h-4 w-4" />
          Add musician...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or email..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {searchValue.length < 2 ? (
              <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
            ) : !hasResults ? (
              <CommandEmpty>No matches found</CommandEmpty>
            ) : null}

            {/* My Circle Results */}
            {circleResults.length > 0 && (
              <>
                <CommandGroup heading="My Circle">
                  {circleResults.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={contact.id}
                      onSelect={() => {
                        onAddFromCircle(
                          contact.id,
                          contact.contact_name,
                          contact.default_roles?.[0] || "Musician",
                          contact.default_fee
                        );
                        setOpen(false);
                        setSearchValue("");
                      }}
                      className="flex items-center gap-3 py-3"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {contact.contact_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{contact.contact_name}</p>
                          {contact.status === 'active_user' && (
                            <Badge variant="secondary" className="text-xs">Active</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {contact.primary_instrument && (
                            <span>{contact.primary_instrument}</span>
                          )}
                          {contact.default_fee && (
                            <>
                              <span>•</span>
                              <span>{formatCurrency(contact.default_fee, 'ILS')}</span>
                            </>
                          )}
                          {contact.times_worked_together > 0 && (
                            <>
                              <span>•</span>
                              <span>{contact.times_worked_together}x</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="gap-1">
                        <Plus className="h-3 w-3" />
                        Add
                      </Button>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {filteredSystemUsers.length > 0 && <CommandSeparator />}
              </>
            )}

            {/* System Users Results */}
            {filteredSystemUsers.length > 0 && (
              <>
                <CommandGroup heading="System Users">
                  {filteredSystemUsers.map((systemUser) => (
                    <CommandItem
                      key={systemUser.id}
                      value={systemUser.id}
                      onSelect={() => {
                        onAddSystemUser(systemUser.id, systemUser.name, systemUser.main_instrument);
                        setOpen(false);
                        setSearchValue("");
                      }}
                      className="flex items-center gap-3 py-3"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={systemUser.avatar_url || undefined} />
                        <AvatarFallback>
                          {systemUser.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{systemUser.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {systemUser.main_instrument && (
                            <span>{systemUser.main_instrument}</span>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="gap-1">
                        <Plus className="h-3 w-3" />
                        Add
                      </Button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Invite Options - Always show if typing */}
            {searchValue.length >= 2 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Invite New Person">
                  <CommandItem
                    onSelect={() => {
                      onInviteByEmail();
                      setOpen(false);
                      setSearchValue("");
                    }}
                    className="flex items-center gap-3 py-2"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Invite "{searchValue}" by email...</span>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => {
                      onInviteByWhatsApp();
                      setOpen(false);
                      setSearchValue("");
                    }}
                    className="flex items-center gap-3 py-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Invite "{searchValue}" by WhatsApp...</span>
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

