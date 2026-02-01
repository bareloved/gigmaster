'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listMyContacts } from '@/lib/api/musician-contacts';
import type { MusicianContact, ContactStatus } from '@/lib/types/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { ContactStatusBadge } from '@/components/contacts/status-badge';
import { Search, Music, Users, Loader2 } from 'lucide-react';
import { useKeyboardSubmit } from '@/hooks/use-keyboard-submit';

interface AddFromCircleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddContacts: (selectedContacts: SelectedContact[]) => void;
  gigId: string;
}

export interface SelectedContact {
  contactId: string;
  contactName: string;
  roleName: string;
  agreedFee: number | null;
}

export function AddFromCircleDialog({
  open,
  onOpenChange,
  onAddContacts,
}: AddFromCircleDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Map<string, SelectedContact>>(new Map());

  // Enable Cmd+Enter / Ctrl+Enter to trigger Add button
  // Note: This dialog doesn't have a form, so the shortcut won't work automatically
  useKeyboardSubmit(open);

  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['musician-contacts'],
    queryFn: listMyContacts,
    enabled: open,
  });

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter((contact) =>
      contact.contact_name.toLowerCase().includes(query) ||
      contact.primary_instrument?.toLowerCase().includes(query) ||
      contact.default_roles?.some(role => role.toLowerCase().includes(query))
    );
  }, [contacts, searchQuery]);

  // Sort: recently worked with first, then by name
  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      // Active users first
      if (a.status === 'active_user' && b.status !== 'active_user') return -1;
      if (a.status !== 'active_user' && b.status === 'active_user') return 1;
      
      // Then by last worked date (most recent first)
      if (a.last_worked_date && b.last_worked_date) {
        return new Date(b.last_worked_date).getTime() - new Date(a.last_worked_date).getTime();
      }
      if (a.last_worked_date && !b.last_worked_date) return -1;
      if (!a.last_worked_date && b.last_worked_date) return 1;
      
      // Then by times worked together
      return (b.times_worked_together || 0) - (a.times_worked_together || 0);
    });
  }, [filteredContacts]);

  const handleToggleContact = (contact: MusicianContact, checked: boolean) => {
    const newSelected = new Map(selectedContacts);
    
    if (checked) {
      newSelected.set(contact.id, {
        contactId: contact.id,
        contactName: contact.contact_name,
        roleName: contact.default_roles?.[0] || contact.primary_instrument || '',
        agreedFee: contact.default_fee,
      });
    } else {
      newSelected.delete(contact.id);
    }
    
    setSelectedContacts(newSelected);
  };

  const handleUpdateRole = (contactId: string, roleName: string) => {
    const newSelected = new Map(selectedContacts);
    const existing = newSelected.get(contactId);
    if (existing) {
      newSelected.set(contactId, { ...existing, roleName });
      setSelectedContacts(newSelected);
    }
  };

  const handleUpdateFee = (contactId: string, fee: string) => {
    const newSelected = new Map(selectedContacts);
    const existing = newSelected.get(contactId);
    if (existing) {
      newSelected.set(contactId, { 
        ...existing, 
        agreedFee: fee ? parseFloat(fee) : null 
      });
      setSelectedContacts(newSelected);
    }
  };

  const handleAdd = () => {
    onAddContacts(Array.from(selectedContacts.values()));
    setSelectedContacts(new Map());
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add from My Circle</DialogTitle>
          <DialogDescription>
            Select musicians from your circle to add to this gig
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, instrument, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Contacts List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedContacts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No contacts found' : 'No contacts in your circle yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedContacts.map((contact) => {
                const isSelected = selectedContacts.has(contact.id);
                const selectedData = selectedContacts.get(contact.id);

                return (
                  <div
                    key={contact.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      isSelected ? 'border-primary bg-accent' : 'border-border'
                    }`}
                  >
                    {/* Header with checkbox */}
                    <div className="flex items-start gap-3 mb-3">
                      <Checkbox
                        id={`contact-${contact.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleToggleContact(contact, checked as boolean)
                        }
                        className="mt-1"
                      />
                      <label
                        htmlFor={`contact-${contact.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{contact.contact_name}</div>
                            {contact.primary_instrument && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <Music className="h-3 w-3" />
                                {contact.primary_instrument}
                              </div>
                            )}
                            {contact.times_worked_together && contact.times_worked_together > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Worked together {contact.times_worked_together} times
                              </div>
                            )}
                          </div>
                          <ContactStatusBadge status={contact.status as ContactStatus} />
                        </div>
                      </label>
                    </div>

                    {/* Editable role & fee (only if selected) */}
                    {isSelected && (
                      <div className="grid grid-cols-2 gap-3 ml-9">
                        <div>
                          <Label htmlFor={`role-${contact.id}`} className="text-xs">
                            Role
                          </Label>
                          <Input
                            id={`role-${contact.id}`}
                            value={selectedData?.roleName || ''}
                            onChange={(e) => handleUpdateRole(contact.id, e.target.value)}
                            placeholder="e.g. Keyboards"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`fee-${contact.id}`} className="text-xs">
                            Fee (ILS)
                          </Label>
                          <Input
                            id={`fee-${contact.id}`}
                            type="number"
                            step="0.01"
                            value={selectedData?.agreedFee || ''}
                            onChange={(e) => handleUpdateFee(contact.id, e.target.value)}
                            placeholder="500"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Selected count & actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedContacts.size > 0 ? (
              <span className="font-medium">
                {selectedContacts.size} selected
              </span>
            ) : (
              <span>Select musicians to add</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedContacts(new Map());
                setSearchQuery('');
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={selectedContacts.size === 0}
            >
              Add {selectedContacts.size > 0 && `(${selectedContacts.size})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

