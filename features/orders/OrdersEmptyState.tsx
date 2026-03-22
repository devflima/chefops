import { ClipboardList } from 'lucide-react'

export function OrdersEmptyState() {
  return (
    <div className="py-16 text-center">
      <ClipboardList className="mx-auto mb-3 h-8 w-8 text-slate-300" />
      <p className="text-sm text-slate-500">Nenhum pedido encontrado.</p>
    </div>
  )
}
