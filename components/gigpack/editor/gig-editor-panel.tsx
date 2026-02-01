"use client";

import * as React from "react";
import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "@/lib/gigpack/i18n";
import { format, parse } from "date-fns";
import { he } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MoreHorizontal,
  Clock3,
  X,
  Calendar as CalendarIcon,
  Users,
  Music,
  Package,
  Plus,
  Trash2,
  Check,
  ExternalLink,
  Link as LinkIcon,
  FileText,
  FileUp,
  Shirt,
  ParkingCircle,
  Paperclip,
  Link2,
  Clipboard,
} from "lucide-react";
import { GigPack, LineupMember, PackingChecklistItem, GigMaterial, GigMaterialKind, GigScheduleItem, Band } from "@/lib/gigpack/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { uploadImage, deleteImage, getPathFromUrl, validateImageFile } from "@/lib/utils/image-upload";
import { updateGig } from "@/lib/api/gigs";
import { useSaveGigPack } from "@/hooks/use-gig-mutations";
import { Calendar } from "@/components/ui/calendar";
import { TimePicker } from "@/components/gigpack/ui/time-picker";
import { VenueAutocomplete } from "@/components/gigpack/ui/venue-autocomplete";
import { LineupMemberSearch } from "@/components/gigpack/ui/lineup-member-search";
import { LineupMemberPill } from "@/components/gigpack/ui/lineup-member-pill";
import { GigTypeSelect } from "@/components/gigpack/ui/gig-type-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PasteScheduleDialog } from "@/components/gigpack/dialogs/paste-schedule-dialog";
import { SetlistPDFUpload } from "@/components/gigpack/shared/setlist-pdf-upload";
import { GigPackTemplate, applyTemplateToFormDefaults } from "@/lib/gigpack/templates";
import { useGigDraft, useGigDraftAutoSave, type GigDraftFormData } from "@/hooks/use-gig-draft";

// ============================================================================
// Types
// ============================================================================

export interface GigEditorPanelInitialValues {
  title?: string;
  bandName?: string;
  date?: string;
  callTime?: string;
  onStageTime?: string;
  venueName?: string;
  venueAddress?: string;
  venueMapsUrl?: string;
  lineup?: LineupMember[];
  dressCode?: string;
  backlineNotes?: string;
  parkingNotes?: string;
  paymentNotes?: string;
  internalNotes?: string;
  packingChecklist?: PackingChecklistItem[];
  bandLogoUrl?: string;
  heroImageUrl?: string;
}
export interface GigEditorPanelProps {
  /** Whether the panel is open */
  open: boolean;
  /** Callback when panel should close */
  onOpenChange: (open: boolean) => void;
  /** Existing gig for editing (if undefined, we're creating) */
  gigPack?: GigPack;
  /** Callback on successful create */
  onCreateSuccess?: (gigPack: GigPack) => void;
  /** Callback on successful update */
  onUpdateSuccess?: (gigPack: GigPack) => void;
  /** Callback on delete */
  onDelete?: (gigPackId: string) => void;
  /** Display mode: sheet (modal) or page (full screen) */
  mode?: "sheet" | "page";
  /** Loading state for data fetching */
  loading?: boolean;
  /** Explicit edit mode (useful during loading) */
  isEditing?: boolean;
}

// ============================================================================
// Custom Tabs Component (styled for panel)
// ============================================================================

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface PanelTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

function PanelTabs({ tabs, activeTab, onTabChange }: PanelTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
              "flex items-center gap-2",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Metadata Row Component
// ============================================================================

interface MetadataRowProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  inputId?: string;
}

function MetadataRow({ label, children, className, inputId }: MetadataRowProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      {inputId ? (
        <Label
          htmlFor={inputId}
          className="w-24 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground cursor-pointer"
        >
          {label}
        </Label>
      ) : (
        <span className="w-24 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      )}
      <div className="flex-1 flex items-center gap-2">{children}</div>
    </div>
  );
}

// ============================================================================
// Inline Input - looks like text but is editable
// ============================================================================

interface InlineInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  displayClassName?: string;
}

const InlineInput = React.forwardRef<HTMLInputElement, InlineInputProps>(
  ({ className, displayClassName, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "bg-transparent border-none outline-none w-full",
          "text-foreground placeholder:text-muted-foreground/50",
          "focus:ring-0 focus-visible:ring-0",
          "hover:bg-accent/30 focus:bg-accent/20 rounded px-2 py-1 -mx-2 transition-colors",
          displayClassName,
          className
        )}
        {...props}
      />
    );
  }
);
InlineInput.displayName = "InlineInput";

// ============================================================================
// Inline Textarea - looks like text but is editable
// ============================================================================

type InlineTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const InlineTextarea = React.forwardRef<HTMLTextAreaElement, InlineTextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "bg-transparent border-none outline-none w-full resize-none",
          "text-foreground placeholder:text-muted-foreground",
          "focus:ring-0 focus-visible:ring-0",
          "hover:bg-accent/50 focus:bg-accent rounded px-2 py-1 -mx-2 transition-colors",
          className
        )}
        {...props}
      />
    );
  }
);
InlineTextarea.displayName = "InlineTextarea";

// ============================================================================
// Main Component
// ============================================================================

