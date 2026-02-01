"use client"

import * as React from "react"
import { useTranslations, useLocale } from "@/lib/gigpack/i18n"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface GigTypeSelectProps {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
  className?: string
  id?: string
}

// Predefined gig types - these match the database values and translation keys
const PREDEFINED_GIG_TYPES = [
  "wedding",
  "club_show",
  "corporate",
  "bar_gig",
  "coffee_house",
  "festival",
  "rehearsal",
] as const

// Map of database values to translation keys
const GIG_TYPE_TRANSLATION_KEYS: Record<string, string> = {
  wedding: "wedding",
  club_show: "clubShow",
  corporate: "corporate",
  bar_gig: "barGig",
  coffee_house: "coffeeHouse",
  festival: "festival",
  rehearsal: "rehearsal",
}

const CUSTOM_VALUE = "__custom__"

/**
 * GigTypeSelect: A dropdown for selecting gig types
 *
 * Features:
 * - Predefined common gig types (wedding, corporate, bar gig, etc.)
 * - Custom type input for types not in the list
 * - Automatically shows custom input if value doesn't match predefined types
 * - Stores plain string value (no schema changes needed)
 */
export function GigTypeSelect({ value, onChange, disabled, className, id }: GigTypeSelectProps) {
  const t = useTranslations("gigpack")
  const locale = useLocale()

  // Check if current value is a predefined gig type
  const isPredefinedType = value ? PREDEFINED_GIG_TYPES.includes(value as typeof PREDEFINED_GIG_TYPES[number]) : false

  // Track whether to show custom input
  const [showCustom, setShowCustom] = React.useState(!isPredefinedType && value !== null && value !== "")
  const [customValue, setCustomValue] = React.useState(isPredefinedType ? "" : (value || ""))

  // Current select value: either the matching predefined type or CUSTOM_VALUE
  const selectValue = React.useMemo(() => {
    if (!value) return ""

    if (PREDEFINED_GIG_TYPES.includes(value as typeof PREDEFINED_GIG_TYPES[number])) {
      return value
    }

    return CUSTOM_VALUE
  }, [value])

  const handleSelectChange = (newValue: string) => {
    if (newValue === CUSTOM_VALUE) {
      // User selected "Custom..." - show input
      setShowCustom(true)
      setCustomValue(value || "")
      // Don't change the actual value yet, wait for them to type
    } else {
      // User selected a predefined gig type
      setShowCustom(false)
      setCustomValue("")
      onChange(newValue)
    }
  }

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCustomValue = e.target.value
    setCustomValue(newCustomValue)
    onChange(newCustomValue || null)
  }

  const handleClearCustom = () => {
    setShowCustom(false)
    setCustomValue("")
    onChange(null)
  }

  // Get translated label for a gig type
  const getGigTypeLabel = (type: typeof PREDEFINED_GIG_TYPES[number]) => {
    const translationKey = GIG_TYPE_TRANSLATION_KEYS[type]
    return t(`gigType.${translationKey}`)
  }

  if (showCustom) {
    // Show custom input mode - full-width input with clear button
    return (
      <div className={cn("relative", className)} dir={locale === "he" ? "rtl" : "ltr"}>
        <Input
          id={id}
          value={customValue}
          onChange={handleCustomInputChange}
          placeholder={t("customGigTypePlaceholder")}
          disabled={disabled}
          className={cn(
            "w-full h-8 text-sm",
            locale === "he" ? "pl-8" : "pr-8"
          )}
          autoFocus
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClearCustom}
          disabled={disabled}
          className={cn(
            "absolute top-0 h-8 w-8 text-muted-foreground hover:text-destructive",
            locale === "he" ? "left-0" : "right-0"
          )}
          aria-label={t("clearCustomGigType")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Show standard select mode
  return (
    <Select value={selectValue} onValueChange={handleSelectChange} disabled={disabled}>
      <SelectTrigger id={id} className={cn("h-8 text-sm", className)} dir={locale === "he" ? "rtl" : "ltr"}>
        <SelectValue placeholder={t("selectGigType")} />
      </SelectTrigger>
      <SelectContent dir={locale === "he" ? "rtl" : "ltr"}>
        {PREDEFINED_GIG_TYPES.map((type) => (
          <SelectItem key={type} value={type} className="text-sm">
            {getGigTypeLabel(type)}
          </SelectItem>
        ))}
        <SelectItem value={CUSTOM_VALUE} className="text-sm">
          {t("customGigType")}
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
