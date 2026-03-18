'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Verifica se já instalou ou dispensou
    const isDismissed = localStorage.getItem('pwa-dismissed')
    if (isDismissed) { setDismissed(true); return }

    // Verifica se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDismissed(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setDismissed(true)
    setPrompt(null)
  }

  function handleDismiss() {
    localStorage.setItem('pwa-dismissed', '1')
    setDismissed(true)
  }

  if (dismissed || !prompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center gap-3 shadow-lg">
        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Instalar ChefOps</p>
          <p className="text-xs text-slate-400">Acesse mais rápido pelo celular</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            className="bg-white text-slate-900 hover:bg-slate-100 text-xs h-8"
            onClick={handleInstall}
          >
            Instalar
          </Button>
          <button onClick={handleDismiss} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}