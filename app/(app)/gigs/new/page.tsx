"use client";

import { useMemo } from "react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/lib/providers/user-provider";
import { getGigPackFull } from "@/lib/api/gig-pack";
import { prepareGigForDuplication } from "@/lib/gigpack/duplicate-utils";
import { GigEditorWrapper } from "../editor-wrapper";

export default function NewGigPage() {
  useDocumentTitle("New Gig");
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");
  const { user } = useUser();

  // Fetch source gig when duplicating
  const { data: sourceGig, isLoading } = useQuery({
    queryKey: ["gig-pack-full", duplicateId, user?.id],
    queryFn: () => getGigPackFull(duplicateId!),
    enabled: !!duplicateId && !!user,
  });

  // Transform source gig for duplication — memoized to keep stable reference
  const duplicateData = useMemo(() => {
    if (!sourceGig) return undefined;
    return prepareGigForDuplication(sourceGig);
  }, [sourceGig]);

  // Duplicating: show loading state while fetching, then pass pre-filled data
  if (duplicateId) {
    return (
      <GigEditorWrapper
        mode="create"
        gig={duplicateData ?? undefined}
        isDuplicating
        loading={isLoading}
      />
    );
  }

  // Normal create flow
  return <GigEditorWrapper mode="create" />;
}
