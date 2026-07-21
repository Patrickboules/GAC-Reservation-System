"use client"

import * as React from "react"
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  EllipsisVertical,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { IconButton } from "@/components/kit/icon-button"
import { Skeleton } from "@/components/kit/skeleton"
import { EmptyState } from "@/components/kit/empty-state"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/kit/dropdown-menu"

type TableSortDirection = "asc" | "desc"

interface TableSort {
  key: string
  direction: TableSortDirection
}

interface TableColumn<T> {
  key: string
  header: string
  sortable?: boolean
  align?: "left" | "right" | "center"
  className?: string
  render: (row: T) => React.ReactNode
}

interface TablePagination {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}

interface TableProps<T> extends Omit<React.ComponentProps<"div">, "children"> {
  columns: TableColumn<T>[]
  data: T[]
  getRowId: (row: T) => string | number
  sort?: TableSort
  onSortChange?: (sort: TableSort) => void
  /** Rendered inside the trailing kebab menu for each row — omit to hide the actions column. */
  rowActions?: (row: T) => React.ReactNode
  isLoading?: boolean
  loadingRowCount?: number
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  pagination?: TablePagination
}

function alignClass(align: TableColumn<unknown>["align"]) {
  return align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
}

function Table<T>({
  className,
  columns,
  data,
  getRowId,
  sort,
  onSortChange,
  rowActions,
  isLoading = false,
  loadingRowCount = 5,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  pagination,
  ...props
}: TableProps<T>) {
  const hasActions = !!rowActions
  const colSpan = columns.length + (hasActions ? 1 : 0)

  function handleSort(column: TableColumn<T>) {
    if (!column.sortable || !onSortChange) return
    const direction: TableSortDirection =
      sort?.key === column.key && sort.direction === "asc" ? "desc" : "asc"
    onSortChange({ key: column.key, direction })
  }

  return (
    <div data-slot="table" className={cn("flex flex-col gap-3", className)} {...props}>
      <div className="max-h-[28rem] overflow-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-left text-small">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    sort?.key === column.key
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : column.sortable
                        ? "none"
                        : undefined
                  }
                  className={cn(
                    "sticky top-0 z-10 border-b border-line bg-surface px-4 py-3 text-caption font-medium text-ink-500",
                    alignClass(column.align),
                    column.className
                  )}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column)}
                      className="inline-flex items-center gap-1 rounded-sm hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    >
                      {column.header}
                      {sort?.key === column.key ? (
                        sort.direction === "asc" ? (
                          <ArrowUp aria-hidden="true" className="size-3.5" />
                        ) : (
                          <ArrowDown aria-hidden="true" className="size-3.5" />
                        )
                      ) : (
                        <ChevronsUpDown aria-hidden="true" className="size-3.5 text-ink-300" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
              {hasActions && (
                <th
                  scope="col"
                  className="sticky top-0 z-10 w-10 border-b border-line bg-surface px-2 py-3"
                >
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: loadingRowCount }).map((_, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-3/4" />
                    </td>
                  ))}
                  {hasActions && (
                    <td className="px-2 py-3">
                      <Skeleton className="size-6 rounded-full" />
                    </td>
                  )}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="p-0">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                    className="rounded-none border-0"
                  />
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const rowId = getRowId(row)
                return (
                  <tr key={rowId} className="border-b border-line last:border-0 hover:bg-sky-50">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          "px-4 py-3 text-ink-700",
                          alignClass(column.align),
                          column.className
                        )}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="px-2 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <IconButton label="Row actions" variant="ghost" size="sm">
                                <EllipsisVertical />
                              </IconButton>
                            }
                          />
                          <DropdownMenuContent>{rowActions!(row)}</DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {pagination && !isLoading && data.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-caption text-ink-500">
            Page {pagination.page} of {pagination.pageCount}
          </span>
          <div className="flex items-center gap-1">
            <IconButton
              label="Previous page"
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              label="Next page"
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.pageCount}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              <ChevronRight />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  )
}

export { Table }
export type { TableProps, TableColumn, TableSort, TableSortDirection, TablePagination }
