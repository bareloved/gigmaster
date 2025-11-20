import { Badge } from "@/components/ui/badge";
import type { InvitationStatus } from "@/lib/types/shared";

interface RoleStatusBadgeProps {
  status: string;
  gigStatus?: string;
}

export function RoleStatusBadge({ status, gigStatus }: RoleStatusBadgeProps) {
  // If gig is still draft and role is "invited", show as "pending" instead
  // (handles old data from before we added pending state)
  const displayStatus = gigStatus === 'draft' && status === 'invited' ? 'pending' : status;
  const getStatusVariant = (status: string) => {
    switch (displayStatus as InvitationStatus) {
      case "pending":
        return "outline";
      case "invited":
        return "secondary";
      case "accepted":
        return "default";
      case "declined":
        return "destructive";
      case "needs_sub":
        return "outline";
      case "replaced":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (displayStatus as InvitationStatus) {
      case "pending":
        return "Pending Invite";
      case "invited":
        return "Invited";
      case "accepted":
        return "Confirmed";
      case "declined":
        return "Declined";
      case "needs_sub":
        return "Needs Sub";
      case "replaced":
        return "Replaced";
      default:
        return status;
    }
  };

  return (
    <Badge variant={getStatusVariant(displayStatus)}>
      {getStatusLabel(displayStatus)}
    </Badge>
  );
}
