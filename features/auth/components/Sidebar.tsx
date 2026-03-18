'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  ShoppingCart,
  LogOut,
  ChefHat,
  UtensilsCrossed,
  ClipboardList,
  BarChart2,
  LayoutGrid,
  MonitorCheck,
  Tag,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/categorias', label: 'Categorias', icon: Tag },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/estoque', label: 'Estoque', icon: ArrowLeftRight },
  { href: '/cardapio', label: 'Cardápio', icon: UtensilsCrossed },
  { href: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/mesas', label: 'Mesas', icon: LayoutGrid },
  { href: '/kds', label: 'Cozinha', icon: MonitorCheck },
  { href: '/vendas', label: 'Vendas', icon: BarChart2 },
]

type Props = {
  profile: {
    full_name: string | null
    role: string
    tenants: { name: string; slug: string } | null
  } | null
}

export default function Sidebar({ profile }: Props) {
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 left-0 flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="border-b border-slate-100 p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
            <ChefHat className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">ChefOps</p>
            <p className="max-w-[140px] truncate text-xs text-slate-400">
              {profile?.tenants?.name ?? ''}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-slate-100 p-4">
        <div className="mb-1 flex items-center gap-3 px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
            {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {profile?.full_name ?? ''}
            </p>
            <p className="text-xs text-slate-400 capitalize">{profile?.role}</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
