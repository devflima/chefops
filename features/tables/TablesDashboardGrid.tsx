import { Button } from '@/components/ui/button'
import { Clock, Pencil, QrCode, Trash2, Users } from 'lucide-react'
import type { Table } from '@/features/tables/types'
import { getTableOrdersCount, tableStatusConfig } from '@/features/tables/tables-page'

export function TablesDashboardGrid({
  tables,
  onSelect,
  onEdit,
  onDelete,
  onOpenSession,
  onCopyQr,
  onCloseSession,
}: {
  tables: Table[]
  onSelect: (table: Table) => void
  onEdit: (table: Table) => void
  onDelete: (table: Table) => void
  onOpenSession: (table: Table) => void
  onCopyQr: (table: Table) => void | Promise<void>
  onCloseSession: (table: Table) => void | Promise<void>
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {tables.map((table) => {
        const config = tableStatusConfig[table.status]
        const session = table.active_session

        return (
          <div
            key={table.id}
            className={`rounded-xl border-2 ${config.bg} ${config.border} cursor-pointer p-4 transition-shadow hover:shadow-md`}
            onClick={() => onSelect(table)}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900">{table.number}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    onEdit(table)
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {table.status === 'available' && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(table)
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className={`flex items-center gap-1.5 text-xs font-medium ${config.text}`}>
                  <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                  {config.label}
                </span>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-1 text-xs text-slate-500">
              <Users className="h-3 w-3" />
              {table.capacity} lugares
            </div>

            {session && (
              <div className="mt-2 border-t border-orange-200 pt-2">
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  {new Date(session.opened_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  R$ {Number(session.total).toFixed(2)}
                </p>
                <p className="text-xs text-slate-400">
                  {getTableOrdersCount(table)} pedido{getTableOrdersCount(table) !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            <div className="mt-3 space-y-1.5">
              {table.status === 'available' && (
                <>
                  <Button
                    size="sm"
                    className="w-full text-xs"
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpenSession(table)
                    }}
                  >
                    Abrir comanda
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={(event) => {
                      event.stopPropagation()
                      void onCopyQr(table)
                    }}
                  >
                    <QrCode className="mr-1 h-3 w-3" /> Copiar link QR
                  </Button>
                </>
              )}
              {table.status === 'occupied' && session && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelect(table)
                    }}
                  >
                    Ver comanda
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-red-200 text-xs text-red-600 hover:bg-red-50"
                    onClick={(event) => {
                      event.stopPropagation()
                      void onCloseSession(table)
                    }}
                  >
                    Fechar comanda
                  </Button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
