'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MyEarningsGig, PaymentStatus } from '@/lib/types/shared';
import { updatePaymentStatus } from '@/lib/api/money';
import { format } from 'date-fns';
import { AlertCircle, Check, Columns3, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';

function getStatusBadge(status: PaymentStatus) {
  switch (status) {
    case 'paid':
      return <Badge variant="default" className="bg-green-600">Paid</Badge>;
    case 'partial':
      return <Badge variant="secondary">Partial</Badge>;
    case 'overdue':
      return <Badge variant="destructive">Overdue</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
}

// Define column configuration
type ColumnKey = 'date' | 'gig' | 'project' | 'role' | 'location' | 'fee' | 'status' | 'paidAmount' | 'paidDate' | 'actions';

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
}

const COLUMNS: ColumnConfig[] = [
  { key: 'date', label: 'Date', defaultVisible: true },
  { key: 'gig', label: 'Gig', defaultVisible: true },
  { key: 'project', label: 'Host', defaultVisible: true },
  { key: 'role', label: 'Role', defaultVisible: true },
  { key: 'location', label: 'Location', defaultVisible: false },
  { key: 'fee', label: 'Fee', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'paidAmount', label: 'Paid Amount', defaultVisible: false },
  { key: 'paidDate', label: 'Paid Date', defaultVisible: false },
  { key: 'actions', label: 'Actions', defaultVisible: true },
];

const STORAGE_KEY = 'my-earnings-visible-columns';
const ORDER_STORAGE_KEY = 'my-earnings-column-order';

type SortDirection = 'asc' | 'desc' | null;
type SortConfig = {
  key: ColumnKey | null;
  direction: SortDirection;
};

// Sortable table header component
function SortableTableHead({ 
  column, 
  children,
  sortConfig,
  onSort,
}: { 
  column: ColumnConfig; 
  children: React.ReactNode;
  sortConfig: SortConfig;
  onSort: (key: ColumnKey) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };

  const isSorted = sortConfig.key === column.key;
  const sortIcon = isSorted ? (
    sortConfig.direction === 'asc' ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    )
  ) : (
    <ArrowUpDown className="h-4 w-4 opacity-0 group-hover:opacity-50" />
  );

  return (
    <TableHead 
      ref={setNodeRef} 
      style={style}
      className={`group ${column.key === 'fee' ? 'text-right' : ''}`}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSort(column.key)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {children}
          {sortIcon}
        </button>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-4 w-1 bg-muted-foreground/30 rounded" />
        </div>
      </div>
    </TableHead>
  );
}

