"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy import page — redirects to /gigs.
 * Calendar import now lives in a Sheet drawer accessible from /gigs and /calendar.
 */
export default function CalendarImportPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/gigs");
  }, [router]);

  return null;
}
