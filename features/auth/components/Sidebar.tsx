'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { usePlan } from '@/features/plans/hooks/usePlan'
import { hasPlanFeature, PLAN_LABELS, type PlanFeature } from '@/features/plans/types'
import {
  LayoutDashboard, Package, ArrowLeftRight,
  UtensilsCrossed, ClipboardList, BarChart2,
  LayoutGrid, MonitorCheck, Tag, LogOut, ChefHat,
  CreditCard, Settings, ReceiptText, PlugZap, Users, Bike
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',   label: 'Início',      icon: LayoutDashboard, roles: ['owner', 'manager', 'cashier'] },
  { href: '/categorias',  label: 'Categorias',  icon: Tag,             roles: ['owner', 'manager'], feature: 'menu' as PlanFeature },
  { href: '/produtos',    label: 'Produtos',    icon: Package,         roles: ['owner', 'manager'], feature: 'menu' as PlanFeature },
  { href: '/estoque',     label: 'Estoque',     icon: ArrowLeftRight,  roles: ['owner', 'manager'], feature: 'stock' as PlanFeature },
  { href: '/cardapio',    label: 'Cardápio',    icon: UtensilsCrossed, roles: ['owner', 'manager'], feature: 'menu' as PlanFeature },
  { href: '/extras',      label: 'Adicionais',  icon: Settings,        roles: ['owner', 'manager'], feature: 'menu' as PlanFeature },
  { href: '/pedidos',     label: 'Pedidos',     icon: ClipboardList,   roles: ['owner', 'manager', 'cashier', 'kitchen'], feature: 'orders' as PlanFeature },
  { href: '/clientes',    label: 'Clientes',    icon: Users,           roles: ['owner', 'manager', 'cashier'], feature: 'orders' as PlanFeature },
  { href: '/entregadores',label: 'Entregadores',icon: Bike,            roles: ['owner', 'manager', 'cashier'], feature: 'orders' as PlanFeature },
  { href: '/comandas',    label: 'Comandas',    icon: ReceiptText,     roles: ['owner', 'manager', 'cashier'], feature: 'tables' as PlanFeature },
  { href: '/mesas',       label: 'Mesas',       icon: LayoutGrid,      roles: ['owner', 'manager', 'cashier'], feature: 'tables' as PlanFeature },
  { href: '/kds',         label: 'Cozinha',     icon: MonitorCheck,    roles: ['owner', 'manager', 'kitchen'], feature: 'kds' as PlanFeature },
  { href: '/vendas',      label: 'Vendas',      icon: BarChart2,       roles: ['owner', 'manager'], feature: 'sales' as PlanFeature },
  { href: '/integracoes', label: 'Integrações', icon: PlugZap,         roles: ['owner'], feature: 'payments' as PlanFeature },
  { href: '/usuarios',    label: 'Usuários',    icon: Users,           roles: ['owner'], feature: 'team' as PlanFeature },
  { href: '/planos',      label: 'Planos',      icon: CreditCard,      roles: ['owner'] },
]

const planColors = {
  free:  'bg-slate-100 text-slate-600',
  basic: 'bg-blue-100 text-blue-700',
  pro:   'bg-purple-100 text-purple-700',
}

type Props = {
  profile: {
    full_name: string | null
    role: string
    tenants: { name: string; slug: string } | null
  } | null
}

export default function Sidebar({ profile }: Props) {
  const pathname = usePathname()
  const { data: plan } = usePlan()
  const allowedNavItems = navItems.filter((item) =>
    profile?.role
      ? item.roles.includes(profile.role) &&
        (!item.feature || (plan?.plan ? hasPlanFeature(plan.plan, item.feature) : false))
      : false
  )

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">ChefOps</p>
            <p className="text-xs text-slate-400 truncate">
              {profile?.tenants?.name ?? ''}
            </p>
          </div>
          {plan && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${planColors[plan.plan]}`}>
              {PLAN_LABELS[plan.plan]}
            </span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {allowedNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
            {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {profile?.full_name ?? ''}
            </p>
            <p className="text-xs text-slate-400 capitalize">{profile?.role}</p>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          onClick={async () => {
            const res = await fetch('/api/auth/logout', { method: 'POST' })
            const json = await res.json().catch(() => null)
            window.location.href = json?.data?.redirectTo ?? '/login'
          }}
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
