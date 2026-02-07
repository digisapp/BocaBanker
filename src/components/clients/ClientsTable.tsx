'use client'

import { useRouter } from 'next/navigation'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

interface ClientsTableProps {
  data: ClientRow[]
  onDelete?: (id: string) => void
}

export function ClientsTable({ data, onDelete }: ClientsTableProps) {
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
                className="bg-gray-100 text-gray-700 border-gray-200 text-[10px]"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge
                variant="secondary"
                className="bg-gray-100 text-gray-500 text-[10px]"
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
      cell: ({ row }) => {
        const client = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-gray-500 hover:text-amber-600"
                onClick={(e) => e.stopPropagation()}
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
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      onRowClick={(row) => router.push(`/clients/${row.id}`)}
    />
  )
}
