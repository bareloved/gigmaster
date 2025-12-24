"use client";

import { PackingChecklistItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, ChevronUp, ChevronDown, CheckSquare } from "lucide-react";

interface PackingChecklistEditorProps {
  value: PackingChecklistItem[];
  onChange: (items: PackingChecklistItem[]) => void;
  disabled?: boolean;
}

/**
 * PackingChecklistEditor Component
 * 
 * Allows managers to define a packing checklist for their gig.
 * Each musician viewing the public page can tick items off on their own device.
 * 
 * Features:
 * - Add/remove checklist items
 * - Edit item labels
 * - Reorder items (move up/down)
 * - Each item gets a stable unique ID
 */
export function PackingChecklistEditor({ value, onChange, disabled = false }: PackingChecklistEditorProps) {
  // Generate unique IDs
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addItem = () => {
    const newItem: PackingChecklistItem = {
      id: generateId(),
      label: "",
    };
    onChange([...value, newItem]);
  };

  const removeItem = (itemId: string) => {
    onChange(value.filter(item => item.id !== itemId));
  };

  const updateItemLabel = (itemId: string, label: string) => {
    onChange(
      value.map(item =>
        item.id === itemId ? { ...item, label } : item
      )
    );
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...value];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    onChange(newItems);
  };

  // Handle empty state
  if (value.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckSquare className="h-4 w-4" />
          <span>Things you want everyone to remember (in-ears, charts, pedals, etc.)</span>
        </div>
        
        <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
          <CheckSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-4">
            Each player can tick these off on their own device.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={addItem}
            disabled={disabled}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add first item
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckSquare className="h-4 w-4" />
        <span>Things you want everyone to remember (in-ears, charts, pedals, etc.)</span>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2 group">
            {/* Move Controls */}
            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => moveItem(index, "up")}
                disabled={disabled || index === 0}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => moveItem(index, "down")}
                disabled={disabled || index === value.length - 1}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>

            {/* Checkbox Preview (visual only, not interactive) */}
            <div className="flex-shrink-0 w-5 h-5 border-2 rounded bg-muted/50" />

            {/* Label Input */}
            <Input
              value={item.label}
              onChange={(e) => updateItemLabel(item.id, e.target.value)}
              placeholder="In-ears, charts, sustain pedal..."
              className="flex-1"
              disabled={disabled}
            />

            {/* Delete Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(item.id)}
              disabled={disabled}
              className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add Item Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        disabled={disabled}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add item
      </Button>
    </div>
  );
}

