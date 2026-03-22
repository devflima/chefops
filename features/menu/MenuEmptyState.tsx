import { ChefHat } from 'lucide-react'

export function MenuEmptyState() {
  return (
    <div className="text-center py-16 text-slate-400">
      <ChefHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>Cardápio em breve.</p>
    </div>
  )
}
