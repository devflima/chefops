export function shouldSkipInstallBanner(dismissedValue: string | null, isStandalone: boolean) {
  return Boolean(dismissedValue) || isStandalone
}

export function shouldRenderInstallBanner(prompt: unknown, dismissed: boolean) {
  return !dismissed && !!prompt
}

export function shouldDismissAfterInstall(outcome: 'accepted' | 'dismissed') {
  return outcome === 'accepted'
}
