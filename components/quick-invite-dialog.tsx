'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/providers/user-provider';
import { findContactByEmailOrPhone, createContact } from '@/lib/api/musician-contacts';
import { addRoleToGig } from '@/lib/api/gig-roles';
import { inviteMusicianByEmail, inviteViaWhatsApp } from '@/lib/api/gig-invitations';
import { ensureCountryCode } from '@/lib/utils/phone';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Mail, MessageCircle, Loader2, UserPlus } from 'lucide-react';
import { useKeyboardSubmit } from '@/hooks/use-keyboard-submit';
import { KeyboardShortcutHint } from '@/components/keyboard-shortcut-hint';

interface QuickInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gigId: string;
  onSuccess?: () => void;
}

export function QuickInviteDialog({
  open,
  onOpenChange,
  gigId,
  onSuccess,
}: QuickInviteDialogProps) {
  const { user, profile } = useUser();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<'email' | 'whatsapp'>('email');
  const [sendInvite, setSendInvite] = useState(true);
  
  const defaultCountryCode = profile?.default_country_code || '+972';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    fee: '',
  });

  // Enable Cmd+Enter / Ctrl+Enter to submit (works for visible form in tabs)
  useKeyboardSubmit(open);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    if (inviteMethod === 'email' && !formData.email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (inviteMethod === 'whatsapp') {
      if (!formData.phone.trim()) {
        toast.error('Please enter a phone number');
        return;
      }
    }

    if (!formData.role.trim()) {
      toast.error('Please enter a role');
      return;
    }

    if (!user) {
      toast.error('Not authenticated');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Check if contact already exists
      let existingContact = await findContactByEmailOrPhone(
        user.id,
        formData.email.trim() || undefined,
        formData.phone.trim() || undefined
      );

      let contactId: string;
      
      // Ensure phone has country code if provided
      const fullPhone = formData.phone.trim() 
        ? ensureCountryCode(formData.phone.trim(), defaultCountryCode) 
        : null;

      if (existingContact) {
        // Contact exists, reuse it
        contactId = existingContact.id;
        toast.info(`Found existing contact: ${existingContact.contact_name}`);
      } else {
        // Step 2: Create new contact
        const newContact = await createContact({
          contact_name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: fullPhone,
          primary_instrument: formData.role.trim(),
          default_roles: [formData.role.trim()],
          default_fee: formData.fee ? parseFloat(formData.fee) : null,
          notes: null,
        });
        contactId = newContact.id;
      }

      // Step 3: Add role to gig
      const newRole = await addRoleToGig({
        gig_id: gigId,
        role_name: formData.role.trim(),
        musician_name: formData.name.trim(),
        agreed_fee: formData.fee ? parseFloat(formData.fee) : null,
        invitation_status: sendInvite ? 'invited' : 'pending',
        contact_id: contactId,
      });

      // Step 4: Send invitation if requested
      if (sendInvite) {
        if (inviteMethod === 'email' && formData.email) {
          await inviteMusicianByEmail(newRole.id, formData.email.trim());
          toast.success(`✅ Added to gig and invitation sent via email`);
        } else if (inviteMethod === 'whatsapp' && fullPhone) {
          const { whatsappLink } = await inviteViaWhatsApp(newRole.id, fullPhone);
          window.open(whatsappLink, '_blank');
          toast.success(`✅ Added to gig. WhatsApp opened with pre-filled message.`);
        }
      } else {
        toast.success(`✅ ${formData.name} added to gig`);
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: '',
        fee: '',
      });

      // Invalidate queries
      queryClient.invalidateQueries({ 
        queryKey: ['gig-roles', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['musician-contacts', user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard-gigs', user?.id],
        refetchType: 'active'
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error in quick invite:', error);
      toast.error(error.message || 'Failed to add musician');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Someone New
          </DialogTitle>
          <DialogDescription>
            Add a musician to this gig and optionally send them an invitation
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Invite Method Toggle */}
          <Tabs value={inviteMethod} onValueChange={(v) => setInviteMethod(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="whatsapp">
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="mt-4">
              <div>
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  disabled={isSubmitting}
                />
              </div>
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-4">
              <div>
                <Label htmlFor="phone">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 border rounded-md bg-muted text-muted-foreground text-sm">
                    {defaultCountryCode}
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="501234567"
                    disabled={isSubmitting}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Country code ({defaultCountryCode}) will be added automatically
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Role */}
          <div>
            <Label htmlFor="role">
              Role <span className="text-destructive">*</span>
            </Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="Keyboards, Drums, Bass..."
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Fee */}
          <div>
            <Label htmlFor="fee">Fee (ILS)</Label>
            <Input
              id="fee"
              type="number"
              step="0.01"
              value={formData.fee}
              onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
              placeholder="500"
              disabled={isSubmitting}
            />
          </div>

          {/* Send Invite Toggle */}
          <div className="flex items-center space-x-2 rounded-lg border p-3 bg-muted/50">
            <Checkbox
              id="sendInvite"
              checked={sendInvite}
              onCheckedChange={(checked) => setSendInvite(checked as boolean)}
              disabled={isSubmitting}
            />
            <div className="flex-1">
              <Label
                htmlFor="sendInvite"
                className="text-sm font-medium cursor-pointer"
              >
                Send invitation now
              </Label>
              <p className="text-xs text-muted-foreground">
                {inviteMethod === 'email' 
                  ? 'They\'ll receive an email with a link to accept' 
                  : 'WhatsApp will open with a pre-filled message'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <KeyboardShortcutHint />
            <div className="flex gap-3 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {sendInvite ? 'Add & Invite' : 'Add to Gig'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

