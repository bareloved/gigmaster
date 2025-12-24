import { 
  SiYoutube, 
  SiGoogledrive, 
  SiDropbox, 
  SiSpotify, 
  SiSoundcloud 
} from "react-icons/si"; // Simple Icons (official brand logos)
import { Link, Cloud } from "lucide-react";

interface HostingServiceIconProps {
  url: string;
  className?: string;
}

export function HostingServiceIcon({ url, className = "h-4 w-4" }: HostingServiceIconProps) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // YouTube - Official red
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return <SiYoutube className={`${className} text-[#FF0000]`} />;
    }

    // Google Drive / Docs - Official blue
    if (hostname.includes('drive.google.com') || hostname.includes('docs.google.com')) {
      return <SiGoogledrive className={`${className} text-[#4285F4]`} />;
    }

    // Dropbox - Official blue
    if (hostname.includes('dropbox.com')) {
      return <SiDropbox className={`${className} text-[#0061FF]`} />;
    }

    // Spotify - Official green
    if (hostname.includes('spotify.com') || hostname.includes('open.spotify.com')) {
      return <SiSpotify className={`${className} text-[#1DB954]`} />;
    }

    // SoundCloud - Official orange
    if (hostname.includes('soundcloud.com')) {
      return <SiSoundcloud className={`${className} text-[#FF5500]`} />;
    }

    // OneDrive - Microsoft blue
    if (hostname.includes('onedrive.live.com') || hostname.includes('1drv.ms')) {
      return <Cloud className={`${className} text-[#0078D4]`} />;
    }

    // Generic fallback
    return <Link className={className} />;
  } catch {
    // If URL parsing fails, return generic link icon
    return <Link className={className} />;
  }
}

