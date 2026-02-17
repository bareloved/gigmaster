import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/utils/avatar";
import { cn } from "@/lib/utils";

interface StackedAvatarsProps {
  musicians: Array<{ name: string }>;
  max?: number;
}

export function StackedAvatars({ musicians, max = 3 }: StackedAvatarsProps) {
  if (musicians.length === 0) return null;

  const visible = musicians.slice(0, max);
  const overflow = musicians.length - max;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map((m, i) => (
          <Avatar
            key={i}
            className={cn(
              "h-5 w-5 border-2 border-background",
              "sm:h-6 sm:w-6"
            )}
            style={{ zIndex: max - i }}
          >
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-[8px] sm:text-[10px] font-hebrew">
              {getUserInitials(m.name)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      {overflow > 0 && (
        <span className="ml-1 text-[10px] sm:text-xs text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
}
