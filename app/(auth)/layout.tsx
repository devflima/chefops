export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">ChefOps</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestão simples para o seu negócio
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}