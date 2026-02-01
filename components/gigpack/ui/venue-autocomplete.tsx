/// <reference types="google.maps" />
"use client"

import * as React from "react"
import { useMapsLibrary } from "@vis.gl/react-google-maps"
import { MapPin, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"

interface VenueAutocompleteProps {
  value?: string
  onChange?: (value: string) => void
  onPlaceSelect?: (place: { name: string; address: string; mapsUrl: string }) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function VenueAutocompleteInner({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  disabled,
  className,
}: VenueAutocompleteProps) {
  const places = useMapsLibrary("places")
  const [sessionToken, setSessionToken] = React.useState<google.maps.places.AutocompleteSessionToken | null>(null)

  const [inputValue, setInputValue] = React.useState(value || "")
  const [predictions, setPredictions] = React.useState<google.maps.places.AutocompleteSuggestion[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  // Track when a selection was just made to prevent re-fetching
  const justSelectedRef = React.useRef(false)
  // Track whether the user actually typed (vs value set from prop)
  const userTypedRef = React.useRef(false)

  const containerRef = React.useRef<HTMLDivElement>(null)

  // Initialization
  React.useEffect(() => {
    if (!places) return
    setSessionToken(new places.AutocompleteSessionToken())
  }, [places])

  // Sync prop value to local state
  React.useEffect(() => {
    if (value !== undefined) {
      setInputValue(value)
    }
  }, [value])

  const debouncedInput = useDebounce(inputValue, 300)

  // Fetch predictions
  React.useEffect(() => {
    if (!debouncedInput || !places || !sessionToken) {
      setPredictions([])
      return
    }

    // Skip if a selection was just made or value came from props (not user typing)
    if (justSelectedRef.current || !userTypedRef.current) {
      return
    }

    const fetchSuggestions = async () => {
      setLoading(true)
      try {
        const request: google.maps.places.AutocompleteRequest = {
          input: debouncedInput,
          sessionToken: sessionToken,
        }

        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
        setPredictions(suggestions)
        setIsOpen(true)
      } catch (error) {
        console.error("Error fetching suggestions:", error)
        setPredictions([])
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestions()
  }, [debouncedInput, places, sessionToken])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    userTypedRef.current = true
    setInputValue(val)
    onChange?.(val)
    if (!val) {
      setPredictions([])
      setIsOpen(false)
    }
  }

  const handleSelect = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!places || !sessionToken || !suggestion.placePrediction) return

    const placePrediction = suggestion.placePrediction
    const mainText = placePrediction.mainText?.text || ""

    // Mark that we just selected to prevent re-fetching
    justSelectedRef.current = true
    userTypedRef.current = false
    setInputValue(mainText)
    onChange?.(mainText)
    setIsOpen(false)
    setPredictions([])

    // Reset the flag after debounce delay + safety margin (500ms total)
    setTimeout(() => {
      justSelectedRef.current = false
    }, 500)

    try {
      const place = placePrediction.toPlace() // Returns a Place object

      // We need to fetch fields. ensure "displayName" is requested for name.
      // Note: In new API, 'name' is the resource name (e.g. places/LOC_ID). 'displayName' is the human readable name.
      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "googleMapsURI"],
      })

      if (onPlaceSelect) {
        onPlaceSelect({
          name: place.displayName || "", // displayName is a string in the Place class (or sometimes undefined)
          address: place.formattedAddress || "",
          mapsUrl: place.googleMapsURI || "",
        })

        // Reset session token
        setSessionToken(new places.AutocompleteSessionToken())
      }
    } catch (error) {
      console.error("Error fetching place details:", error)
    }
  }

  // Handle outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          name="venue"
          id="venue-autocomplete"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (predictions.length > 0) setIsOpen(true)
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="pl-9"
        />
        {loading && (
          <div className="absolute right-3 top-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {isOpen && predictions.length > 0 && (
        <div className="absolute z-[60] mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {predictions.map((suggestion) => {
            const prediction = suggestion.placePrediction
            if (!prediction) return null

            return (
              <div
                key={prediction.placeId}
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                onClick={() => handleSelect(suggestion)}
              >
                <MapPin className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <div className="flex flex-col">
                  <span className="font-medium">
                    {prediction.mainText?.text || ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {prediction.secondaryText?.text || ""}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Wrapper to provide API context if needed, but usually APIProvider is higher up.
// However, existing usage had APIProvider inside.
// We should check if APIProvider is up the tree. 
// Based on previous code, APIProvider was here.

import { APIProvider } from "@vis.gl/react-google-maps"
import { AlertCircle } from "lucide-react"

export function VenueAutocomplete(props: VenueAutocompleteProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <div className="relative">
        <Input
          value={props.value}
          onChange={(e) => props.onChange?.(e.target.value)}
          placeholder={props.placeholder}
          disabled={props.disabled}
          autoComplete="off"
          className={props.className}
        />
        <div className="absolute right-3 top-2.5 text-muted-foreground" title="Google Places API Key missing">
          <AlertCircle className="h-4 w-4 text-orange-500" />
        </div>
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["places"]}>
      <VenueAutocompleteInner {...props} />
    </APIProvider>
  )
}
