import { Table } from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination"
import { Metadata } from "@/types/pagy"
import { populateQueryParams } from "@/lib/utils"
import { router } from "@inertiajs/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  metadata: Metadata
}

export default function PaginationTable<TData>({ table, metadata }: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      {!!table.getFilteredSelectedRowModel().rows.length ? (
        <div className="flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {metadata.count} row(s) selected.
        </div>
      ) : (
        <div className="flex-1 text-sm">
          <div>{metadata.count} records found</div>
        </div>
      )}

      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm">Rows per page</p>
          <Select
            value={`${metadata.limit}`}
            onValueChange={(value) => {
              const { fullUrl } = populateQueryParams(metadata.pageUrl, { 'limit': value })
              router.get(fullUrl, {}, { preserveState: true, only: ['admins'] })
            }}
          >
            <SelectTrigger className="bg-background h-8 w-[70px]">
              <SelectValue placeholder={metadata.limit} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 25, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-[100px] items-center justify-center text-sm">
          Page {metadata.page} of{" "}
          {metadata.pages}
        </div>

        <div className="flex items-center space-x-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem className="flex space-x-1">
                {/* <PaginationPrevious href="#" /> */}
                <Button
                  variant="outline"
                  className="hidden w-8 h-8 p-0 lg:flex"
                  onClick={() => router.get(metadata.firstUrl, {}, { preserveState: true, only: ['admins'] })}
                  disabled={!metadata.prev}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronsLeft />
                </Button>
                <Button
                  variant="outline"
                  className="w-8 h-8 p-0"
                  onClick={() => router.get(metadata.prevUrl, {}, { preserveState: true, only: ['admins'] })}
                  disabled={!metadata.prev}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft />
                </Button>
              </PaginationItem>

              {/* <PaginationItem>
                <PaginationLink href="#" isActive>1</PaginationLink>
              </PaginationItem> */}

              <PaginationItem>
                <Popover>
                  <PopoverTrigger asChild disabled={metadata.pages <= 1}>
                    <Button variant="outline" size="icon">
                      <PaginationEllipsis />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <div className="flex items-center w-[180px] gap-4">
                          <Label htmlFor="goto" className="text-nowrap">Go to page</Label>
                          <Input
                            id="goto"
                            type="number"
                            defaultValue={metadata.page}
                            min={metadata.from}
                            max={metadata.last}
                            className="h-8"
                            onChange={(event) => {
                              event.preventDefault()

                              const value = event.target.value

                              if (!value) return
                              router.get(metadata.pageUrl, { 'page': Number(value) }, { preserveState: true, only: ['admins'] })
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </PaginationItem>

              <PaginationItem className="flex space-x-1">
                {/* <PaginationNext href="#" /> */}
                <Button
                  variant="outline"
                  className="w-8 h-8 p-0"
                  onClick={() => router.get(metadata.nextUrl, {}, { preserveState: true, only: ['admins'] })}
                  disabled={!metadata.next}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight />
                </Button>
                <Button
                  variant="outline"
                  className="hidden w-8 h-8 p-0 lg:flex"
                  onClick={() => router.get(metadata.lastUrl, {}, { preserveState: true, only: ['admins'] })}
                  disabled={!metadata.next}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronsRight />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}