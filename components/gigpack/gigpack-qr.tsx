"use client";

import QRCode from "react-qr-code";

interface GigPackQrProps {
  url: string;
  size?: number;
}

export function GigPackQr({ url, size = 200 }: GigPackQrProps) {
  return (
    <div className="flex items-center justify-center p-4 bg-white rounded-lg">
      <QRCode 
        value={url} 
        size={size}
        level="M"
        className="w-full h-auto max-w-[200px]"
      />
    </div>
  );
}

