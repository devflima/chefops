'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Landmark, Link2, ShieldCheck, Unplug } from 'lucide-react'
import {
  useDisconnectMercadoPagoAccount,
  useMercadoPagoAccount,
} from '@/features/payments/hooks/useMercadoPagoAccount'

export default function IntegracoesPage() {
  const params = useSearchParams()
  const account = useMercadoPagoAccount()
  const disconnect = useDisconnectMercadoPagoAccount()

  useEffect(() => {
    const status = params.get('mercado_pago')

    if (!status) return

    if (status === 'connected') {
      alert('Conta Mercado Pago conectada com sucesso.')
    } else if (status === 'error') {
      alert('Não foi possível concluir a conexão com o Mercado Pago.')
    } else if (status === 'invalid_state') {
      alert('A validação do retorno OAuth falhou. Tente conectar novamente.')
    }
  }, [params])

  const connected = !!account.data

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Integrações</h1>
        <p className="mt-1 text-sm text-slate-500">
          Conecte a conta do estabelecimento para receber pagamentos direto no Mercado Pago do cliente.
        </p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50">
            <Landmark className="h-6 w-6 text-sky-600" />
          </div>
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Mercado Pago</h2>
              <Badge variant={connected ? 'default' : 'secondary'}>
                {connected ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              O dinheiro das vendas vai direto para a conta do restaurante conectado.
            </p>
          </div>
        </div>

        {account.isLoading ? (
          <div className="py-8 text-sm text-slate-400">Carregando integração...</div>
        ) : connected ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Seller ID</p>
                <p className="mt-1 font-medium text-slate-900">{account.data.mercado_pago_user_id}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Modo</p>
                <p className="mt-1 font-medium text-slate-900">
                  {account.data.live_mode ? 'Produção' : 'Teste'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <ShieldCheck className="h-4 w-4" />
                Token renovado automaticamente
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Expiração atual: {account.data.token_expires_at ? new Date(account.data.token_expires_at).toLocaleString('pt-BR') : 'não informado'}
              </p>
            </div>

            <div
              className={`rounded-xl border p-4 ${
                account.data.live_mode
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-blue-200 bg-blue-50'
              }`}
            >
              <div
                className={`flex items-center gap-2 text-sm font-medium ${
                  account.data.live_mode ? 'text-amber-900' : 'text-blue-900'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                {account.data.live_mode ? 'Conta conectada em produção' : 'Conta conectada em teste'}
              </div>
              <p
                className={`mt-1 text-sm ${
                  account.data.live_mode ? 'text-amber-800' : 'text-blue-800'
                }`}
              >
                {account.data.live_mode
                  ? 'Use pagamentos reais nessa conta. Cartões e compradores de teste do Mercado Pago não funcionam neste modo.'
                  : 'Use seller, comprador e cartões de teste do Mercado Pago. Se houver inconsistência no sandbox, reconecte a conta e valide em aba anônima.'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">Recuperação operacional</p>
              <p className="mt-1 text-sm text-slate-500">
                Se um pagamento aprovar e o pedido não aparecer imediatamente, o retorno do checkout tenta converter a sessão automaticamente. Também já existe um endpoint interno de reprocessamento manual para casos excepcionais.
              </p>
            </div>

            <div className="flex gap-3">
              <Button asChild>
                <a href="/api/mercado-pago/oauth/start">
                  <Link2 className="mr-2 h-4 w-4" />
                  Reconectar conta
                </a>
              </Button>
              <Button
                variant="outline"
                disabled={disconnect.isPending}
                onClick={() => disconnect.mutate()}
              >
                <Unplug className="mr-2 h-4 w-4" />
                {disconnect.isPending ? 'Desconectando...' : 'Desconectar'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6">
              <p className="text-sm text-slate-600">
                Conecte a conta Mercado Pago do estabelecimento para habilitar checkout online e cobranças direto para o restaurante.
              </p>
            </div>

            <Button asChild>
              <a href="/api/mercado-pago/oauth/start">
                <Link2 className="mr-2 h-4 w-4" />
                Conectar Mercado Pago
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