export function MyEarningsTable({ gigs }: { gigs: MyEarningsGig[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null,
  });

  // Initialize column order from localStorage or defaults
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(() => {
    if (typeof window === 'undefined') {
      return COLUMNS.map(col => col.key);
    }
    
    try {
      const stored = localStorage.getItem(ORDER_STORAGE_KEY);
      if (stored) {
        const order = JSON.parse(stored);
        // Validate that all columns are present
        const allKeys = COLUMNS.map(c => c.key);
        if (order.length === allKeys.length && order.every((k: ColumnKey) => allKeys.includes(k))) {
          return order;
        }
      }
    } catch (error) {
      console.error('Failed to load column order:', error);
    }
    
    return COLUMNS.map(col => col.key);
  });

  // Initialize visible columns from localStorage or defaults
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    if (typeof window === 'undefined') {
      return new Set(COLUMNS.filter(col => col.defaultVisible).map(col => col.key));
    }
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load column preferences:', error);
    }
    
    return new Set(COLUMNS.filter(col => col.defaultVisible).map(col => col.key));
  });

  // Save to localStorage whenever visibility changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(visibleColumns)));
    } catch (error) {
      console.error('Failed to save column preferences:', error);
    }
  }, [visibleColumns]);

  // Save column order to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(columnOrder));
    } catch (error) {
      console.error('Failed to save column order:', error);
    }
  }, [columnOrder]);

  const toggleColumn = (columnKey: ColumnKey) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  const resetColumns = () => {
    const defaults = new Set(COLUMNS.filter(col => col.defaultVisible).map(col => col.key));
    setVisibleColumns(defaults);
    setColumnOrder(COLUMNS.map(col => col.key));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as ColumnKey);
        const newIndex = items.indexOf(over.id as ColumnKey);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get ordered columns based on current order
  const orderedColumns = columnOrder
    .map(key => COLUMNS.find(col => col.key === key)!)
    .filter(col => visibleColumns.has(col.key));

  // Handle sorting
  const handleSort = (key: ColumnKey) => {
    let direction: SortDirection = 'asc';
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      }
    }
    
    setSortConfig({ key: direction ? key : null, direction });
  };

  // Sort gigs based on current sort config
  const sortedGigs = React.useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return gigs;
    }

    const sorted = [...gigs].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'gig':
          aValue = a.gigTitle.toLowerCase();
          bValue = b.gigTitle.toLowerCase();
          break;
        case 'project':
          aValue = (a.hostName || '').toLowerCase();
          bValue = (b.hostName || '').toLowerCase();
          break;
        case 'role':
          aValue = a.roleName.toLowerCase();
          bValue = b.roleName.toLowerCase();
          break;
        case 'location':
          aValue = (a.locationName || '').toLowerCase();
          bValue = (b.locationName || '').toLowerCase();
          break;
        case 'fee':
          aValue = a.feeAmount || 0;
          bValue = b.feeAmount || 0;
          break;
        case 'status': {
          const statusOrder = { pending: 0, partial: 1, paid: 2, overdue: 3 };
          aValue = statusOrder[a.paymentStatus] || 0;
          bValue = statusOrder[b.paymentStatus] || 0;
          break;
        }
        case 'paidAmount':
          aValue = a.paidAmount || 0;
          bValue = b.paidAmount || 0;
          break;
        case 'paidDate':
          aValue = a.paidDate ? new Date(a.paidDate).getTime() : 0;
          bValue = b.paidDate ? new Date(b.paidDate).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [gigs, sortConfig]);

  const markAsPaidMutation = useMutation({
    mutationFn: updatePaymentStatus,
    onSuccess: () => {
      toast.success('Marked as paid');
      queryClient.invalidateQueries({ 
        queryKey: ['my-earnings'],
        refetchType: 'active'
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update payment status');
    },
  });

  const handleMarkAsPaid = (gig: MyEarningsGig) => {
    markAsPaidMutation.mutate({
      gigRoleId: gig.gigRoleId,
      paymentStatus: 'paid',
      paidAmount: gig.feeAmount || 0,
      paidDate: new Date().toISOString().split('T')[0],
    });
  };

  if (gigs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No gigs found for the selected period
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Column Visibility Controls */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Columns3 className="h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {COLUMNS.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={visibleColumns.has(column.key)}
                onCheckedChange={() => toggleColumn(column.key)}
                onSelect={(e) => e.preventDefault()}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              onSelect={(e) => {
                e.preventDefault();
                resetColumns();
              }}
              className="justify-center text-xs text-muted-foreground"
            >
              Reset to default
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <SortableContext
                items={columnOrder}
                strategy={horizontalListSortingStrategy}
              >
                {orderedColumns.map((column) => (
                  <SortableTableHead 
                    key={column.key} 
                    column={column}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  >
                    {column.label}
                  </SortableTableHead>
                ))}
              </SortableContext>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedGigs.map((gig) => (
              <TableRow
                key={gig.gigRoleId}
                className={gig.paymentStatus === 'overdue' ? 'bg-red-50 dark:bg-red-950/20' : ''}
              >
                {orderedColumns.map((column) => {
                  switch (column.key) {
                    case 'date':
                      return (
                        <TableCell key={column.key}>
                          {format(new Date(gig.date), 'MMM d, yyyy')}
                        </TableCell>
                      );
                    
                    case 'gig':
                      return (
                        <TableCell 
                          key={column.key}
                          className="font-medium text-primary hover:underline cursor-pointer"
                          onClick={() => router.push(`/gigs/${gig.gigId}?from=money`)}
                        >
                          {gig.gigTitle}
                        </TableCell>
                      );
                    
                    case 'project':
                      return (
                        <TableCell key={column.key}>
                          {gig.hostName || '—'}
                        </TableCell>
                      );
                    
                    case 'role':
                      return (
                        <TableCell key={column.key}>
                          {gig.roleName}
                        </TableCell>
                      );
                    
                    case 'location':
                      return (
                        <TableCell key={column.key}>
                          {gig.locationName || '—'}
                        </TableCell>
                      );
                    
                    case 'fee':
                      return (
                        <TableCell key={column.key} className="text-right">
                          {gig.feeAmount ? formatCurrency(gig.feeAmount) : '—'}
                        </TableCell>
                      );
                    
                    case 'status':
                      return (
                        <TableCell key={column.key}>
                          {gig.paymentStatus === 'overdue' && (
                            <AlertCircle className="inline-block mr-1 h-4 w-4 text-red-600" />
                          )}
                          {getStatusBadge(gig.paymentStatus)}
                        </TableCell>
                      );
                    
                    case 'paidAmount':
                      return (
                        <TableCell key={column.key}>
                          {gig.paidAmount ? formatCurrency(gig.paidAmount) : '—'}
                        </TableCell>
                      );
                    
                    case 'paidDate':
                      return (
                        <TableCell key={column.key}>
                          {gig.paidDate ? format(new Date(gig.paidDate), 'MMM d, yyyy') : '—'}
                        </TableCell>
                      );
                    
                    case 'actions':
                      return (
                        <TableCell key={column.key}>
                          {gig.paymentStatus !== 'paid' ? (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleMarkAsPaid(gig)}
                              disabled={markAsPaidMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Paid
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    
                    default:
                      return null;
                  }
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DndContext>
    </div>
  );
}

