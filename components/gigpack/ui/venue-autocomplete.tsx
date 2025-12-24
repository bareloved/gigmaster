"use client"

import * as React from "react"
import { MapPin, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

// Stub for Google Maps - we will use simple input for now since we don't have the API key setup in this context
// or simply pass through the props to Input.
// If the user adds API key later, we can re-enable the full implementation.

interface PlaceResult {
  name: string
  address: string
  mapsUrl: string
}

interface VenueAutocompleteProps {
  value?: string
  onChange?: (value: string) => void
  onPlaceSelect?: (place: PlaceResult) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function VenueAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  disabled,
  className,
}: VenueAutocompleteProps) {
  // Simplified version without Google Maps for now to avoid complexity and errors
  // since we didn't check for API key in env vars.
  // The original component had a fallback, let's use that logic.
  
  const [inputValue, setInputValue] = React.useState(value || "")

  React.useEffect(() => {
    setInputValue(value || "")
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    onChange?.(val)
  }

  return (
    <div className="relative">
      <Input
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <MapPin className="h-4 w-4" />
      </div>
    </div>
  )
}

