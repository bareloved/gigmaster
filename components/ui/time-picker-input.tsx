"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TimePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Generate time options in 30-minute intervals
function generateTimeOptions() {
  const times: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
      times.push(timeString);
    }
  }
  return times;
}

export function TimePickerInput({
  value: rawValue,
  onChange,
  disabled,
  placeholder = "Pick a time",
}: TimePickerInputProps) {
  // Strip seconds from DB values like "09:15:00" → "09:15"
  const value = rawValue?.replace(/^(\d{1,2}:\d{2}):\d{2}$/, "$1") ?? "";
  const [open, setOpen] = React.useState(false);
  const [manualInput, setManualInput] = React.useState(value);
  const timeOptions = generateTimeOptions();

  React.useEffect(() => {
    setManualInput(value);
  }, [value]);

  const handleSelectTime = (time: string) => {
    onChange(time);
    setManualInput(time);
    setOpen(false);
  };

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setManualInput(inputValue);
    
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (timeRegex.test(inputValue)) {
      onChange(inputValue);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[200px] p-0" 
        align="start" 
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b">
          <Input
            type="time"
            step={60}
            value={manualInput}
            onChange={handleManualInputChange}
            placeholder="HH:MM"
            disabled={disabled}
            className="h-9"
          />
        </div>
        <div 
          className="h-[200px] overflow-y-scroll p-1"
          onWheel={(e) => {
            e.stopPropagation();
          }}
        >
          {timeOptions.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => handleSelectTime(time)}
              className={cn(
                "block w-full px-3 py-2 text-sm text-left rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                value === time && "bg-accent text-accent-foreground font-medium"
              )}
              disabled={disabled}
            >
              {time}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

