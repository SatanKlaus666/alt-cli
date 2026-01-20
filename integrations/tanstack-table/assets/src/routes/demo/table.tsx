import { useState, useMemo, useReducer } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'

import { makeData } from '~/data/demo-table-data'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import type { Person } from '~/data/demo-table-data'

export const Route = createFileRoute('/demo/table')({
  component: TableDemo,
})

const fuzzyFilter: FilterFn<Person> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

function TableDemo() {
  const rerender = useReducer(() => ({}), {})[1]
  const [globalFilter, setGlobalFilter] = useState('')
  const [data, setData] = useState<Person[]>(() => makeData(100))

  const columns = useMemo<ColumnDef<Person>[]>(
    () => [
      { accessorKey: 'id', header: 'ID' },
      { accessorKey: 'firstName', header: 'First Name' },
      { accessorKey: 'lastName', header: 'Last Name' },
      { accessorKey: 'age', header: 'Age' },
      { accessorKey: 'visits', header: 'Visits' },
      { accessorKey: 'status', header: 'Status' },
    ],
    [],
  )

  const table = useReactTable({
    data,
    columns,
    filterFns: { fuzzy: fuzzyFilter },
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'fuzzy',
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">TanStack Table Demo</h1>

        <input
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full p-3 mb-4 bg-gray-800 rounded-lg border border-gray-700"
          placeholder="Search all columns..."
        />

        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-800">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-700"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {{ asc: ' ↑', desc: ' ↓' }[
                        header.column.getIsSorted() as string
                      ] ?? ''}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-700">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-800">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 bg-gray-800 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 bg-gray-800 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>

        <div className="mt-4 text-gray-400">
          {table.getFilteredRowModel().rows.length} rows
        </div>

        <div className="mt-8">
          <Link to="/" className="text-cyan-400 hover:text-cyan-300">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
