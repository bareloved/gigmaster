"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/providers/user-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function AccountTab() {
  const { user } = useUser();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const provider = user?.app_metadata?.provider;
  const isGoogle = provider === "google";

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") return;

    try {
      setIsDeleting(true);
      const response = await fetch("/api/account/delete", { method: "POST" });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete account");
      }

      toast.success("Account deleted successfully");
      router.push("/auth/sign-in");
      router.refresh();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account"
      );
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Authentication card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Authentication</h3>
            <p className="text-sm text-muted-foreground">
              {isGoogle
                ? "Your account is connected via Google OAuth"
                : "Your account uses email authentication"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              {isGoogle ? (
                <span className="text-lg font-semibold">G</span>
              ) : (
                <span className="text-lg font-semibold">@</span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                {isGoogle ? "Google Account" : "Email Account"}
              </p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {isGoogle
              ? "Password management is handled through your Google account settings"
              : "You can reset your password from the sign-in page"}
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone card */}
      <Card className="border-destructive/30">
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-destructive">
              Danger Zone
            </h3>
            <p className="text-sm text-muted-foreground">
              Irreversible actions for your account
            </p>
          </div>

          <button
            className="flex w-full items-center gap-3 rounded-xl bg-destructive px-5 py-3.5 text-destructive-foreground transition-opacity hover:opacity-90"
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 className="h-5 w-5" />
            <span className="font-medium">Delete Account</span>
          </button>

          <p className="text-sm text-muted-foreground">
            This will permanently delete your account, all gigs, bands, and
            associated data
          </p>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All your gigs,
              bands, contacts, and calendar connections will be deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <p className="text-sm font-medium">
              Type <span className="font-mono text-destructive">DELETE</span> to
              confirm
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              disabled={isDeleting}
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirm(false);
                setConfirmText("");
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={confirmText !== "DELETE" || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete my account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
