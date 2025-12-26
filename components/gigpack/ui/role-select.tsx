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
import { cn } from "@/lib/utils"

interface RoleSelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  name?: string
  id?: string
}

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

export function RoleSelect({ value, onChange, disabled, className, name, id }: RoleSelectProps) {
  const t = useTranslations("gigpack.roles")
  const tCommon = useTranslations("gigpack")
  const locale = useLocale()

  // Check if current value is a predefined role
  const isPredefinedRole = PREDEFINED_ROLES.some(
    (role) => t(role).toLowerCase() === value?.toLowerCase()
  )

  const [showCustom, setShowCustom] = React.useState(!isPredefinedRole && value !== "")
  const [customValue, setCustomValue] = React.useState(isPredefinedRole ? "" : value)

  const selectValue = React.useMemo(() => {
    if (!value) return ""

    const matchingRole = PREDEFINED_ROLES.find(
      (role) => t(role).toLowerCase() === value.toLowerCase()
    )

    return matchingRole || CUSTOM_VALUE
  }, [value, t])

  const handleSelectChange = (newValue: string) => {
    if (newValue === CUSTOM_VALUE) {
      setShowCustom(true)
      setCustomValue(value || "")
    } else {
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
          name={name}
          id={id}
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

  return (
    <Select name={name} value={selectValue} onValueChange={handleSelectChange} disabled={disabled}>
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

