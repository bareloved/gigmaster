"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface RoleSelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

// Predefined band roles - these match the translation keys
const PREDEFINED_ROLES = [
  "vocals",
  "guitar",
  "bass",
  "drums",
  "keys",
  "percussion",
  "saxophone",
  "trumpet",
  "trombone",
  "violin",
  "cello",
  "dj",
  "bandLeader",
] as const

const CUSTOM_VALUE = "__custom__"

/**
 * RoleSelect: A dropdown for selecting band member roles
 * 
 * Features:
 * - Predefined common roles (vocals, guitar, bass, etc.)
 * - Custom role input for roles not in the list
 * - Automatically shows custom input if value doesn't match predefined roles
 * - Stores plain string value (no schema changes needed)
 */
export function RoleSelect({ value, onChange, disabled, className }: RoleSelectProps) {
  const t = useTranslations("gigpack.roles")
  const tCommon = useTranslations("gigpack")
  const locale = useLocale()
  
  // Check if current value is a predefined role
  const isPredefinedRole = PREDEFINED_ROLES.some(
    (role) => t(role).toLowerCase() === value.toLowerCase()
  )
  
  // Track whether to show custom input
  const [showCustom, setShowCustom] = React.useState(!isPredefinedRole && value !== "")
  const [customValue, setCustomValue] = React.useState(isPredefinedRole ? "" : value)
  
  // Current select value: either the matching predefined role key or CUSTOM_VALUE
  const selectValue = React.useMemo(() => {
    if (!value) return ""
    
    const matchingRole = PREDEFINED_ROLES.find(
      (role) => t(role).toLowerCase() === value.toLowerCase()
    )
    
    return matchingRole || CUSTOM_VALUE
  }, [value, t])
  
  const handleSelectChange = (newValue: string) => {
    if (newValue === CUSTOM_VALUE) {
      // User selected "Custom..." - show input
      setShowCustom(true)
      setCustomValue(value || "")
      // Don't change the actual value yet, wait for them to type
    } else {
      // User selected a predefined role
      setShowCustom(false)
      setCustomValue("")
      onChange(t(newValue as typeof PREDEFINED_ROLES[number]))
    }
  }
  
  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCustomValue = e.target.value
    setCustomValue(newCustomValue)
    onChange(newCustomValue)
  }
  
  if (showCustom) {
    // Show custom input mode
    return (
      <div className={cn("flex gap-2", className)}>
        <Select value={CUSTOM_VALUE} onValueChange={handleSelectChange} disabled={disabled}>
          <SelectTrigger className="w-[120px] h-8 text-xs" dir={locale === "he" ? "rtl" : "ltr"}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir={locale === "he" ? "rtl" : "ltr"}>
            {PREDEFINED_ROLES.map((role) => (
              <SelectItem key={role} value={role} className="text-sm">
                {t(role)}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_VALUE} className="text-sm">
              {tCommon("customRole")}
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={customValue}
          onChange={handleCustomInputChange}
          placeholder={tCommon("customRolePlaceholder")}
          disabled={disabled}
          className="flex-1 h-8 text-sm"
          autoFocus
        />
      </div>
    )
  }
  
  // Show standard select mode
  return (
    <Select value={selectValue} onValueChange={handleSelectChange} disabled={disabled}>
      <SelectTrigger className={cn("h-8 text-sm", className)} dir={locale === "he" ? "rtl" : "ltr"}>
        <SelectValue placeholder={tCommon("rolePlaceholder")} />
      </SelectTrigger>
      <SelectContent dir={locale === "he" ? "rtl" : "ltr"}>
        {PREDEFINED_ROLES.map((role) => (
          <SelectItem key={role} value={role} className="text-sm">
            {t(role)}
          </SelectItem>
        ))}
        <SelectItem value={CUSTOM_VALUE} className="text-sm">
          {tCommon("customRole")}
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

