"use client";

import { useMemo } from "react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/lib/providers/user-provider";
import { getGigPackFull } from "@/lib/api/gig-pack";
import { prepareGigForDuplication } from "@/lib/gigpack/duplicate-utils";
import { GigEditorWrapper } from "../editor-wrapper";
import type { GigPack } from "@/lib/gigpack/types";

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

  // Normal create flow — read all optional URL params from quick-create
  const bandId = searchParams.get("band");
  const dateParam = searchParams.get("date");
  const startTime = searchParams.get("startTime");
  const callTimeParam = searchParams.get("callTime");
  const titleParam = searchParams.get("title");
  const venueParam = searchParams.get("venue");
  const venueAddressParam = searchParams.get("venueAddress");
  const venueMapsUrlParam = searchParams.get("venueMapsUrl");

  const prefill: Partial<GigPack> = {};
  if (bandId) prefill.band_id = bandId;
  if (dateParam) prefill.date = dateParam;
  if (startTime) prefill.on_stage_time = startTime;
  if (callTimeParam) prefill.call_time = callTimeParam;
  if (titleParam) prefill.title = titleParam;
  if (venueParam) prefill.venue_name = venueParam;
  if (venueAddressParam) prefill.venue_address = venueAddressParam;
  if (venueMapsUrlParam) prefill.venue_maps_url = venueMapsUrlParam;

  return (
    <GigEditorWrapper
      mode="create"
      gig={Object.keys(prefill).length > 0 ? prefill : undefined}
    />
  );
}
