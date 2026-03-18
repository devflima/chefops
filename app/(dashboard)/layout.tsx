import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/features/auth/components/Sidebar'
import InstallBanner from '@/features/pwa/components/InstallBanner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, tenant_id, tenants(name, slug)')
    .eq('id', user.id)
    .single()

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