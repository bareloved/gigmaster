"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useKeyboardSubmit } from "@/hooks/use-keyboard-submit";
import { KeyboardShortcutHint } from "@/components/shared/keyboard-shortcut-hint";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown } from "lucide-react";
import { addRoleToGig } from "@/lib/api/gig-roles";
import { searchContacts } from "@/lib/api/musician-contacts";
import type { MusicianContactWithStats } from "@/lib/types/shared";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/lib/providers/user-provider";

interface AddRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  gigId: string;
  prefilledMusicianName?: string;
}

const COMMON_ROLES = [
  "Keys",
  "MD / Keys",
  "Drums",
  "Bass",
  "Guitar",
  "Vocals",
  "Saxophone",
  "Trumpet",
  "Trombone",
  "DJ",
  "Track Operator",
  "FOH / Sound Engineer",
  "Lighting",
  "Stage Manager",
  "Other",
];

const INVITATION_STATUSES = [
  { value: "pending", label: "Pending Invite" },
  { value: "invited", label: "Invited" },
  { value: "accepted", label: "Confirmed" },
  { value: "declined", label: "Declined" },
  { value: "needs_sub", label: "Needs Sub" },
];

export function AddRoleDialog({
  open,
  onOpenChange,
  onSuccess,
  gigId,
  prefilledMusicianName = "",
}: AddRoleDialogProps) {
  const { user } = useUser();
  const [roleName, setRoleName] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [musicianName, setMusicianName] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [musicianSearchOpen, setMusicianSearchOpen] = useState(false);
  const [invitationStatus, setInvitationStatus] = useState("pending");
  const [agreedFee, setAgreedFee] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enable Cmd+Enter / Ctrl+Enter to submit
  useKeyboardSubmit(open);

  // Fetch musician contacts with search
  // Include user.id to prevent cross-user cache pollution
  const { data: musicianContacts = [] } = useQuery<MusicianContactWithStats[]>({
    queryKey: ["musician-contacts", user?.id, musicianName],
    queryFn: () => searchContacts(user!.id, musicianName, 10),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    enabled: !!user,
  });

  // Set prefilled musician name when dialog opens
  useEffect(() => {
    if (open && prefilledMusicianName) {
      setMusicianName(prefilledMusicianName);
    }
  }, [open, prefilledMusicianName]);

  // Handle contact selection with pre-fill
  const handleContactSelect = (contact: MusicianContactWithStats) => {
    setMusicianName(contact.contact_name);
    setSelectedContactId(contact.id);
    setMusicianSearchOpen(false);
    
    // Pre-fill role if contact has default roles and current role is empty
    if (!roleName && contact.default_roles && contact.default_roles.length > 0) {
      const defaultRole = contact.default_roles[0];
      if (COMMON_ROLES.includes(defaultRole)) {
        setRoleName(defaultRole);
      } else {
        setRoleName("Other");
        setCustomRole(defaultRole);
      }
    }
    
    // Pre-fill fee if contact has default fee and current fee is empty
    if (!agreedFee && contact.default_fee) {
      setAgreedFee(contact.default_fee.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalRoleName = roleName === "Other" ? customRole.trim() : roleName;

    if (!finalRoleName) {
      setError("Role name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await addRoleToGig({
        gig_id: gigId,
        role_name: finalRoleName,
        musician_name: musicianName.trim() || null,
        contact_id: selectedContactId,
        invitation_status: invitationStatus,
        agreed_fee: agreedFee ? parseFloat(agreedFee) : null,
        notes: notes.trim() || null,
      });

      setRoleName("");
      setCustomRole("");
      setMusicianName("");
      setSelectedContactId(null);
      setMusicianSearchOpen(false);
      setInvitationStatus("pending");
      setAgreedFee("");
      setNotes("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Role to Gig</DialogTitle>
            <DialogDescription>
              Define a role and optionally assign a musician.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="roleName">
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={roleName}
                onValueChange={setRoleName}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {roleName === "Other" && (
              <div className="space-y-2">
                <Label htmlFor="customRole">
                  Custom Role Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customRole"
                  placeholder="e.g., Percussionist, Backup Vocals"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="musicianName">Musician Name</Label>
              <Popover open={musicianSearchOpen} onOpenChange={setMusicianSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={musicianSearchOpen}
                    className="w-full justify-between font-normal"
                    disabled={loading}
                  >
                    {musicianName || "Search or enter musician name..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Type musician name..." 
                      value={musicianName}
                      onValueChange={setMusicianName}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-2 text-center text-sm">
                          <p className="text-muted-foreground mb-2">No musician found</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMusicianSearchOpen(false);
                            }}
                          >
                            Use "{musicianName}" as new musician
                          </Button>
                        </div>
                      </CommandEmpty>
                      {musicianContacts.length > 0 && (
                        <CommandGroup heading="Your Contacts">
                          {musicianContacts.map((contact) => (
                            <CommandItem
                              key={contact.id}
                              value={contact.contact_name}
                              onSelect={() => handleContactSelect(contact)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  musicianName === contact.contact_name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex items-center justify-between flex-1">
                                <div className="flex flex-col">
                                  <span className="font-medium">{contact.contact_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {contact.primary_instrument && `${contact.primary_instrument} • `}
                                    {contact.default_roles && contact.default_roles.length > 0 ? (
                                      <>
                                        {contact.default_roles.slice(0, 2).join(", ")}
                                        {contact.default_roles.length > 2 && `, +${contact.default_roles.length - 2} more`}
                                      </>
                                    ) : (
                                      "No roles yet"
                                    )}
                                  </span>
                                </div>
                                <Badge variant="secondary" className="ml-2">
                                  {contact.gigsCount} {contact.gigsCount === 1 ? "gig" : "gigs"}
                                </Badge>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Start typing to see musicians you've worked with before
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invitationStatus">Status</Label>
              <Select
                value={invitationStatus}
                onValueChange={setInvitationStatus}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITATION_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agreedFee">Fee (optional)</Label>
              <Input
                id="agreedFee"
                type="number"
                step="0.01"
                placeholder="e.g., 500.00"
                value={agreedFee}
                onChange={(e) => setAgreedFee(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes or requirements"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
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
                  {loading ? "Adding..." : "Add Role"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
