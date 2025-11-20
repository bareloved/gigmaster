'use client';

import { useState } from 'react';
import { useUser } from '@/lib/providers/user-provider';
import { createContact } from '@/lib/api/musician-contacts';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useKeyboardSubmit } from '@/hooks/use-keyboard-submit';
import { KeyboardShortcutHint } from '@/components/keyboard-shortcut-hint';

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddContactDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddContactDialogProps) {
  const { profile } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    contact_name: '',
    email: '',
    phone: '',
    primary_instrument: '',
    default_fee: '',
    notes: '',
  });
  
  const defaultCountryCode = profile?.default_country_code || '+972';

  // Enable Cmd+Enter / Ctrl+Enter to submit
  useKeyboardSubmit(open);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contact_name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    setIsSubmitting(true);

    try {
      // Ensure phone has country code if provided
      const fullPhone = formData.phone.trim() 
        ? ensureCountryCode(formData.phone.trim(), defaultCountryCode) 
        : null;
      
      await createContact({
        contact_name: formData.contact_name.trim(),
        email: formData.email.trim() || null,
        phone: fullPhone,
        primary_instrument: formData.primary_instrument.trim() || null,
        default_fee: formData.default_fee ? parseFloat(formData.default_fee) : null,
        notes: formData.notes.trim() || null,
        default_roles: formData.primary_instrument.trim() 
          ? [formData.primary_instrument.trim()] 
          : null,
      });

      toast.success('Contact added');
      setFormData({
        contact_name: '',
        email: '',
        phone: '',
        primary_instrument: '',
        default_fee: '',
        notes: '',
      });
      onSuccess();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error('Failed to add contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>
            Add a musician to your circle. You can invite them to gigs later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name (Required) */}
          <div>
            <Label htmlFor="contact_name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact_name"
              value={formData.contact_name}
              onChange={(e) =>
                setFormData({ ...formData, contact_name: e.target.value })
              }
              placeholder="John Doe"
              required
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="john@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone">Phone</Label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 border rounded-md bg-muted text-muted-foreground text-sm">
                {defaultCountryCode}
              </span>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="501234567"
                className="flex-1"
              />
            </div>
          </div>

          {/* Instrument / Main Role */}
          <div>
            <Label htmlFor="primary_instrument">Main Instrument/Role</Label>
            <Input
              id="primary_instrument"
              value={formData.primary_instrument}
              onChange={(e) =>
                setFormData({ ...formData, primary_instrument: e.target.value })
              }
              placeholder="Keyboards, Drums, Bass..."
            />
          </div>

          {/* Default Fee */}
          <div>
            <Label htmlFor="default_fee">Default Fee (ILS)</Label>
            <Input
              id="default_fee"
              type="number"
              step="0.01"
              value={formData.default_fee}
              onChange={(e) =>
                setFormData({ ...formData, default_fee: e.target.value })
              }
              placeholder="500"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Any notes about this contact..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
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
                Add Contact
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

