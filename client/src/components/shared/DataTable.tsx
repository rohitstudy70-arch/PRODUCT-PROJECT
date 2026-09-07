import * as React from "react"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"

export interface Column<T> {
  header: string;
  accessorKey: keyof T | string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  // Pagination
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  page = 1,
  totalPages = 1,
  onPageChange
}: DataTableProps<T>) {
  return (
    <div className="space-y-4">
      {/* Top action/search bar */}
      {onSearchChange !== undefined && (
        <div className="relative max-w-sm">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
            <Search className="h-4 w-4" />
          </span>
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-slate-900/40 border-slate-800"
          />
        </div>
      )}

      {/* Glass Table Border */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/20 backdrop-blur-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 bg-slate-950/20">
              {columns.map((col, idx) => (
                <TableHead key={idx} className="font-semibold text-slate-400">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading Skeleton rows
              Array.from({ length: 5 }).map((_, rIdx) => (
                <TableRow key={rIdx} className="border-slate-800/40">
                  {columns.map((_, cIdx) => (
                    <TableCell key={cIdx}>
                      <div className="h-4 bg-slate-800/60 rounded animate-pulse w-3/4" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center h-28 text-slate-400">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              // Render Data
              data.map((item: any, rIdx) => (
                <TableRow key={item._id || rIdx} className="border-slate-800/40 hover:bg-slate-900/25">
                  {columns.map((col, cIdx) => (
                    <TableCell key={cIdx} className="py-3 px-4">
                      {col.render ? col.render(item) : String(item[col.accessorKey] || "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-400">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="h-8 px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
