"use client";

import { useEffect } from "react";

/**
 * Hook to enable Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) keyboard shortcut
 * to submit forms within dialogs.
 * 
 * @param open - Whether the dialog is currently open
 * @param formRef - Optional ref to a specific form element (for dialogs with multiple forms)
 */
export function useKeyboardSubmit(open: boolean, formRef?: React.RefObject<HTMLFormElement>) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        
        // Find the form element
        let form: HTMLFormElement | null = null;
        
        if (formRef?.current) {
          // Use provided ref if available
          form = formRef.current;
        } else {
          // Find the first visible form in the dialog
          const dialogContent = document.querySelector('[role="dialog"]');
          if (dialogContent) {
            form = dialogContent.querySelector("form");
          }
        }
        
        if (form) {
          // Use requestSubmit() to trigger validation and submit handlers
          // This is better than submit() as it fires the onSubmit event
          form.requestSubmit();
        }
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, formRef]);
}

