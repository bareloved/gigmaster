import { useEffect } from "react";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | GigMaster` : "GigMaster – Gig Brain";
  }, [title]);
}
