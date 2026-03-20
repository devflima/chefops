import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Conta suspensa
        </h1>
        <p className="text-slate-500 mb-6">
          Sua conta foi temporariamente suspensa. Entre em contato com o suporte para regularizar sua situação.
        </p>
        <a
          href="mailto:suporte@chefops.com.br"
          className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          Falar com suporte
        </a>
        <div className="mt-4">
          <Link href="/login" className="text-sm text-slate-400 hover:text-slate-600">
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  )
}
