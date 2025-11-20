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
import { KeyboardShortcutHint } from "@/components/keyboard-shortcut-hint";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateRole } from "@/lib/api/gig-roles";
import type { GigRole } from "@/lib/types/shared";

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  role: GigRole;
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

export function EditRoleDialog({
  open,
  onOpenChange,
  onSuccess,
  role,
}: EditRoleDialogProps) {
  const [roleName, setRoleName] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [musicianName, setMusicianName] = useState("");
  const [agreedFee, setAgreedFee] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enable Cmd+Enter / Ctrl+Enter to submit
  useKeyboardSubmit(open);

  // Initialize form with role data when dialog opens
  useEffect(() => {
    if (open && role) {
      // Check if role name is in common roles
      const isCommonRole = COMMON_ROLES.includes(role.role_name);
      if (isCommonRole) {
        setRoleName(role.role_name);
        setCustomRole("");
      } else {
        setRoleName("Other");
        setCustomRole(role.role_name);
      }
      
      setMusicianName(role.musician_name || "");
      setAgreedFee(role.agreed_fee ? role.agreed_fee.toString() : "");
      setNotes(role.notes || "");
    }
  }, [open, role]);

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
      await updateRole(role.id, {
        role_name: finalRoleName,
        musician_name: musicianName.trim() || null,
        agreed_fee: agreedFee ? parseFloat(agreedFee) : null,
        notes: notes.trim() || null,
      });

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update the role details and musician assignment.
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
              <Input
                id="musicianName"
                placeholder="Enter musician name..."
                value={musicianName}
                onChange={(e) => setMusicianName(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Note: Changing the musician here won't update contact associations
              </p>
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
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

