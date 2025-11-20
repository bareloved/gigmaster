import { FileText, Music, Video, Folder, File } from "lucide-react";

interface FileTypeIconProps {
  type: string;
  className?: string;
}

export function FileTypeIcon({ type, className = "h-4 w-4" }: FileTypeIconProps) {
  switch (type) {
    case "document":
      return <FileText className={className} />;
    case "audio":
      return <Music className={className} />;
    case "video":
      return <Video className={className} />;
    case "folder":
      return <Folder className={className} />;
    case "other":
    default:
      return <File className={className} />;
  }
}

