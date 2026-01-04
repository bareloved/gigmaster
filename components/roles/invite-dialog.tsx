'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { inviteMusicianByEmail, inviteViaWhatsApp } from '@/lib/api/gig-invitations';
import { searchContacts } from '@/lib/api/musician-contacts';
import type { MusicianContactWithStats } from '@/lib/types/shared';
import { ensureCountryCode } from '@/lib/utils/phone';
import { toast } from 'sonner';
import { Mail, Loader2, MessageCircle, Search, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/lib/providers/user-provider';
import { useKeyboardSubmit } from '@/hooks/use-keyboard-submit';
import { KeyboardShortcutHint } from '@/components/shared/keyboard-shortcut-hint';

interface InviteMusicianDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleId: string;
  roleName: string;
  gigTitle?: string;
  onSuccess?: () => void;
}

export function InviteMusicianDialog({
  open,
  onOpenChange,
  roleId,
  roleName,
  gigTitle,
  onSuccess,
}: InviteMusicianDialogProps) {
  const { user, profile } = useUser();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<MusicianContactWithStats | null>(null);
  const [loading, setLoading] = useState(false);
  
  const defaultCountryCode = profile?.default_country_code || '+972';
  
  // Enable Cmd+Enter / Ctrl+Enter to submit (works for visible form in tabs)
  useKeyboardSubmit(open);
  
  // Search contacts
  const { data: contacts = [] } = useQuery<MusicianContactWithStats[]>({
    queryKey: ['musician-contacts-invite', user?.id, searchQuery],
    queryFn: () => searchContacts(user!.id, searchQuery, 10),
    staleTime: 1000 * 60 * 5,
    enabled: !!user && open,
  });
  
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    
    setLoading(true);
    
    try {
      await inviteMusicianByEmail(roleId, email.trim());
      toast.success(`Invitation sent to ${email}`);
      setEmail('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };
  
  const handleWhatsAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }
    
    setLoading(true);
    
    try {
      // Ensure phone has country code
      const fullPhone = ensureCountryCode(phone.trim(), defaultCountryCode);
      
      const { whatsappLink } = await inviteViaWhatsApp(roleId, fullPhone);
      
      // Open WhatsApp in new window
      window.open(whatsappLink, '_blank');
      
      toast.success('WhatsApp opened! Send the pre-filled message.');
      setPhone('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating WhatsApp invitation:', error);
      toast.error(error.message || 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };
  
  const handleContactSelect = (contact: MusicianContactWithStats, method: 'email' | 'whatsapp') => {
    setSelectedContact(contact);
    
    if (method === 'email' && contact.email) {
      setEmail(contact.email);
      // Automatically switch to email tab
      document.querySelector('[value="email"]')?.dispatchEvent(new Event('click', { bubbles: true }));
    } else if (method === 'whatsapp' && contact.phone) {
      setPhone(contact.phone);
      // Automatically switch to WhatsApp tab
      document.querySelector('[value="whatsapp"]')?.dispatchEvent(new Event('click', { bubbles: true }));
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Musician</DialogTitle>
          <DialogDescription>
            Send an invitation for the <strong>{roleName}</strong> role
            {gigTitle && ` in ${gigTitle}`}.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search">
              <Search className="w-4 h-4 mr-2" />
              Search
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-4">
            <Command className="rounded-lg border">
              <CommandInput 
                placeholder="Search your contacts..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No contacts found. Try the Email or WhatsApp tab to invite manually.
                  </div>
                </CommandEmpty>
                {contacts.length > 0 && (
                  <CommandGroup heading="Your Contacts">
                    {contacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={contact.contact_name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="font-medium">{contact.contact_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {contact.primary_instrument && `${contact.primary_instrument} • `}
                              {contact.gigsCount} {contact.gigsCount === 1 ? 'gig' : 'gigs'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {contact.email && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleContactSelect(contact, 'email')}
                              disabled={loading}
                            >
                              <Mail className="w-4 h-4 mr-1" />
                              Email
                            </Button>
                          )}
                          {contact.phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleContactSelect(contact, 'whatsapp')}
                              disabled={loading}
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              WhatsApp
                            </Button>
                          )}
                          {!contact.email && !contact.phone && (
                            <span className="text-xs text-muted-foreground">No contact info</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
            <p className="text-xs text-muted-foreground">
              Select a contact to auto-fill their email or phone number for the invitation.
            </p>
          </TabsContent>
          
          <TabsContent value="email" className="space-y-4">
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="musician@example.com"
                  required
                  disabled={loading}
                />
                <p className="text-sm text-muted-foreground">
                  They'll receive an email with a link to accept.
                </p>
              </div>
              
              <div className="flex items-center gap-3 w-full">
                <KeyboardShortcutHint />
                <div className="flex gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="whatsapp" className="space-y-4">
            <form onSubmit={handleWhatsAppSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 border rounded-md bg-muted text-muted-foreground text-sm">
                    {defaultCountryCode}
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="501234567"
                    required
                    disabled={loading}
                    className="flex-1"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Country code ({defaultCountryCode}) will be added automatically. WhatsApp will open with a pre-filled message.
                </p>
              </div>
              
              <div className="flex items-center gap-3 w-full">
                <KeyboardShortcutHint />
                <div className="flex gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Open WhatsApp
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

