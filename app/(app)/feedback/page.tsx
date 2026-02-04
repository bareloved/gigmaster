'use client';

import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/lib/providers/user-provider';
import { listFeedback } from '@/lib/api/feedback';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';
import type { FeedbackCategory } from '@/lib/types/shared';

const categoryConfig: Record<
  FeedbackCategory,
  { label: string; variant: 'destructive' | 'secondary' | 'outline' }
> = {
  bug: { label: 'Bug', variant: 'destructive' },
  feature: { label: 'Feature', variant: 'secondary' },
  general: { label: 'General', variant: 'outline' },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FeedbackPage() {
  const { user } = useUser();

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ['feedback', user?.id],
    queryFn: listFeedback,
    enabled: !!user,
  });

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            User Feedback
          </CardTitle>
          <CardDescription>
            All feedback submissions from test users ({feedback.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : feedback.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No feedback yet
            </p>
          ) : (
            <div className="divide-y">
              {feedback.map((item) => {
                const config = categoryConfig[item.category as FeedbackCategory];
                const userDisplay =
                  item.profiles?.name ||
                  item.profiles?.email ||
                  'Anonymous';

                return (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={config.variant}>{config.label}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {userDisplay}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{item.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
