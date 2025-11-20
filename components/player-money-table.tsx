'use client';

import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PlayerMoneyGig } from '@/lib/types/shared';
import { formatCurrency } from '@/lib/utils/currency';
import Link from 'next/link';

interface PlayerMoneyTableProps {
  gigs: PlayerMoneyGig[];
}

export function PlayerMoneyTable({ gigs }: PlayerMoneyTableProps) {
  if (gigs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No gigs with payment information yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Gig</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Fee</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gigs.map((gig) => (
            <TableRow key={gig.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell>
                <Link href={`/gigs/${gig.id}/pack?returnUrl=/money`} className="block">
                  {format(new Date(gig.date), 'MMM d, yyyy')}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/gigs/${gig.id}/pack?returnUrl=/money`} className="block">
                  {gig.projectName}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/gigs/${gig.id}/pack?returnUrl=/money`} className="block font-medium">
                  {gig.gigTitle}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/gigs/${gig.id}/pack?returnUrl=/money`} className="block">
                  {gig.roleName}
                </Link>
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/gigs/${gig.id}/pack?returnUrl=/money`} className="block">
                  {gig.agreedFee !== null ? (
                    formatCurrency(gig.agreedFee, gig.currency)
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/gigs/${gig.id}/pack?returnUrl=/money`} className="block">
                  {gig.isPaid ? (
                    <Badge variant="default" className="bg-green-600">
                      Paid
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Unpaid</Badge>
                  )}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

