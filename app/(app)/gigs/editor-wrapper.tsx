"use client";

import { GigEditorPanel } from "@/components/gigpack/editor/gig-editor-panel";
import { useRouter } from "next/navigation";
import { GigPack } from "@/lib/gigpack/types";

interface GigEditorWrapperProps {
  mode?: string;
  gig?: Partial<GigPack> | null;
  isDuplicating?: boolean;
  loading?: boolean;
}

export function GigEditorWrapper({ gig, isDuplicating, loading }: GigEditorWrapperProps) {
  const router = useRouter();

  const handleClose = (open: boolean) => {
    if (!open) {
      router.back();
    }
  };

  const handleSuccess = (gigPack: GigPack) => {
    // Redirect to the gig's pack page after save
    if (gigPack.id) {
      router.push(`/gigs/${gigPack.id}/pack`);
    } else {
      router.push("/gigs");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      {/* Background UI to show behind the sheet - maybe a spinner or loading state */}
      <div className="text-muted-foreground animate-pulse">Loading editor...</div>

      <GigEditorPanel
        open={true}
        onOpenChange={handleClose}
        gigPack={gig as GigPack | undefined}
        isEditing={isDuplicating ? false : undefined}
        isDuplicating={isDuplicating}
        loading={loading}
        onCreateSuccess={handleSuccess}
        onUpdateSuccess={handleSuccess}
        onDelete={() => router.push("/gigs")}
      />
    </div>
  );
}
