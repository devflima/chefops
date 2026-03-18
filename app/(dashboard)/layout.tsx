import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/features/auth/components/Sidebar'
import InstallBanner from '@/features/pwa/components/InstallBanner'

type Profile = {
  full_name: string | null
  role: string
  tenants: { name: string; slug: string } | null
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('full_name, role, tenant_id, tenants(name, slug)')
    .eq('id', user.id)
    .single()

  const profile: Profile | null = data
    ? {
        full_name: data.full_name,
        role: data.role,
        tenants: Array.isArray(data.tenants)
          ? (data.tenants[0] ?? null)
          : (data.tenants ?? null),
      }
    : null

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar profile={profile} />
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
      <InstallBanner />
    </div>
  )
}