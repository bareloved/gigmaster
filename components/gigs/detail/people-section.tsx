'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Trash2, Check, X, Mail, Send, Pencil, RotateCcw, UserX } from 'lucide-react';
import { listRolesForGig, addRoleToGig, deleteRole, addSystemUserToGig, inviteAllMusicians, reinviteMusician } from '@/lib/api/gig-roles';
import { getGig } from '@/lib/api/gigs';
import { useUser } from '@/lib/providers/user-provider';
import { RoleStatusBadge } from '@/components/roles/status-badge';
import { formatCurrency } from '@/lib/utils/currency';
import { AddRoleDialog } from '@/components/roles/add-role-dialog';
import { EditRoleDialog } from '@/components/roles/edit-role-dialog';
import { InviteMusicianDialog } from '@/components/roles/invite-dialog';
import { AddFromCircleDialog, type SelectedContact } from '@/components/contacts/add-from-circle-dialog';
import { QuickInviteDialog } from '@/components/roles/quick-invite-dialog';
import { UnifiedMusicianSearch } from '@/components/shared/unified-musician-search';
import type { GigRole } from '@/lib/types/shared';
import { toast } from 'sonner';

interface GigPeopleSectionProps {
  gigId: string;
  gigTitle?: string;
}

export function GigPeopleSection({ gigId, gigTitle }: GigPeopleSectionProps) {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [prefilledMusicianName, setPrefilledMusicianName] = useState('');
  const [roleIdPendingDelete, setRoleIdPendingDelete] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [roleToInvite, setRoleToInvite] = useState<{ id: string; name: string } | null>(null);
  const [addFromCircleOpen, setAddFromCircleOpen] = useState(false);
  const [quickInviteOpen, setQuickInviteOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<GigRole | null>(null);

  // Fetch gig roles
  const {
    data: roles = [],
    isLoading: isRolesLoading,
  } = useQuery({
    queryKey: ['gig-roles', gigId],
    queryFn: () => listRolesForGig(gigId),
  });

  // Fetch gig data to check status and ownership
  const {
    data: gig,
    isLoading: isGigLoading,
  } = useQuery({
    queryKey: ['gig', gigId],
    queryFn: () => getGig(gigId),
  });

  const handleDeleteClick = (roleId: string) => {
    setRoleIdPendingDelete(roleId);
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await deleteRole(roleId);
      queryClient.invalidateQueries({ 
        queryKey: ['gig-roles', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['gig', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard-gigs', user?.id],
        refetchType: 'active'
      });
      setRoleIdPendingDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete role');
    }
  };

  const handleInviteAll = async () => {
    setIsInviting(true);
    try {
      const result = await inviteAllMusicians(gigId);
      // Invalidate both roles and gig queries to refresh status
      queryClient.invalidateQueries({ 
        queryKey: ['gig-roles', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['gig', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard-gigs', user?.id],
        refetchType: 'active'
      });
      toast.success(`Invitations sent to ${result.count} musician${result.count !== 1 ? 's' : ''}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invitations');
    } finally {
      setIsInviting(false);
    }
  };
  
  // Re-invite mutation for declined musicians
  const reinviteMutation = useMutation({
    mutationFn: (roleId: string) => reinviteMusician(roleId),
    onSuccess: () => {
      toast.success('Musician has been re-invited!');
      queryClient.invalidateQueries({ queryKey: ['gig-roles', gigId] });
      queryClient.invalidateQueries({ queryKey: ['gig', gigId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to re-invite musician');
    },
  });

  const handleAddFromCircle = async (selectedContacts: SelectedContact[]) => {
    try {
      // Add all selected contacts as roles
      await Promise.all(
        selectedContacts.map((contact) =>
          addRoleToGig({
            gig_id: gigId,
            role_name: contact.roleName,
            musician_name: contact.contactName,
            agreed_fee: contact.agreedFee,
            invitation_status: 'pending',
            payment_status: 'pending',
            notes: null,
            contact_id: contact.contactId,
          })
        )
      );

      // Refresh the roles list
      queryClient.invalidateQueries({ 
        queryKey: ['gig-roles', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard-gigs', user?.id],
        refetchType: 'active'
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add contacts');
    }
  };

  // Handler for unified search - add from circle
  const handleUnifiedAddFromCircle = async (
    contactId: string,
    contactName: string,
    defaultRole: string,
    defaultFee: number | null
  ) => {
    try {
      await addRoleToGig({
        gig_id: gigId,
        role_name: defaultRole,
        musician_name: contactName,
        agreed_fee: defaultFee,
        invitation_status: 'pending',
        payment_status: 'pending',
        notes: null,
        contact_id: contactId,
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['gig-roles', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard-gigs', user?.id],
        refetchType: 'active'
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add contact');
    }
  };

  // Handler for unified search - add system user
  const handleAddSystemUser = async (
    userId: string,
    userName: string,
    instrument: string | null
  ) => {
    try {
      await addSystemUserToGig({
        gigId,
        userId,
        userName,
        roleName: instrument || "Musician",
        agreedFee: null,
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['gig-roles', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard-gigs', user?.id],
        refetchType: 'active'
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add user');
    }
  };

  // Calculate role statistics for display
  const roleStats = {
    total: roles.length,
    invited: roles.filter(r => r.invitation_status === 'invited').length,
    accepted: roles.filter(r => r.invitation_status === 'accepted').length,
    declined: roles.filter(r => r.invitation_status === 'declined').length,
    pending: roles.filter(r => r.invitation_status === 'pending').length,
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 mb-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              People
            </CardTitle>
          </div>
          <CardDescription className="mb-4">
            Lineup and roles for this gig
            {roles.length > 0 && (
              <span className="text-xs block mt-1">
                {roleStats.total} role{roleStats.total !== 1 ? 's' : ''}
                {roleStats.accepted > 0 && ` · ${roleStats.accepted} confirmed`}
                {roleStats.invited > 0 && ` · ${roleStats.invited} invited`}
                {roleStats.pending > 0 && ` · ${roleStats.pending} pending`}
                {roleStats.declined > 0 && ` · ${roleStats.declined} declined`}
              </span>
            )}
          </CardDescription>
          
          {/* Unified search replaces 3-button interface */}
          <UnifiedMusicianSearch
            gigId={gigId}
            onAddFromCircle={handleUnifiedAddFromCircle}
            onAddSystemUser={handleAddSystemUser}
            onInviteByEmail={() => setQuickInviteOpen(true)}
            onInviteByWhatsApp={() => setQuickInviteOpen(true)}
          />
        </CardHeader>
        <CardContent>
          {isRolesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No roles yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Use the search box above to quickly add musicians, or click the + button.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Musician</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.role_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {role.musician_name || (
                            <span className="text-muted-foreground italic">Not assigned</span>
                          )}
                          {!role.musician_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRoleToInvite({ id: role.id, name: role.role_name });
                                setInviteDialogOpen(true);
                              }}
                              className="h-7 gap-1"
                            >
                              <Mail className="h-3 w-3" />
                              Invite
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <RoleStatusBadge status={role.invitation_status} gigStatus={gig?.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {role.agreed_fee ? (
                          formatCurrency(role.agreed_fee, 'ILS')
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="relative min-w-[112px] h-10">
                          {roleIdPendingDelete === role.id ? (
                            <div className="absolute inset-0 flex items-center gap-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteRole(role.id)}
                                className="h-9 w-9"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setRoleIdPendingDelete(null)}
                                className="h-9 w-9"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : role.invitation_status === 'declined' ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => reinviteMutation.mutate(role.id)}
                                disabled={reinviteMutation.isPending}
                                className="h-8 gap-1 text-xs"
                                title="Re-invite this musician"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Re-invite
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(role.id)}
                                className="h-8 w-8"
                                title="Replace this musician"
                              >
                                <UserX className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setRoleToEdit(role);
                                  setEditDialogOpen(true);
                                }}
                                className="h-10 w-10"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(role.id)}
                              className="h-10 w-10"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Invite All Button - Shows when there are pending musicians to invite */}
          {!isGigLoading && gig && roles.length > 0 && (() => {
            // Check if user is owner (gig owner)
            const isOwner = gig.owner_id === user?.id;
            
            // Show button if there are any musicians with pending status
            const hasPendingMusicians = roles.some(role => 
              role.musician_name && role.invitation_status === 'pending'
            );
            
            const showButton = isOwner && 
                              hasPendingMusicians &&
                              gig.status !== 'completed' && 
                              gig.status !== 'cancelled';
            
            return showButton && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleInviteAll}
                  disabled={isInviting}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isInviting ? 'Sending Invitations...' : 'Invite All'}
                </Button>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <AddRoleDialog
        gigId={gigId}
        open={isAddRoleDialogOpen}
        onOpenChange={setIsAddRoleDialogOpen}
        prefilledMusicianName={prefilledMusicianName}
        onSuccess={() => {
          // Roles will be refetched automatically via TanStack Query
        }}
      />
      
      {roleToInvite && (
        <InviteMusicianDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          roleId={roleToInvite.id}
          roleName={roleToInvite.name}
          gigTitle={gigTitle}
          onSuccess={() => {
            queryClient.invalidateQueries({ 
              queryKey: ['gig-roles', gigId],
              refetchType: 'active'
            });
            queryClient.invalidateQueries({ 
              queryKey: ['dashboard-gigs', user?.id],
              refetchType: 'active'
            });
          }}
        />
      )}

      <AddFromCircleDialog
        open={addFromCircleOpen}
        onOpenChange={setAddFromCircleOpen}
        gigId={gigId}
        onAddContacts={handleAddFromCircle}
      />

      <QuickInviteDialog
        open={quickInviteOpen}
        onOpenChange={setQuickInviteOpen}
        gigId={gigId}
        onSuccess={() => {
          queryClient.invalidateQueries({ 
            queryKey: ['gig-roles', gigId],
            refetchType: 'active'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['dashboard-gigs', user?.id],
            refetchType: 'active'
          });
        }}
      />

      {roleToEdit && (
        <EditRoleDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setRoleToEdit(null);
            }
          }}
          role={roleToEdit}
          onSuccess={() => {
            queryClient.invalidateQueries({ 
              queryKey: ['gig-roles', gigId],
              refetchType: 'active'
            });
            queryClient.invalidateQueries({ 
              queryKey: ['dashboard-gigs', user?.id],
              refetchType: 'active'
            });
          }}
        />
      )}
    </>
  );
}

