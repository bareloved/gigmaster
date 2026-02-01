"use client"

import * as React from "react"
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps"
import { MapPin, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

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

// Inner component that uses the Places library
function VenueAutocompleteInner({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Search for a venue...",
  disabled = false,
  className,
}: VenueAutocompleteProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const autocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null)
  const inputValueRef = React.useRef(value || "")
  const [isReady, setIsReady] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value || "")
  const places = useMapsLibrary("places")

  // Store callbacks in refs so they're always current
  const onChangeRef = React.useRef(onChange)
  const onPlaceSelectRef = React.useRef(onPlaceSelect)

  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  React.useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect
  }, [onPlaceSelect])

  // Sync input value with prop and update Google Places input
  React.useEffect(() => {
    const newValue = value || ""
    setInputValue(newValue)
    inputValueRef.current = newValue
    
    // Also update the Google Places autocomplete input
    if (autocompleteRef.current) {
      // @ts-expect-error - Google Places Autocomplete exposes DOM via querySelector at runtime
      const input = autocompleteRef.current.querySelector("input")
      if (input && input.value !== newValue) {
        input.value = newValue
      }
    }
  }, [value])

  const styleAutocompleteInput = React.useCallback((autocomplete: Element) => {
    const shadowRoot = (autocomplete as HTMLElement & { shadowRoot: ShadowRoot | null }).shadowRoot
    if (shadowRoot) {
      // Remove previous styles to allow theme switching
      const existingStyles = shadowRoot.querySelectorAll("[data-theme-style]")
      existingStyles.forEach(s => s.remove())
      
      // Detect dark mode and set appropriate colors
      const isDark = document.documentElement.classList.contains("dark")
      const textColor = isDark ? "#fafafa" : "#0a0a0a"
      const placeholderColor = isDark ? "#a1a1aa" : "#71717a"
      
      // Inject styles with computed colors (CSS vars don't work in shadow DOM)
      const styleEl = document.createElement("style")
      styleEl.setAttribute("data-theme-style", "true")
      styleEl.textContent = `
        input {
          height: 100% !important;
          width: 100% !important;
          border-radius: 0 !important;
          border: none !important;
          background: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
          font-size: 14px !important;
          outline: none !important;
          box-shadow: none !important;
          color: ${textColor} !important;
          caret-color: ${textColor} !important;
          -webkit-text-fill-color: ${textColor} !important;
        }
        input::placeholder,
        input::-webkit-input-placeholder,
        input::-moz-placeholder {
          color: ${placeholderColor} !important;
          opacity: 1 !important;
        }
        input:focus {
          outline: none !important;
          box-shadow: none !important;
        }
      `
      shadowRoot.insertBefore(styleEl, shadowRoot.firstChild)
      
      return true
    }
    return false
  }, [])

  // Initialize the autocomplete when places library is ready
  React.useEffect(() => {
    if (!places || !containerRef.current) return

    // Create the Place Autocomplete element
    // @ts-expect-error - PlaceAutocompleteElement exists in newer Places API
    const autocomplete = new places.PlaceAutocompleteElement({})
    autocompleteRef.current = autocomplete

    // Listen for place selection (gmp-select event)
    const handlePlaceSelect = async (event: CustomEvent<{ placePrediction: { toPlace: () => google.maps.places.Place } }>) => {
      try {
        const placePrediction = event.detail?.placePrediction || (event as { placePrediction?: { toPlace: () => google.maps.places.Place } }).placePrediction
        if (!placePrediction) return

        const place = placePrediction.toPlace()
        
        await place.fetchFields({ 
          fields: ["displayName", "formattedAddress", "googleMapsURI"] 
        })

        const name = place.displayName || ""
        const address = place.formattedAddress || ""
        const mapsUrl = place.googleMapsURI || ""

        setInputValue(name)
        inputValueRef.current = name
        onChangeRef.current?.(name)
        onPlaceSelectRef.current?.({ name, address, mapsUrl })
      } catch {
        // Silently handle errors
      }
    }

    autocomplete.addEventListener("gmp-select", handlePlaceSelect)

    // Clear and append
    containerRef.current.innerHTML = ""
    containerRef.current.appendChild(autocomplete)
    
    // Set placeholder and initial value on the input
    const initTimer = setTimeout(() => {
      const input = autocomplete.querySelector("input")
      if (input) {
        input.placeholder = placeholder
        const currentVal = inputValueRef.current
        if (currentVal) {
          input.value = currentVal
        }
        
        // Listen for input changes to keep our state in sync
        input.addEventListener("input", (e: Event) => {
          const target = e.target as HTMLInputElement
          const newVal = target.value
          setInputValue(newVal)
          inputValueRef.current = newVal
          onChangeRef.current?.(newVal)
        })
      }
    }, 0)

    // Apply styles to shadow DOM input
    styleAutocompleteInput(autocomplete)
    const timers = [
      setTimeout(() => styleAutocompleteInput(autocomplete), 50),
      setTimeout(() => styleAutocompleteInput(autocomplete), 150),
      setTimeout(() => styleAutocompleteInput(autocomplete), 300),
    ]

    setIsReady(true)

    // Copy containerRef.current to a variable for cleanup
    const container = containerRef.current

    return () => {
      clearTimeout(initTimer)
      timers.forEach(clearTimeout)
      autocomplete.removeEventListener("gmp-select", handlePlaceSelect)
      autocompleteRef.current = null
      if (container) {
        container.innerHTML = ""
      }
    }
  }, [places, styleAutocompleteInput, placeholder])

  // Re-apply styles when theme changes (listen for class changes on html element)
  React.useEffect(() => {
    if (!containerRef.current || !isReady) return
    
    const observer = new MutationObserver(() => {
      const autocomplete = containerRef.current?.querySelector("gmp-place-autocomplete")
      if (autocomplete) {
        styleAutocompleteInput(autocomplete)
      }
    })

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    
    return () => observer.disconnect()
  }, [isReady, styleAutocompleteInput])

  // Ensure input value is set after initialization
  React.useEffect(() => {
    if (!isReady || !autocompleteRef.current || !inputValue) return

    // @ts-expect-error - Google Places Autocomplete exposes DOM via querySelector at runtime
    const input = autocompleteRef.current.querySelector("input")
    if (input && input.value !== inputValue) {
      input.value = inputValue
    }
  }, [isReady, inputValue])

  if (!places) {
    return (
      <div className={cn(
        "flex h-8 w-full items-center rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm",
        className
      )}>
        <span className="flex-1 text-muted-foreground">{placeholder}</span>
        <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex h-8 w-full items-center rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <div
        ref={containerRef}
        className="flex-1 [&_gmp-place-autocomplete]:bg-transparent [&_gmp-place-autocomplete]:border-0 [&_gmp-place-autocomplete]:shadow-none [&_gmp-place-autocomplete]:p-0 [&_gmp-place-autocomplete]:m-0 [&_gmp-place-autocomplete:focus]:border-0 [&_gmp-place-autocomplete:focus]:shadow-none [&_input]:bg-transparent [&_input]:border-0 [&_input]:outline-none [&_input]:shadow-none [&_input]:p-0 [&_input]:m-0 [&_input:focus]:border-0 [&_input:focus]:outline-none [&_input:focus]:shadow-none"
      />
      <MapPin className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
    </div>
  )
}

// Wrapper with fallback for when API key is not set
export function VenueAutocomplete(props: VenueAutocompleteProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  const [inputValue, setInputValue] = React.useState(props.value || "")

  // Sync with prop
  React.useEffect(() => {
    setInputValue(props.value || "")
  }, [props.value])

  // Fallback when no API key
  if (!apiKey) {
    return (
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            props.onChange?.(e.target.value)
          }}
          placeholder={props.placeholder}
          disabled={props.disabled}
          className={props.className}
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey}>
      <VenueAutocompleteInner {...props} />
    </APIProvider>
  )
}