export function GigEditorPanel({
  open,
  onOpenChange,
  gigPack,
  onCreateSuccess,
  onUpdateSuccess,
  onDelete,
  mode = "sheet",
  loading = false,
  isEditing: isEditingProp,
}: GigEditorPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("gigpack");
  const tCommon = useTranslations("common");
  const tTemplates = useTranslations("templates");
  const tDraft = useTranslations("gigpack.draft");
  const tBands = useTranslations("bands");
  const locale = useLocale();
  const [, startTransition] = useTransition();
  const isEditing = isEditingProp ?? !!gigPack;
  const dateLocale = locale === "he" ? he : undefined;

  // Famous gig placeholders for random selection (localized lists)
  const gigPlaceholdersByLocale: Record<"en" | "he", string[]> = {
    en: [
      "Glastonbury Festival — Main Stage",
      "Madison Square Garden — Sold Out",
      "Abbey Road Studios — Acoustic Session",
      "Red Rocks Amphitheatre — Sunset Show",
      "The Fillmore — Grand Opening",
      "Royal Albert Hall — Live Recording",
      "CBGB — Legendary Basement",
      "The Troubadour — Intimate Evening",
      "Monterey Pop — Historic Performance",
      "Cavern Club — Liverpool Night",
    ],
    he: [
      "פסטיבל גלסטונברי — במה ראשית",
      "מדיסון סקוור גארדן — סולד אאוט",
      "אולפני אבי רואד — סשן אקוסטי",
      "רד רוקס — הופעת שקיעה",
      "הפילמור — ערב פתיחה",
      "רויאל אלברט הול — הקלטה חיה",
      "CBGB — מרתף אגדי",
      "דה טראובדור — ערב אינטימי",
      "מונטריי פופ — הופעה היסטורית",
      "קאוורן קלאב — לילה בליברפול",
    ],
  };

  const getRandomGigPlaceholder = () => {
    const loc = locale === "he" ? "he" : "en";
    const list = gigPlaceholdersByLocale[loc];
    return list[Math.floor(Math.random() * list.length)];
  };

  // Helper to sort schedule items by time (nulls at end)
  const sortScheduleByTime = (items: GigScheduleItem[]) => {
    return items.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  };

  // Mutation hook for saving gigs
  const saveGigPackMutation = useSaveGigPack();

  // Active tab
  const [activeTab, setActiveTab] = useState("schedule");

  // Date picker popover state
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Paste Schedule dialog state
  const [pasteScheduleOpen, setPasteScheduleOpen] = useState(false);

  // Draft persistence for new gigs
  const {
    hasDraft,
    draftTimestamp: _draftTimestamp,
    isLoaded: isDraftLoaded,
    lastSavedAt,
    loadDraft,
    saveDraft,
    clearDraft,
  } = useGigDraft();
  // Track if we've done the initial draft check (prevents re-restoring after auto-save)
  const initialDraftCheckDone = useRef(false);
  // Track if draft has been resumed (to disable the button after clicking)
  const [draftResumed, setDraftResumed] = useState(false);

  // Form state
  const [title, setTitle] = useState(gigPack?.title || "");
  const [bandId, setBandId] = useState<string | null>(gigPack?.band_id || null);
  const [bandName, setBandName] = useState(gigPack?.band_name || "");
  const [bands, setBands] = useState<Band[]>([]);
  const [date, setDate] = useState(gigPack?.date || "");
  const [callTime, setCallTime] = useState(gigPack?.call_time || "");
  const [onStageTime, setOnStageTime] = useState(gigPack?.on_stage_time || "");
  const [venueName, setVenueName] = useState(gigPack?.venue_name || "");
  const [venueAddress, setVenueAddress] = useState(gigPack?.venue_address || "");
  const [venueMapsUrl, setVenueMapsUrl] = useState(gigPack?.venue_maps_url || "");
  const [lineup, setLineup] = useState<LineupMember[]>(
    gigPack?.lineup || []
  );
  // Simplified setlist: plain text instead of structured JSON
  const [setlistText, setSetlistText] = useState(gigPack?.setlist || "");
  const [setlistPdfUrl, setSetlistPdfUrl] = useState<string | null>(gigPack?.setlist_pdf_url || null);
  const [setlistMode, setSetlistMode] = useState<"type" | "pdf">(
    gigPack?.setlist_pdf_url ? "pdf" : "type"
  );
  const [dressCode, setDressCode] = useState(gigPack?.dress_code || "");
  const [backlineNotes, setBacklineNotes] = useState(gigPack?.backline_notes || "");
  const [parkingNotes, setParkingNotes] = useState(gigPack?.parking_notes || "");
  const [paymentNotes, setPaymentNotes] = useState(gigPack?.payment_notes || "");
  const [internalNotes, setInternalNotes] = useState(gigPack?.internal_notes || "");
  const [gigType, setGigType] = useState<string | null>(gigPack?.gig_type ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Branding state
  const [bandLogoUrl, setBandLogoUrl] = useState(gigPack?.band_logo_url || "");
  const [heroImageUrl, setHeroImageUrl] = useState(gigPack?.hero_image_url || "");
  const [accentColor, setAccentColor] = useState(gigPack?.accent_color || "");
  const [, setIsUploadingLogo] = useState(false);
  const [, setIsUploadingHero] = useState(false);

  // Pending files for background upload (stored locally until save)
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingHeroFile, setPendingHeroFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);

  // Packing checklist state
  const [packingChecklist, setPackingChecklist] = useState<PackingChecklistItem[]>(
    gigPack?.packing_checklist || []
  );

  // Materials state
  const [materials, setMaterials] = useState<GigMaterial[]>(
    gigPack?.materials || []
  );

  // Schedule state
  const [schedule, setSchedule] = useState<GigScheduleItem[]>(
    gigPack?.schedule || []
  );

  // Info tab visibility flags
  const [showDressCode, setShowDressCode] = useState(!!gigPack?.dress_code);
  const [showBackline, setShowBackline] = useState(!!gigPack?.backline_notes);
  const [showParking, setShowParking] = useState(!!gigPack?.parking_notes);
  const [showInternalNotes, setShowInternalNotes] = useState(!!gigPack?.internal_notes);

  // Sync form state when gigPack prop changes (e.g., after refetch)
  useEffect(() => {
    if (gigPack) {
      setTitle(gigPack.title || "");
      setBandId(gigPack.band_id || null);
      setBandName(gigPack.band_name || "");
      setDate(gigPack.date || "");
      setCallTime(gigPack.call_time || "");
      setOnStageTime(gigPack.on_stage_time || "");
      setVenueName(gigPack.venue_name || "");
      setVenueAddress(gigPack.venue_address || "");
      setVenueMapsUrl(gigPack.venue_maps_url || "");
      setLineup(gigPack.lineup || []);
      setSetlistText(gigPack.setlist || "");
      setSetlistPdfUrl(gigPack.setlist_pdf_url || null);
      setSetlistMode(gigPack.setlist_pdf_url ? "pdf" : "type");
      setDressCode(gigPack.dress_code || "");
      setBacklineNotes(gigPack.backline_notes || "");
      setParkingNotes(gigPack.parking_notes || "");
      setPaymentNotes(gigPack.payment_notes || "");
      setInternalNotes(gigPack.internal_notes || "");
      setGigType(gigPack.gig_type ?? null);
      setBandLogoUrl(gigPack.band_logo_url || "");
      setHeroImageUrl(gigPack.hero_image_url || "");
      setAccentColor(gigPack.accent_color || "");
      setPackingChecklist(gigPack.packing_checklist || []);
      setMaterials(gigPack.materials || []);
      setSchedule(gigPack.schedule || []);

      // Sync visibility flags
      setShowDressCode(!!gigPack.dress_code);
      setShowBackline(!!gigPack.backline_notes);
      setShowParking(!!gigPack.parking_notes);
      setShowInternalNotes(!!gigPack.internal_notes);
    }
  }, [gigPack]);

  // Apply a template to the form (resets fields with template values)
  const _applyTemplate = (template: GigPackTemplate) => {
    const values = applyTemplateToFormDefaults(template);

    // Reset form with template values
    setTitle(values.title || "");
    setBandName(values.bandName || "");
    setAccentColor(values.accentColor || "");
    setDressCode(values.dressCode || "");
    setBacklineNotes(values.backlineNotes || "");
    setParkingNotes(values.parkingNotes || "");
    setPaymentNotes(values.paymentNotes || "");
    // Templates no longer use structured setlist - keep as empty text
    setSetlistText("");
    setPackingChecklist(values.packingChecklist || []);

    // Apply date offset if present
    if (values.date) {
      setDate(values.date);
    }

    toast({
      title: tTemplates("templateApplied"),
      description: template.label,
      duration: 2000,
    });
  };

  const resetFormToBlank = () => {
    // Reset all fields to blank
    setTitle("");
    setBandId(null);
    setBandName("");
    setDate("");
    setCallTime("");
    setOnStageTime("");
    setVenueName("");
    setVenueAddress("");
    setVenueMapsUrl("");
    setLineup([]);
    setSetlistText("");
    setSetlistPdfUrl(null);
    setSetlistMode("type");
    setDressCode("");
    setBacklineNotes("");
    setParkingNotes("");
    setPaymentNotes("");
    setPaymentNotes("");
    setInternalNotes("");
    setGigType(null);
    setAccentColor("");
    setBandLogoUrl("");
    setHeroImageUrl("");
    setPackingChecklist([]);
    setMaterials([]);
    setSchedule([]);
    setActiveTab("schedule");

    // Reset Info tab visibility flags
    setShowDressCode(false);
    setShowBackline(false);
    setShowParking(false);
    setShowInternalNotes(false);
  };


  // Build current form data for auto-save
  const currentFormData: GigDraftFormData = {
    title,
    bandId,
    bandName,
    date,
    callTime,
    onStageTime,
    venueName,
    venueAddress,
    venueMapsUrl,
    lineup,
    setlistText,
    dressCode,
    backlineNotes,
    parkingNotes,
    paymentNotes,
    internalNotes,
    gigType,
    bandLogoUrl,
    heroImageUrl,
    accentColor,
    packingChecklist,
    materials,
    schedule,
  };

  // Auto-save draft for new gigs only (not when editing existing gigs)
  useGigDraftAutoSave(currentFormData, saveDraft, !isEditing && open);

  // Fetch user's bands on mount
  useEffect(() => {
    const fetchBands = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("bands") // Maps to 'projects' via view
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setBands(data as unknown as Band[]);
      }
    };

    fetchBands();
  }, []);

  // Reset form when gigPack changes (switching between edit targets)
  useEffect(() => {
    if (gigPack) {
      setTitle(gigPack.title || "");
      setBandId(gigPack.band_id || null);
      setBandName(gigPack.band_name || "");
      setDate(gigPack.date || "");
      setCallTime(gigPack.call_time || "");
      setOnStageTime(gigPack.on_stage_time || "");
      setVenueName(gigPack.venue_name || "");
      setVenueAddress(gigPack.venue_address || "");
      setVenueMapsUrl(gigPack.venue_maps_url || "");
      setLineup(gigPack.lineup || []);
      setSetlistText(gigPack.setlist || "");
      setSetlistPdfUrl(gigPack.setlist_pdf_url || null);
      setSetlistMode(gigPack.setlist_pdf_url ? "pdf" : "type");
      setDressCode(gigPack.dress_code || "");
      setBacklineNotes(gigPack.backline_notes || "");
      setParkingNotes(gigPack.parking_notes || "");
      setPaymentNotes(gigPack.payment_notes || "");
      setInternalNotes(gigPack.internal_notes || "");
      setBandLogoUrl(gigPack.band_logo_url || "");
      setHeroImageUrl(gigPack.hero_image_url || "");
      setAccentColor(gigPack.accent_color || "");
      setPackingChecklist(gigPack.packing_checklist || []);
      setMaterials(gigPack.materials || []);
      setSchedule(gigPack.schedule || []);
      setGigType(gigPack.gig_type || null);

      // Sync Info tab visibility flags
      setShowDressCode(!!gigPack.dress_code);
      setShowBackline(!!gigPack.backline_notes);
      setShowParking(!!gigPack.parking_notes);
      setShowInternalNotes(!!gigPack.internal_notes);
    }
  }, [gigPack]);

  // When opening in "create" mode (no gigPack), always start with blank form
  useEffect(() => {
    if (open && !gigPack && isDraftLoaded && !initialDraftCheckDone.current) {
      initialDraftCheckDone.current = true;
      resetFormToBlank();
    }
  }, [open, gigPack, isDraftLoaded]);

  // Handler to load draft into the form (called when user clicks "Resume Draft" button)
  const handleLoadDraft = () => {
    const draft = loadDraft();
    if (draft) {
      setTitle(draft.title || "");
      setBandId(draft.bandId || null);
      setBandName(draft.bandName || "");
      setDate(draft.date || "");
      setCallTime(draft.callTime || "");
      setOnStageTime(draft.onStageTime || "");
      setVenueName(draft.venueName || "");
      setVenueAddress(draft.venueAddress || "");
      setVenueMapsUrl(draft.venueMapsUrl || "");
      setLineup(draft.lineup?.length ? draft.lineup : []);
      setSetlistText(draft.setlistText || "");
      setDressCode(draft.dressCode || "");
      setBacklineNotes(draft.backlineNotes || "");
      setParkingNotes(draft.parkingNotes || "");
      setPaymentNotes(draft.paymentNotes || "");
      setInternalNotes(draft.internalNotes || "");
      setGigType(draft.gigType || null);
      setBandLogoUrl(draft.bandLogoUrl || "");
      setHeroImageUrl(draft.heroImageUrl || "");
      setAccentColor(draft.accentColor || "");
      setPackingChecklist(draft.packingChecklist || []);
      setMaterials(draft.materials || []);
      setSchedule(draft.schedule || []);
      setShowDressCode(!!draft.dressCode);
      setShowBackline(!!draft.backlineNotes);
      setShowParking(!!draft.parkingNotes);
      setShowInternalNotes(!!draft.internalNotes);
      // Mark draft as resumed so button becomes disabled
      setDraftResumed(true);
    }
  };

  // Reset the initial check flag and draft resumed state when panel closes
  useEffect(() => {
    if (!open) {
      initialDraftCheckDone.current = false;
      setDraftResumed(false);
    }
  }, [open]);

  // Lineup handlers
  const addLineupMember = () => {
    setLineup([...lineup, { role: "", name: "", notes: "" }]);
  };

  const removeLineupMember = (index: number) => {
    setLineup(lineup.filter((_, i) => i !== index));
  };

  const updateLineupMember = (index: number, field: keyof LineupMember, value: string) => {
    const newLineup = [...lineup];
    newLineup[index] = { ...newLineup[index], [field]: value };
    setLineup(newLineup);
  };

  // Add member from search (My Circle or System Users)
  const addLineupMemberFromSearch = (member: {
    name: string;
    role: string;
    userId?: string;
    linkedUserId?: string | null;
    contactId?: string;
  }) => {
    // Build the lineup member with user/contact IDs for proper notification handling
    const newMember: LineupMember = {
      role: member.role,
      name: member.name,
      notes: "",
      userId: member.userId,
      linkedUserId: member.linkedUserId,
      contactId: member.contactId,
    };

    // Check if we have an empty row to fill first
    const emptyRowIndex = lineup.findIndex(m => !m.name && !m.role);
    if (emptyRowIndex !== -1) {
      const newLineup = [...lineup];
      newLineup[emptyRowIndex] = newMember;
      setLineup(newLineup);
    } else {
      // Add new row
      setLineup([...lineup, newMember]);
    }
  };

  // Band selection handler - populate branding and lineup from band defaults
  const handleBandSelect = (selectedBandId: string) => {
    setBandId(selectedBandId);

    const selectedBand = bands.find((b) => b.id === selectedBandId);
    if (selectedBand) {
      // Update band name
      setBandName(selectedBand.name);

      // Populate branding from band
      if (selectedBand.band_logo_url) setBandLogoUrl(selectedBand.band_logo_url);
      if (selectedBand.hero_image_url) setHeroImageUrl(selectedBand.hero_image_url);
      if (selectedBand.accent_color) setAccentColor(selectedBand.accent_color);

      // Populate lineup from band defaults
      if (selectedBand.default_lineup && selectedBand.default_lineup.length > 0) {
        setLineup(selectedBand.default_lineup);
      }
    }
  };

  // Image remove helper
  const removeImageFromState = async (currentUrl: string, setUrl: (url: string) => void) => {
    if (currentUrl) {
      const path = getPathFromUrl(currentUrl);
      if (path) {
        await deleteImage(path);
      }
      setUrl("");
    }
  };

  // Image upload handlers - store locally for background upload on save
  const _handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file before storing
    const validationError = validateImageFile(file);
    if (validationError) {
      toast({
        title: tCommon("error"),
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    // Store file for background upload and create local preview
    setPendingLogoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(previewUrl);
    // Clear the actual URL so we know to upload
    setBandLogoUrl("");
  };

  const _handleHeroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file before storing
    const validationError = validateImageFile(file);
    if (validationError) {
      toast({
        title: tCommon("error"),
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    // Store file for background upload and create local preview
    setPendingHeroFile(file);
    const previewUrl = URL.createObjectURL(file);
    setHeroPreviewUrl(previewUrl);
    // Clear the actual URL so we know to upload
    setHeroImageUrl("");
  };

  const _handleRemoveLogo = () => {
    // Clear pending file and preview if any
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
      setLogoPreviewUrl(null);
      setPendingLogoFile(null);
    }
    removeImageFromState(bandLogoUrl, setBandLogoUrl);
  };

  const _handleRemoveHero = () => {
    // Clear pending file and preview if any
    if (heroPreviewUrl) {
      URL.revokeObjectURL(heroPreviewUrl);
      setHeroPreviewUrl(null);
      setPendingHeroFile(null);
    }
    removeImageFromState(heroImageUrl, setHeroImageUrl);
  };

  // Submit handler
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!title.trim()) {
      toast({
        title: tCommon("error"),
        description: t("titleRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    if (isEditing) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }

    try {
      const gigPackData = {
        title,
        band_id: bandId || null,
        band_name: bandName || null,
        date: date || null,
        call_time: callTime || null,
        on_stage_time: onStageTime || null,
        venue_name: venueName || null,
        venue_address: venueAddress || null,
        venue_maps_url: venueMapsUrl || null,
        lineup: lineup.filter((m) => m.role),
        setlist: setlistText || null,
        setlist_pdf_url: setlistPdfUrl || null,
        dress_code: dressCode || null,
        backline_notes: backlineNotes || null,
        parking_notes: parkingNotes || null,
        payment_notes: paymentNotes || null,
        internal_notes: internalNotes || null,
        theme: "minimal" as const,
        gig_type: gigType || null,
        // Use existing URLs (pending images will be uploaded in background)
        band_logo_url: bandLogoUrl || null,
        hero_image_url: heroImageUrl || null,
        accent_color: accentColor || null,
        poster_skin: "clean" as const,
        packing_checklist: packingChecklist.filter(item => item.label.trim()).length > 0
          ? packingChecklist.filter(item => item.label.trim())
          : null,
        materials: materials.length > 0 ? materials : null,
        schedule: schedule.length > 0 ? schedule : null,
        // Preserve existing public_slug when editing to keep share links stable
        public_slug: isEditing && gigPack?.public_slug ? gigPack.public_slug : undefined,
      };

      // Save gig first (fast) - optimistic update shows it immediately
      const result = await saveGigPackMutation.mutateAsync({
        data: gigPackData,
        isEditing,
        gigId: gigPack?.id
      });

      // Background image uploads - don't block the UI
      const gigId = result?.id || gigPack?.id;
      if (gigId && (pendingLogoFile || pendingHeroFile)) {
        // Start uploads in background (don't await)
        (async () => {
          try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const uploadPromises: Promise<void>[] = [];
            let newLogoUrl: string | null = null;
            let newHeroUrl: string | null = null;

            // Upload logo in background
            if (pendingLogoFile) {
              uploadPromises.push(
                (async () => {
                  setIsUploadingLogo(true);
                  const logoResult = await uploadImage(pendingLogoFile, user.id);
                  if (!("error" in logoResult)) {
                    newLogoUrl = logoResult.url;
                  }
                  setIsUploadingLogo(false);
                })()
              );
            }

            // Upload hero in background
            if (pendingHeroFile) {
              uploadPromises.push(
                (async () => {
                  setIsUploadingHero(true);
                  const heroResult = await uploadImage(pendingHeroFile, user.id);
                  if (!("error" in heroResult)) {
                    newHeroUrl = heroResult.url;
                  }
                  setIsUploadingHero(false);
                })()
              );
            }

            // Wait for all uploads to complete
            await Promise.all(uploadPromises);

            // Update gig with image URLs if any were uploaded
            if (newLogoUrl || newHeroUrl) {
              const imageUpdate: Record<string, string | null> = {};
              if (newLogoUrl) imageUpdate.band_logo_url = newLogoUrl;
              if (newHeroUrl) imageUpdate.hero_image_url = newHeroUrl;

              await updateGig(gigId, imageUpdate);

              // Update local state
              if (newLogoUrl) setBandLogoUrl(newLogoUrl);
              if (newHeroUrl) setHeroImageUrl(newHeroUrl);

              // Clear pending files and previews
              if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
              if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
              setPendingLogoFile(null);
              setPendingHeroFile(null);
              setLogoPreviewUrl(null);
              setHeroPreviewUrl(null);

              toast({
                title: t("uploadImage"),
                description: "Images uploaded successfully",
                duration: 2000,
              });
            }
          } catch (error) {
            console.error("Background image upload failed:", error);
            // Don't show error toast - gig was saved successfully
          }
        })();
      }

      if (isEditing) {
        if (onUpdateSuccess && result) {
          // Construct updated gigPack object
          // For now, we might need to reload the page or fetch updated data.
          // But passing partial data might be enough for optimistic update or parent refresh
          const updatedGigPack: Partial<GigPack> = {
            ...gigPack,
            ...gigPackData,
            theme: "minimal" as const,
            poster_skin: "clean" as const,
          };
          onUpdateSuccess(updatedGigPack as GigPack);
        } else {
          startTransition(() => {
            router.refresh();
          });
        }
      } else {
        // Clear draft on successful creation
        clearDraft();

        if (onCreateSuccess && result) {
          // Construct new gigPack object
          const newGigPack: Partial<GigPack> = {
            id: result.id,
            ...gigPackData,
            theme: "minimal" as const,
            poster_skin: "clean" as const,
            public_slug: result.publicSlug || "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          onCreateSuccess(newGigPack as GigPack);
        } else {
          onOpenChange(false);
        }
      }
    } catch (error) {
      console.error("Error saving gig pack:", error);
      toast({
        title: tCommon("error"),
        description: t("failedToSave"),
        variant: "destructive",
      });
      setJustSaved(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Public link handlers
  const copyPublicLink = () => {
    if (!gigPack) return;
    const url = `${window.location.origin}/p/${gigPack.public_slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: tCommon("copied"),
      description: tCommon("readyToShare"),
      duration: 2000,
    });
  };

  const openPublicView = () => {
    if (!gigPack) return;
    window.open(`/p/${gigPack.public_slug}`, "_blank");
  };

  const handleDelete = async () => {
    if (!gigPack || !onDelete) return;

    if (!window.confirm(t("deleteConfirm", { title: gigPack.title }))) {
      return;
    }

    onDelete(gigPack.id);
    onOpenChange(false);
  };

  // Handle paste schedule confirmation
  const handlePasteScheduleConfirm = (newItems: GigScheduleItem[]) => {
    // Add new items to existing schedule and sort by time
    const updatedSchedule = sortScheduleByTime([...schedule, ...newItems]);
    setSchedule(updatedSchedule);
  };

  // Tab configuration
  const tabs: TabItem[] = [
    { id: "schedule", label: t("schedule.tabLabel"), icon: <Clock3 className="h-4 w-4" /> },
    { id: "lineup", label: t("lineup"), icon: <Users className="h-4 w-4" /> },
    { id: "setlist", label: t("musicSetlist"), icon: <Music className="h-4 w-4" /> },
    { id: "materials", label: t("materials.tabLabel"), icon: <Paperclip className="h-4 w-4" /> },
    { id: "info", label: t("logistics"), icon: <Package className="h-4 w-4" /> },
  ];

  function EditorSkeleton() {
    return (
      <div className="flex flex-col h-full bg-background">
        {/* Header Skeleton */}
        <div className="border-b border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="border-b border-border px-4 py-2 flex gap-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-3 pt-4 border-t">
            <Skeleton className="h-4 w-32" />
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="border-t border-border p-4 flex gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  const content = (
    <form key={gigPack?.id || "new"} onSubmit={handleSubmit} className="flex flex-col h-full bg-background">
      <div className="sr-only">
        {isEditing ? t("editGigPackTitle") : t("createGigPackTitle")}
      </div>
      {/* ================================================================
                Top Icon Bar
                ================================================================ */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex-1 flex items-center gap-3">
          {/* Draft saved indicator - only for new gigs */}
          {!isEditing && lastSavedAt && (
            <span className="text-xs text-muted-foreground animate-in fade-in-0 duration-200">
              {tDraft("draftSaved")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isEditing && gigPack && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={openPublicView}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                title={tCommon("preview")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={copyPublicLink}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                title={tCommon("copyLink")}
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* More Options Menu - only show in edit mode when delete is available */}
          {isEditing && gigPack && onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div dir={locale === "he" ? "rtl" : "ltr"}>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {tCommon("delete")}
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ================================================================
                Scrollable Content Area
                ================================================================ */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
        {/* Title / Name */}
        <InlineInput
          name="title"
          id="gig-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("gigTitlePlaceholderWithExample", {
            example: getRandomGigPlaceholder(),
          })}
          required
          disabled={isLoading}
          autoFocus={false}
          displayClassName="text-2xl font-semibold leading-snug"
        />

        {/* Band Selector */}
        <div className="mt-1 mb-6 max-w-xs">
          <Select
            name="band"
            value={bandId || ""}
            onValueChange={handleBandSelect}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full h-auto bg-accent/10 hover:bg-accent/15 border-none shadow-none px-2 py-1.5 text-base text-muted-foreground hover:text-foreground rounded-md transition-colors" dir={locale === "he" ? "rtl" : "ltr"}>
              <SelectValue placeholder={t("selectBandPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="max-h-[220px]" dir={locale === "he" ? "rtl" : "ltr"}>
              {bands.map((band) => (
                <SelectItem key={band.id} value={band.id}>
                  {band.name}
                </SelectItem>
              ))}
              {bands.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No bands yet
                </div>
              )}
              <div className="border-t mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => router.push("/bands")}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground/70 hover:text-muted-foreground hover:bg-accent rounded-sm transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {tBands("createButton")}
                </button>
              </div>
            </SelectContent>
          </Select>
        </div>

        {/* ============================================================
                  Metadata Section
                  ============================================================ */}
        <div className="space-y-3 mb-6">
          {/* Date */}
          <MetadataRow label={t("date")}>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={isLoading}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 -mx-2 rounded transition-colors",
                    "hover:bg-accent/50 text-sm",
                    date ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="pl-1">{date ? format(parse(date, "yyyy-MM-dd", new Date()), "PPP", { locale: dateLocale }) : t("pickDate")}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date ? parse(date, "yyyy-MM-dd", new Date()) : undefined}
                  onSelect={(selectedDate) => {
                    setDate(selectedDate ? format(selectedDate, "yyyy-MM-dd") : "");
                    setDatePickerOpen(false);
                  }}
                  locale={dateLocale}
                  weekStartsOn={0}
                  formatters={locale === "he" ? {
                    formatWeekdayName: (d) => {
                      const day = d.getDay();
                      const hebrewDays = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
                      return hebrewDays[day];
                    }
                  } : undefined}
                  dir={locale === "he" ? "rtl" : "ltr"}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </MetadataRow>

          {/* Call Time */}
          <MetadataRow label={t("soundcheckTime")} inputId="call-time">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-muted-foreground" />
              <div className="w-16">
                <TimePicker
                  name="call_time"
                  id="call-time"
                  value={callTime}
                  onChange={setCallTime}
                  disabled={isLoading}
                />
              </div>
            </div>
          </MetadataRow>

          {/* On Stage Time */}
          <MetadataRow label={t("onStageTime")} inputId="on-stage-time">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-muted-foreground" />
              <div className="w-16">
                <TimePicker
                  name="on_stage_time"
                  id="on-stage-time"
                  value={onStageTime}
                  onChange={setOnStageTime}
                  disabled={isLoading}
                />
              </div>
            </div>
          </MetadataRow>

          {/* Venue */}
          <MetadataRow label={t("venueName")} inputId="venue-autocomplete">
            <div className="flex-1 space-y-1">
              <VenueAutocomplete
                value={venueName}
                onChange={setVenueName}
                onPlaceSelect={(place) => {
                  if (place.address) setVenueAddress(place.address);
                  if (place.mapsUrl) setVenueMapsUrl(place.mapsUrl);
                }}
                placeholder={t("venueNamePlaceholder")}
                disabled={isLoading}
              />
              {venueAddress && (
                <p className="text-xs text-muted-foreground">
                  📍 {venueAddress}
                </p>
              )}
            </div>
          </MetadataRow>

          {/* Gig Type */}
          <MetadataRow label={t("gigTypeLabel")} inputId="gig-type">
            <GigTypeSelect
              id="gig-type"
              value={gigType}
              onChange={setGigType}
              disabled={isLoading}
            />
          </MetadataRow>

        </div>

        {/* ============================================================
                  Tabs Section
                  ============================================================ */}
        <PanelTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
        <div className="mt-4 min-h-[200px]">
          {/* Lineup Tab */}
          {activeTab === "lineup" && (
            <div className="space-y-3">
              {lineup.map((member, index) => (
                <LineupMemberPill
                  key={index}
                  name={member.name || ""}
                  role={member.role}
                  notes={member.notes || ""}
                  invitationStatus={member.invitationStatus}
                  onNameChange={(name) => updateLineupMember(index, "name", name)}
                  onRoleChange={(role) => updateLineupMember(index, "role", role)}
                  onNotesChange={(notes) => updateLineupMember(index, "notes", notes)}
                  onRemove={() => removeLineupMember(index)}
                  disabled={isLoading}
                  showRemove={true}
                />
              ))}
              <div className="w-full">
                <LineupMemberSearch
                  onSelectMember={addLineupMemberFromSearch}
                  placeholder={t("searchMusicians")}
                  disabled={isLoading}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Setlist Tab */}
          {activeTab === "setlist" && (
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("musicSetlist")}
              </label>

              {/* Toggle: Type it / Upload PDF */}
              <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setSetlistMode("type")}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    setlistMode === "type"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="inline-block mr-1.5 h-3.5 w-3.5" />
                  Type it
                </button>
                <button
                  type="button"
                  onClick={() => setSetlistMode("pdf")}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    setlistMode === "pdf"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileUp className="inline-block mr-1.5 h-3.5 w-3.5" />
                  Upload PDF
                </button>
              </div>

              {setlistMode === "type" ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t("setlistTip")}
                  </p>
                  <Textarea
                    name="setlist"
                    value={setlistText}
                    onChange={(e) => setSetlistText(e.target.value)}
                    rows={16}
                    placeholder={t("setlistPlaceholder")}
                    disabled={isLoading}
                    className="text-base font-semibold"
                  />
                </div>
              ) : (
                <SetlistPDFUpload
                  pdfUrl={setlistPdfUrl}
                  onPdfUrlChange={setSetlistPdfUrl}
                  disabled={isLoading}
                />
              )}
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === "schedule" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("schedule.tabLabel")}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t("schedule.description")}
                </p>
              </div>

              {/* Schedule Items */}
              <div className="space-y-3">
                {sortScheduleByTime([...schedule]).map((item, index) => (
                  <div key={item.id} className="flex flex-col gap-2 sm:flex-row sm:items-center p-2 rounded-md border bg-background">
                    {/* Time Picker */}
                    <div className="w-[80px]">
                      <TimePicker
                        value={item.time || ""}
                        onChange={(newTime) => {
                          const newSchedule = [...schedule];
                          const itemIndex = schedule.findIndex(i => i.id === item.id);
                          if (itemIndex !== -1) {
                            newSchedule[itemIndex] = { ...item, time: newTime };
                            setSchedule(newSchedule);
                          }
                        }}
                        disabled={isLoading}
                      />
                    </div>

                    {/* Label Input */}
                    <div className="flex-1">
                      <Input
                        name={`schedule[${index}].label`}
                        value={item.label}
                        onChange={(e) => {
                          const newSchedule = [...schedule];
                          const itemIndex = schedule.findIndex(i => i.id === item.id);
                          if (itemIndex !== -1) {
                            newSchedule[itemIndex] = { ...item, label: e.target.value };
                            setSchedule(newSchedule);
                          }
                        }}
                        placeholder={t("schedule.labelPlaceholder")}
                        disabled={isLoading}
                        className="h-8"
                      />
                    </div>

                    {/* Remove Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSchedule(schedule.filter(i => i.id !== item.id));
                      }}
                      disabled={isLoading}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add Schedule Item Buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newItem: GigScheduleItem = {
                      id: crypto.randomUUID(),
                      time: null,
                      label: "",
                    };
                    setSchedule([...schedule, newItem]);
                  }}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                  {t("schedule.addButton")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPasteScheduleOpen(true)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Clipboard className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                  {t("schedule.pasteSchedule")}
                </Button>
              </div>
            </div>
          )}

          {/* Info/Logistics Tab */}
          {activeTab === "info" && (
            <div className="space-y-4">
              {/* Dress Code */}
              {showDressCode && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <Shirt className="h-4 w-4" />
                      {t("dressCode")}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setDressCode("");
                        setShowDressCode(false);
                      }}
                      disabled={isLoading}
                      className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      {t("materials.remove")}
                    </button>
                  </div>
                  <div className="flex h-8 w-full items-center rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring">
                    <input
                      name="dress_code"
                      type="text"
                      value={dressCode}
                      onChange={(e) => setDressCode(e.target.value)}
                      placeholder={t("dressCodePlaceholder")}
                      disabled={isLoading}
                      className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              )}

              {/* Gear / Backline */}
              {showBackline && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <Package className="h-4 w-4" />
                      {t("backlineNotes")}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setBacklineNotes("");
                        setShowBackline(false);
                      }}
                      disabled={isLoading}
                      className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      {t("materials.remove")}
                    </button>
                  </div>
                  <Textarea
                    name="backline_notes"
                    value={backlineNotes}
                    onChange={(e) => setBacklineNotes(e.target.value)}
                    placeholder={t("backlineNotesPlaceholder")}
                    rows={3}
                    disabled={isLoading}
                    className="resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring"
                  />
                </div>
              )}

              {/* Parking & Load-in */}
              {showParking && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <ParkingCircle className="h-4 w-4" />
                      {t("parkingNotes")}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setParkingNotes("");
                        setShowParking(false);
                      }}
                      disabled={isLoading}
                      className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      {t("materials.remove")}
                    </button>
                  </div>
                  <Textarea
                    name="parking_notes"
                    value={parkingNotes}
                    onChange={(e) => setParkingNotes(e.target.value)}
                    placeholder={t("parkingNotesPlaceholder")}
                    rows={3}
                    disabled={isLoading}
                    className="resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring"
                  />
                </div>
              )}

              {/* Private Notes */}
              {showInternalNotes && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {t("internalNotes")}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setInternalNotes("");
                        setShowInternalNotes(false);
                      }}
                      disabled={isLoading}
                      className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      {t("materials.remove")}
                    </button>
                  </div>
                  <Textarea
                    name="internal_notes"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder={t("internalNotesPlaceholder")}
                    rows={4}
                    disabled={isLoading}
                    className="resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("internalNotesDescription")}
                  </p>
                </div>
              )}

              {/* Add buttons for hidden fields */}
              <div className="space-y-2">
                {!showDressCode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDressCode(true)}
                    disabled={isLoading}
                    className="w-full justify-start text-xs"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5 rtl:ml-1.5 rtl:mr-0" />
                    <Shirt className="mr-1.5 h-3.5 w-3.5 rtl:ml-1.5 rtl:mr-0" />
                    {t("dressCode")}
                  </Button>
                )}
                {!showBackline && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBackline(true)}
                    disabled={isLoading}
                    className="w-full justify-start text-xs"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5 rtl:ml-1.5 rtl:mr-0" />
                    <Package className="mr-1.5 h-3.5 w-3.5 rtl:ml-1.5 rtl:mr-0" />
                    {t("backlineNotes")}
                  </Button>
                )}
                {!showParking && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowParking(true)}
                    disabled={isLoading}
                    className="w-full justify-start text-xs"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5 rtl:ml-1.5 rtl:mr-0" />
                    <ParkingCircle className="mr-1.5 h-3.5 w-3.5 rtl:ml-1.5 rtl:mr-0" />
                    {t("parkingNotes")}
                  </Button>
                )}
                {!showInternalNotes && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInternalNotes(true)}
                    disabled={isLoading}
                    className="w-full justify-start text-xs"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5 rtl:ml-1.5 rtl:mr-0" />
                    <FileText className="mr-1.5 h-3.5 w-3.5 rtl:ml-1.5 rtl:mr-0" />
                    {t("internalNotes")}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Materials Tab */}
          {activeTab === "materials" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("materials.description")}
              </p>

              {/* Materials List */}
              <div className="space-y-3">
                {materials.map((material, index) => (
                  <div key={material.id} className="space-y-2 rounded-md border bg-background p-3">
                    <div className="flex gap-2">
                      {/* Label Input */}
                      <Input
                        name={`materials[${index}].label`}
                        className="flex-1"
                        value={material.label}
                        onChange={(e) => {
                          const newMaterials = [...materials];
                          newMaterials[index] = { ...material, label: e.target.value };
                          setMaterials(newMaterials);
                        }}
                        placeholder={t("materials.labelPlaceholder")}
                        disabled={isLoading}
                      />

                      {/* Kind Select */}
                      <Select
                        name={`materials[${index}].kind`}
                        value={material.kind}
                        onValueChange={(value: GigMaterialKind) => {
                          const newMaterials = [...materials];
                          newMaterials[index] = { ...material, kind: value };
                          setMaterials(newMaterials);
                        }}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-[180px]" dir={locale === "he" ? "rtl" : "ltr"}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir={locale === "he" ? "rtl" : "ltr"}>
                          <SelectItem value="rehearsal">{t("materials.type.rehearsal")}</SelectItem>
                          <SelectItem value="performance">{t("materials.type.performance")}</SelectItem>
                          <SelectItem value="charts">{t("materials.type.charts")}</SelectItem>
                          <SelectItem value="reference">{t("materials.type.reference")}</SelectItem>
                          <SelectItem value="other">{t("materials.type.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* URL Input */}
                    <Input
                      name={`materials[${index}].url`}
                      value={material.url}
                      onChange={(e) => {
                        const newMaterials = [...materials];
                        newMaterials[index] = { ...material, url: e.target.value };
                        setMaterials(newMaterials);
                      }}
                      placeholder={t("materials.urlPlaceholder")}
                      type="url"
                      disabled={isLoading}
                    />

                    {/* Actions */}
                    <div className="flex justify-between items-center text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          if (material.url) {
                            window.open(material.url, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        disabled={!material.url || isLoading}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-50 flex items-center gap-1"
                      >
                        <Link2 className="h-3 w-3" />
                        {t("materials.open")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newMaterials = materials.filter((_, i) => i !== index);
                          setMaterials(newMaterials);
                        }}
                        disabled={isLoading}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        {t("materials.remove")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Material Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newMaterial: GigMaterial = {
                    id: crypto.randomUUID(),
                    label: "",
                    url: "",
                    kind: "other",
                  };
                  setMaterials([...materials, newMaterial]);
                }}
                disabled={isLoading}
                className="mt-2"
              >
                <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                {t("materials.addButton")}
              </Button>
            </div>
          )}

        </div>
      </div>

      {/* ================================================================
                Bottom Action Bar
                ================================================================ */}
      <div className="border-t border-border px-6 py-4 bg-background">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              disabled={isLoading}
              className={cn(
                "h-10 px-5 rounded-xl font-medium",
                "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              {justSaved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {tCommon("saved")}
                </>
              ) : isLoading ? (
                <span className="animate-pulse">
                  {isEditing ? tCommon("saving") : tCommon("creating")}
                </span>
              ) : isEditing ? (
                tCommon("save")
              ) : (
                t("createGigPackButton")
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground"
            >
              {tCommon("cancel")}
            </Button>
          </div>

          {/* Resume Draft button - only for new gigs when draft exists and not yet resumed */}
          {!isEditing && hasDraft && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleLoadDraft}
              disabled={isLoading || draftResumed}
              className="text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-4 w-4 mr-2" />
              {tDraft("resumeButton")}
            </Button>
          )}
        </div>
      </div>
    </form>
  );

  if (mode === "page") {
    return (
      <>
        <div className="w-full h-full overflow-hidden bg-background rounded-lg shadow-sm border">
          {content}
        </div>

        <PasteScheduleDialog
          open={pasteScheduleOpen}
          onOpenChange={setPasteScheduleOpen}
          onConfirm={handlePasteScheduleConfirm}
          existingSchedule={schedule}
        />
      </>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className={cn(
            "w-full sm:max-w-2xl p-0 gap-0 overflow-hidden",
            "bg-background border-l border-border",
            "shadow-2xl",
            "[&>button]:hidden" // Hide default close button, we have our own
          )}
        >
          <SheetTitle className="sr-only">
            {isEditing ? t("editGigPackTitle") : t("createGigPackTitle")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {isEditing ? t("editGigPackTitle") : t("createGigPackTitle")}
          </SheetDescription>
          {loading && isEditing ? <EditorSkeleton /> : content}
        </SheetContent>
      </Sheet>

      <PasteScheduleDialog
        open={pasteScheduleOpen}
        onOpenChange={setPasteScheduleOpen}
        onConfirm={handlePasteScheduleConfirm}
        existingSchedule={schedule}
      />
    </>
  );
}

export default GigEditorPanel;

