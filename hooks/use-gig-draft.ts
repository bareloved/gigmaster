"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "./use-debounce";
import type {
  LineupMember,
  PackingChecklistItem,
  GigMaterial,
  GigScheduleItem,
} from "@/lib/gigpack/types";

/**
 * Form data structure for gig drafts.
 * Matches the state variables in GigEditorPanel.
 */
export interface GigDraftFormData {
  title: string;
  bandId: string | null;
  bandName: string;
  date: string;
  callTime: string;
  onStageTime: string;
  venueName: string;
  venueAddress: string;
  venueMapsUrl: string;
  lineup: LineupMember[];
  setlistText: string;
  dressCode: string;
  backlineNotes: string;
  parkingNotes: string;
  paymentNotes: string;
  internalNotes: string;
  gigType: string | null;
  bandLogoUrl: string;
  heroImageUrl: string;
  accentColor: string;
  packingChecklist: PackingChecklistItem[];
  materials: GigMaterial[];
  schedule: GigScheduleItem[];
}

/**
 * Stored draft structure with metadata.
 */
export interface GigDraftData {
  timestamp: number;
  formData: GigDraftFormData;
}

const STORAGE_KEY = "gigmaster-gig-draft-new";
const DEBOUNCE_DELAY = 500; // 500ms delay for auto-save

/**
 * Hook for managing gig draft persistence in localStorage.
 *
 * Features:
 * - Debounced auto-save (500ms delay)
 * - Check for existing draft on mount
 * - Clear draft on successful submission
 * - Include timestamp for draft freshness
 *
 * @example
 * ```tsx
 * const { hasDraft, draftTimestamp, loadDraft, saveDraft, clearDraft } = useGigDraft();
 *
 * // Check for existing draft
 * if (hasDraft) {
 *   // Show "Resume draft?" dialog
 * }
 *
 * // Auto-save on form changes
 * useEffect(() => {
 *   saveDraft(formData);
 * }, [formData, saveDraft]);
 *
 * // Clear on successful save
 * onSuccess: () => clearDraft()
 * ```
 */
export function useGigDraft() {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Track if we've just saved to avoid flickering the indicator
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: GigDraftData = JSON.parse(stored);
        // Validate the structure
        if (parsed.timestamp && parsed.formData) {
          setHasDraft(true);
          setDraftTimestamp(parsed.timestamp);
        }
      }
    } catch (e) {
      // Invalid stored data, ignore
      console.warn("Failed to parse gig draft from localStorage:", e);
    }
    setIsLoaded(true);
  }, []);

  /**
   * Load the draft from localStorage.
   * Returns the form data or null if no valid draft exists.
   */
  const loadDraft = useCallback((): GigDraftFormData | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: GigDraftData = JSON.parse(stored);
        if (parsed.timestamp && parsed.formData) {
          return parsed.formData;
        }
      }
    } catch (e) {
      console.warn("Failed to load gig draft:", e);
    }
    return null;
  }, []);

  /**
   * Save form data to localStorage as a draft.
   * This is debounced internally - call it on every form change.
   */
  const saveDraft = useCallback((formData: GigDraftFormData) => {
    // Don't save empty drafts (no title and no meaningful content)
    const hasContent =
      formData.title.trim() ||
      formData.venueName.trim() ||
      formData.date ||
      formData.lineup.some((m) => m.name || m.role);

    if (!hasContent) {
      return;
    }

    try {
      const draftData: GigDraftData = {
        timestamp: Date.now(),
        formData,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
      setHasDraft(true);
      setDraftTimestamp(draftData.timestamp);
      setLastSavedAt(Date.now());

      // Clear the "just saved" indicator after 2 seconds
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setLastSavedAt(null);
      }, 2000);
    } catch (e) {
      console.warn("Failed to save gig draft:", e);
    }
  }, []);

  /**
   * Clear the draft from localStorage.
   * Call this on successful form submission or when user chooses "Start Fresh".
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setHasDraft(false);
      setDraftTimestamp(null);
      setLastSavedAt(null);
    } catch (e) {
      console.warn("Failed to clear gig draft:", e);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    /** Whether a draft exists in localStorage */
    hasDraft,
    /** Timestamp of the draft (for showing "from X minutes ago") */
    draftTimestamp,
    /** Whether the initial localStorage check has completed */
    isLoaded,
    /** Timestamp of last save (for showing "Draft saved" indicator) */
    lastSavedAt,
    /** Load draft data from localStorage */
    loadDraft,
    /** Save form data to localStorage (call on every change) */
    saveDraft,
    /** Clear the draft (call on successful submission or "Start Fresh") */
    clearDraft,
  };
}

/**
 * Hook that provides debounced auto-save functionality.
 * Use this to wrap form data and automatically save drafts.
 *
 * @param formData - Current form data
 * @param saveDraft - The saveDraft function from useGigDraft
 * @param enabled - Whether auto-save is enabled (disable for editing existing gigs)
 */
export function useGigDraftAutoSave(
  formData: GigDraftFormData,
  saveDraft: (data: GigDraftFormData) => void,
  enabled: boolean = true
) {
  // Debounce the form data
  const debouncedFormData = useDebounce(formData, DEBOUNCE_DELAY);

  // Save whenever debounced form data changes
  useEffect(() => {
    if (enabled && debouncedFormData) {
      saveDraft(debouncedFormData);
    }
  }, [debouncedFormData, saveDraft, enabled]);
}
