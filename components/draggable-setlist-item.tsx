"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import type { SetlistItem } from "@/lib/types/shared";

interface DraggableSetlistItemProps {
  item: SetlistItem;
  onEdit: (item: SetlistItem) => void;
  onDelete: (itemId: string) => void;
}

export function DraggableSetlistItem({
  item,
  onEdit,
  onDelete,
}: DraggableSetlistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Song Title */}
      <span className="font-medium flex-1 truncate">{item.title}</span>

      {/* Key */}
      {item.key && (
        <span className="text-sm text-muted-foreground font-mono">{item.key}</span>
      )}

      {/* BPM */}
      {item.bpm && (
        <span className="text-sm text-muted-foreground">{item.bpm}</span>
      )}

      {/* Edit Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(item)}
        className="h-8 w-8 flex-shrink-0"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(item.id)}
        className="h-8 w-8 flex-shrink-0"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

