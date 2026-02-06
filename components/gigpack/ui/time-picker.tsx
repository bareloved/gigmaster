"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover"

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, "0")
      const m = minute.toString().padStart(2, "0")
      slots.push(`${h}:${m}`)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

function parseTimeInput(input: string): string | null {
  if (!input) return null
  const cleaned = input.trim().toLowerCase()
  const colonMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/)
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10)
    const minutes = parseInt(colonMatch[2], 10)
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
    }
  }
  const fourDigitMatch = cleaned.match(/^(\d{2})(\d{2})$/)
  if (fourDigitMatch) {
    const hours = parseInt(fourDigitMatch[1], 10)
    const minutes = parseInt(fourDigitMatch[2], 10)
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
    }
  }
  const threeDigitMatch = cleaned.match(/^(\d)(\d{2})$/)
  if (threeDigitMatch) {
    const hours = parseInt(threeDigitMatch[1], 10)
    const minutes = parseInt(threeDigitMatch[2], 10)
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
    }
  }
  return null
}

interface TimePickerProps {
  value?: string
  onChange?: (time: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  name?: string
  id?: string
}

export function TimePicker({
  value,
  onChange,
  placeholder = "--:--",
  disabled = false,
  className,
  name,
  id,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value || "")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const scrollNodeRef = React.useRef<HTMLDivElement | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setInputValue(value || "")
  }, [value])

  const scrollContainerRef = React.useCallback((node: HTMLDivElement | null) => {
    scrollNodeRef.current = node
    if (node) {
      const targetTime = value || "09:00"
      const targetElement = node.querySelector(`[data-time="${targetTime}"]`) as HTMLElement
      if (targetElement) {
        requestAnimationFrame(() => {
          targetElement.scrollIntoView({
            block: "center",
            behavior: "instant",
          })
        })
      }
    }
  }, [value])

  const handleSelect = (time: string) => {
    setInputValue(time)
    onChange?.(time)
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const relatedTarget = e.relatedTarget as HTMLElement
    if (containerRef.current?.contains(relatedTarget) || scrollNodeRef.current?.contains(relatedTarget)) {
      return
    }
    const parsed = parseTimeInput(inputValue)
    if (parsed) {
      setInputValue(parsed)
      onChange?.(parsed)
    } else if (inputValue && inputValue !== value) {
      setInputValue(value || "")
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const parsed = parseTimeInput(inputValue)
      if (parsed) {
        setInputValue(parsed)
        onChange?.(parsed)
        setOpen(false)
      }
      e.preventDefault()
    } else if (e.key === "Escape") {
      setInputValue(value || "")
      setOpen(false)
    } else if (e.key === "ArrowDown") {
      setOpen(true)
      e.preventDefault()
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = scrollNodeRef.current
    if (container) {
      container.scrollTop += e.deltaY
    }
  }

  const handleContainerClick = () => {
    if (!disabled) {
      setOpen(true)
      inputRef.current?.focus()
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverAnchor asChild>
        <div
          ref={containerRef}
          onClick={handleContainerClick}
          className={cn(
            "flex h-8 w-[80px] items-center justify-center rounded-md border border-input bg-transparent px-3 py-1 text-base md:text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring cursor-text",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
        >
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            name={name}
            id={id}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground cursor-text text-center"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[100px] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div
          ref={scrollContainerRef}
          onWheel={handleWheel}
          className="max-h-[280px] overflow-y-auto overscroll-contain p-1"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        >
          {TIME_SLOTS.map((time) => {
            const isSelected = value === time
            return (
              <button
                key={time}
                data-time={time}
                onClick={() => handleSelect(time)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus:bg-accent focus:outline-none",
                  isSelected && "bg-primary/10 font-medium text-primary"
                )}
              >
                {time}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

