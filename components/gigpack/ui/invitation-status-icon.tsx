import { Check, X, HelpCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvitationStatusIconProps {
  status?: string | null;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Colored circular icon showing invitation status.
 * - Green checkmark = accepted
 * - Yellow clock = invited / pending
 * - Red X = declined
 * - Orange clock = needs_sub / tentative
 * - Gray question mark = unknown / no status
 */
export function InvitationStatusIcon({
  status,
  size = "md",
  className,
}: InvitationStatusIconProps) {
  const sizeClasses = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  let bgColor: string;
  let Icon: typeof Check;

  switch (status) {
    case "accepted":
      bgColor = "bg-green-500";
      Icon = Check;
      break;
    case "invited":
    case "pending":
      bgColor = "bg-yellow-500";
      Icon = Clock;
      break;
    case "declined":
      bgColor = "bg-red-500";
      Icon = X;
      break;
    case "needs_sub":
      bgColor = "bg-orange-500";
      Icon = Clock;
      break;
    case "tentative":
      bgColor = "bg-yellow-400";
      Icon = Clock;
      break;
    default:
      bgColor = "bg-gray-400";
      Icon = HelpCircle;
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full shrink-0",
        sizeClasses,
        bgColor,
        className
      )}
      title={status?.replace("_", " ") || "pending"}
    >
      <Icon className={cn(iconSize, "text-white")} strokeWidth={3} />
    </span>
  );
}
