"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";

interface MissingEmailRole {
  id: string;
  name: string;
  role: string | null;
}

interface EmailCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingEmails: MissingEmailRole[];
  onSubmit: (emails: Record<string, string>) => void;
  onSkip: () => void;
}

export function EmailCollectionModal({
  open,
  onOpenChange,
  missingEmails,
  onSubmit,
  onSkip,
}: EmailCollectionModalProps) {
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailChange = (roleId: string, value: string) => {
    setEmails(prev => ({ ...prev, [roleId]: value }));
    if (errors[roleId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[roleId];
        return newErrors;
      });
    }
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    for (const [roleId, email] of Object.entries(emails)) {
      if (email && !validateEmail(email)) {
        newErrors[roleId] = "Invalid email format";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Filter out empty emails
    const validEmails = Object.fromEntries(
      Object.entries(emails).filter(([, email]) => email.trim())
    );

    onSubmit(validEmails);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Missing Email Addresses
          </DialogTitle>
          <DialogDescription>
            The following lineup members don&apos;t have email addresses.
            Add their emails to send calendar invitations, or skip to send only to members with emails.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {missingEmails.map((role) => (
            <div key={role.id} className="space-y-2">
              <Label htmlFor={`email-${role.id}`}>
                {role.name} {role.role && `(${role.role})`}
              </Label>
              <Input
                id={`email-${role.id}`}
                type="email"
                placeholder="email@example.com"
                value={emails[role.id] || ""}
                onChange={(e) => handleEmailChange(role.id, e.target.value)}
                className={errors[role.id] ? "border-red-500" : ""}
              />
              {errors[role.id] && (
                <p className="text-xs text-red-500">{errors[role.id]}</p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onSkip}>
            Skip these members
          </Button>
          <Button onClick={handleSubmit}>
            Send Invitations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
