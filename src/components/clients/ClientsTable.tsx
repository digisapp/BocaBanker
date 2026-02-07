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
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  prospect: 'bg-gold/20 text-gold border-gold/30',
  inactive: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
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
        <div className="font-medium text-foreground">
          {row.original.firstName} {row.original.lastName}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.email || '--'}
        </span>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.phone || '--'}
        </span>
      ),
    },
    {
      accessorKey: 'company',
      header: 'Company',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
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
        if (!tags || tags.length === 0) return <span className="text-muted-foreground">--</span>
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-navy-lighter text-foreground/70 border-gold/10 text-[10px]"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge
                variant="secondary"
                className="bg-navy-lighter text-muted-foreground text-[10px]"
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
        if (!date) return <span className="text-muted-foreground">--</span>
        return (
          <span className="text-muted-foreground text-sm">
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
                className="text-muted-foreground hover:text-gold"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-navy-light border-gold/20"
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
              <DropdownMenuSeparator className="bg-gold/10" />
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
