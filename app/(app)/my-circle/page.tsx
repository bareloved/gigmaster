'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/providers/user-provider';
import { listMyContacts, deleteContact } from '@/lib/api/musician-contacts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ContactStatusBadge } from '@/components/contacts/status-badge';
import { AddContactDialog } from '@/components/contacts/add-contact-dialog';
import { EditContactDialog } from '@/components/contacts/edit-contact-dialog';
import { 
  Search, 
  UserPlus, 
  Music, 
  Mail, 
  Phone, 
  DollarSign,
  Trash2,
  Edit2,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import type { MusicianContact } from '@/lib/types/shared';
import { getCurrencySymbol } from '@/lib/utils/currency';

export default function MyCirclePage() {
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingContact, setEditingContact] = useState<MusicianContact | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<{ id: string; name: string } | null>(null);

  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['musician-contacts'],
    queryFn: listMyContacts,
    enabled: !!profile,
  });

  // Filter contacts based on search and status
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = contact.contact_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus = 
      filterStatus === 'all' || contact.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Delete contact handler
  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;

    try {
      await deleteContact(contactToDelete.id);
      queryClient.invalidateQueries({ queryKey: ['musician-contacts'] });
      toast.success('Contact deleted');
      setContactToDelete(null);
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
      setContactToDelete(null);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Circle</h1>
          <p className="text-muted-foreground mt-1">
            Your trusted musicians and colleagues
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {['all', 'local_only', 'invited', 'active_user'].map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                >
                  {status === 'all' ? 'All' : status.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery || filterStatus !== 'all' 
                ? 'No contacts found' 
                : 'No contacts yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start building your circle by adding your first contact'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact) => (
            <Card key={contact.id} className="relative group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {contact.contact_name}
                    </CardTitle>
                    {contact.primary_instrument && (
                      <CardDescription className="flex items-center gap-1.5 mt-1">
                        <Music className="h-3 w-3" />
                        {contact.primary_instrument}
                      </CardDescription>
                    )}
                  </div>
                  <ContactStatusBadge status={contact.status as 'local_only' | 'invited' | 'active_user'} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {/* Contact Info */}
                  {contact.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{contact.phone}</span>
                    </div>
                  )}

                  {/* Default Role & Fee */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-muted-foreground">
                      {contact.default_roles?.[0] || 'No role set'}
                    </div>
                    {contact.default_fee && (
                      <div className="flex items-center gap-1 font-medium">
                        <DollarSign className="h-3.5 w-3.5" />
                        {getCurrencySymbol('ILS')}{contact.default_fee}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Worked together {contact.times_worked_together || 0} times
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingContact(contact)}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setContactToDelete({ id: contact.id, name: contact.contact_name })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AddContactDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['musician-contacts'] });
          setIsAddDialogOpen(false);
        }}
      />

      {editingContact && (
        <EditContactDialog
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
          contact={editingContact}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['musician-contacts'] });
            setEditingContact(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!contactToDelete} onOpenChange={(open) => !open && setContactToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{contactToDelete?.name}</span>? 
              This will remove them from your circle, but you can always add them back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

