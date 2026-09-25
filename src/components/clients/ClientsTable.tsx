'use client'

import { useRouter } from 'next/navigation'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type Updater,
} from '@tanstack/react-table'
import { ArrowUpDown, MoreHorizontal, Eye, Pencil, Trash2, Phone, Mail } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface ClientRow {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  company: string | null
  status: string | null
  tags: string[] | null
  createdAt: string | null
}

const statusColorMap: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  prospect: 'bg-amber-50 text-amber-600 border-amber-200',
  inactive: 'bg-gray-100 text-gray-500 border-gray-200',
}

/**
 * Column ids the API can sort by (GET /api/clients `sort` param). Pagination
 * and sorting are server-side: `data` holds only the current page.
 */
export const CLIENT_SORT_KEYS: Record<string, string> = {
  name: 'firstName',
  email: 'email',
  company: 'company',
  status: 'status',
  createdAt: 'createdAt',
}

interface ClientsTableProps {
  data: ClientRow[]
  /** Total matching rows on the server */
  rowCount: number
  pagination: PaginationState
  onPaginationChange: (next: PaginationState) => void
  sorting: SortingState
  onSortingChange: (next: SortingState) => void
  onDelete?: (id: string) => void
}

function resolve<T>(updater: Updater<T>, prev: T): T {
  return typeof updater === 'function' ? (updater as (old: T) => T)(prev) : updater
}

/** Row actions menu, shared by the desktop table and the mobile card list. */
function ClientRowActions({
  client,
  onDelete,
  className,
}: {
  client: ClientRow
  onDelete?: (id: string) => void
  className?: string
}) {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className={cn('text-gray-500 hover:text-amber-600', className)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Actions for ${client.firstName} ${client.lastName}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-white border-gray-200"
      >
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/clients/${client.id}`)
          }}
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/clients/${client.id}/edit`)
          }}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-100" />
        <DropdownMenuItem
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete?.(client.id)
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ClientsTable({
  data,
  rowCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  onDelete,
}: ClientsTableProps) {
  const router = useRouter()

  const columns: ColumnDef<ClientRow>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      cell: ({ row }) => (
        <div className="font-medium text-gray-900">
          {row.original.firstName} {row.original.lastName}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-gray-500">
          {row.original.email || '--'}
        </span>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-gray-500">
          {row.original.phone || '--'}
        </span>
      ),
    },
    {
      accessorKey: 'company',
      header: 'Company',
      cell: ({ row }) => (
        <span className="text-gray-500">
          {row.original.company || '--'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status ?? 'active'
        const colorClass =
          statusColorMap[status] ?? statusColorMap.active
        return (
          <Badge
            variant="outline"
            className={`${colorClass} text-xs capitalize`}
          >
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      enableSorting: false,
      cell: ({ row }) => {
        const tags = row.original.tags
        if (!tags || tags.length === 0) return <span className="text-gray-500">--</span>
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-gray-100 text-gray-700 border-gray-200 text-[11px]"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge
                variant="secondary"
                className="bg-gray-100 text-gray-500 text-[11px]"
              >
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => {
        const date = row.original.createdAt
        if (!date) return <span className="text-gray-500">--</span>
        return (
          <span className="text-gray-500 text-sm">
            {new Date(date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )
      },
    },
    {
      id: 'actions',
      enableSorting: false,
      cell: ({ row }) => (
        <ClientRowActions client={row.original} onDelete={onDelete} />
      ),
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableMultiSort: false,
    rowCount,
    onSortingChange: (updater) => onSortingChange(resolve(updater, sorting)),
    onPaginationChange: (updater) =>
      onPaginationChange(resolve(updater, pagination)),
    state: {
      sorting,
      pagination,
    },
  })

  const handlePageSizeChange = (value: string) => {
    onPaginationChange({ pageIndex: 0, pageSize: Number(value) })
  }

  return (
    <div className="space-y-4">

      {/* Mobile card list: the 8-column table only scrolls sideways on a phone */}
      <div className="md:hidden rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
        {data.length ? (
          data.map((client) => {
            const status = client.status ?? 'active'
            return (
              <div key={client.id} className="p-4">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="font-medium text-gray-900 truncate">
                      {client.firstName} {client.lastName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {client.company || client.email || client.phone || '--'}
                    </p>
                  </button>
                  <ClientRowActions
                    client={client}
                    onDelete={onDelete}
                    className="size-10 -mr-2 -mt-2 [&_svg:not([class*='size-'])]:size-4"
                  />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge
                    variant="outline"
                    className={`${
                      statusColorMap[status] ?? statusColorMap.active
                    } text-xs capitalize`}
                  >
                    {status}
                  </Badge>
                  <div className="ml-auto flex items-center gap-2">
                    {client.phone && (
                      <Button asChild variant="outline" size="icon" className="size-10 border-gray-200 text-amber-600">
                        <a href={`tel:${client.phone}`} aria-label={`Call ${client.firstName} ${client.lastName}`}>
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {client.email && (
                      <Button asChild variant="outline" size="icon" className="size-10 border-gray-200 text-amber-600">
                        <a href={`mailto:${client.email}`} aria-label={`Email ${client.firstName} ${client.lastName}`}>
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <p className="py-10 text-center text-gray-500">No results found.</p>
        )}
      </div>

      {/* Table */}
      <div className="hidden md:block rounded-lg border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-gray-200 hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="bg-gray-50 text-amber-600 font-semibold text-xs uppercase tracking-wider"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? 'flex items-center gap-1 cursor-pointer select-none'
                            : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="border-b border-gray-100 transition-colors cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/clients/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-gray-700">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-gray-500"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Rows per page</span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="h-8 w-[70px] bg-gray-50 border-gray-200 text-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-2">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {Math.max(1, table.getPageCount())}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-30"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-30"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
