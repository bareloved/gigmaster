"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getCroppedImage } from "@/lib/utils/crop-image";

interface ImageCropDialogProps {
  imageSrc: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropComplete: (blob: Blob) => void;
}

export function ImageCropDialog({
  imageSrc,
  open,
  onOpenChange,
  onCropComplete,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const onCropCompleteInternal = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;

    setIsCropping(true);
    try {
      const blob = await getCroppedImage(imageSrc, croppedAreaPixels);
      onCropComplete(blob);
    } catch (error) {
      console.error("Crop failed:", error);
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Crop cover image</DialogTitle>
          <DialogDescription>
            Drag to pan, scroll or use the slider to zoom.
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteInternal}
          />
        </div>

        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-muted-foreground shrink-0">Zoom</span>
          <Slider
            min={1}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={([val]) => setZoom(val)}
            className="flex-1"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isCropping}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isCropping || !croppedAreaPixels}
          >
            {isCropping ? "Cropping..." : "Crop & Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
