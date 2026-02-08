'use client';

import { useState } from 'react';
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/providers/user-provider';
import { listFeedback, deleteFeedback, toggleFeedbackResolved } from '@/lib/api/feedback';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MessageSquare, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Feedback, FeedbackCategory } from '@/lib/types/shared';

const categoryConfig: Record<
  FeedbackCategory,
  { label: string; variant: 'destructive' | 'secondary' | 'outline' }
> = {
  bug: { label: 'Bug', variant: 'destructive' },
  feature: { label: 'Feature', variant: 'secondary' },
  general: { label: 'General', variant: 'outline' },
};

type FilterCategory = FeedbackCategory | 'all';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function FeedbackItem({
  item,
  onToggleResolved,
  onDelete,
  isTogglingResolved,
  isDeleting,
}: {
  item: Feedback;
  onToggleResolved: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  isTogglingResolved: boolean;
  isDeleting: boolean;
}) {
  const config = categoryConfig[item.category as FeedbackCategory];
  const userDisplay = item.user_name || item.user_email || 'Anonymous';
  const hasEmail = !!item.user_email;

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="pt-0.5">
          <Checkbox
            checked={item.resolved}
            disabled={isTogglingResolved}
            onCheckedChange={(checked) => onToggleResolved(item.id, !!checked)}
            aria-label={item.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={config.variant}>{config.label}</Badge>
              <span className="text-sm text-muted-foreground">{userDisplay}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(item.created_at)}
              </span>

              {/* Mail button - only shown if user has email */}
              {hasEmail && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  asChild
                >
                  <a
                    href={`mailto:${item.user_email}?subject=Re: Your GigMaster Feedback`}
                    title={`Email ${item.user_email}`}
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                </Button>
              )}

              {/* Delete button with confirmation */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this feedback? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(item.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <p
            className={`text-sm whitespace-pre-wrap ${
              item.resolved ? 'line-through text-muted-foreground' : ''
            }`}
          >
            {item.message}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  useDocumentTitle("Feedback");
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ['feedback', user?.id],
    queryFn: listFeedback,
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
      toggleFeedbackResolved(id, resolved),
    onMutate: async ({ id, resolved }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['feedback', user?.id] });

      // Snapshot the previous value
      const previousFeedback = queryClient.getQueryData<Feedback[]>(['feedback', user?.id]);

      // Optimistically update to the new value
      queryClient.setQueryData<Feedback[]>(['feedback', user?.id], (old) =>
        old?.map((item) =>
          item.id === id ? { ...item, resolved } : item
        )
      );

      setTogglingIds((prev) => new Set(prev).add(id));

      // Return context with snapshot for rollback
      return { previousFeedback };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousFeedback) {
        queryClient.setQueryData(['feedback', user?.id], context.previousFeedback);
      }
      toast.error('Failed to update feedback status');
      console.error('Toggle resolved error:', error);
    },
    onSettled: (_, __, { id }) => {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeedback,
    onMutate: (id) => {
      setDeletingIds((prev) => new Set(prev).add(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback', user?.id] });
      toast.success('Feedback deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete feedback');
      console.error('Delete error:', error);
    },
    onSettled: (_, __, id) => {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  // Filter feedback by category
  const filteredFeedback =
    filter === 'all'
      ? feedback
      : feedback.filter((item) => item.category === filter);

  // Count by category
  const counts = {
    all: feedback.length,
    bug: feedback.filter((f) => f.category === 'bug').length,
    feature: feedback.filter((f) => f.category === 'feature').length,
    general: feedback.filter((f) => f.category === 'general').length,
  };

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
          {/* Filter Tabs */}
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as FilterCategory)}
            className="mb-6"
          >
            <TabsList>
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="bug">Bugs ({counts.bug})</TabsTrigger>
              <TabsTrigger value="feature">Features ({counts.feature})</TabsTrigger>
              <TabsTrigger value="general">General ({counts.general})</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : filteredFeedback.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {filter === 'all'
                ? 'No feedback yet'
                : `No ${filter} feedback`}
            </p>
          ) : (
            <div className="divide-y">
              {filteredFeedback.map((item) => (
                <FeedbackItem
                  key={item.id}
                  item={item}
                  onToggleResolved={(id, resolved) =>
                    toggleMutation.mutate({ id, resolved })
                  }
                  onDelete={(id) => deleteMutation.mutate(id)}
                  isTogglingResolved={togglingIds.has(item.id)}
                  isDeleting={deletingIds.has(item.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
