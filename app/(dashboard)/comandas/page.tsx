'use client'

import { useState } from 'react'
import FeatureGate from '@/features/plans/components/FeatureGate'
import { useCloseTab, useCreateTab, useTabs } from '@/features/tabs/hooks/useTabs'
import type { Tab } from '@/features/tabs/types'
import {
  buildCloseTabPrompt,
  buildCreateTabPayload,
  getCreateTabErrorMessage,
  getNewTabDialogState,
  getNewTabFormError,
  getNewTabOpenState,
  getTabDetailsDialogState,
  getTabsSummary,
} from '@/features/tabs/tabs-page'
import { TabsDashboardHeader } from '@/features/tabs/TabsDashboardHeader'
import { TabsDashboardEmptyState } from '@/features/tabs/TabsDashboardEmptyState'
import { TabsDashboardGrid } from '@/features/tabs/TabsDashboardGrid'
import { TabDetailsDialog } from '@/features/tabs/TabDetailsDialog'
import { NewTabDialog } from '@/features/tabs/NewTabDialog'

export default function ComandasPage() {
  const [newTabOpen, setNewTabOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState<Tab | null>(null)
  const [newTabLabel, setNewTabLabel] = useState('')
  const [newTabNotes, setNewTabNotes] = useState('')
  const [formError, setFormError] = useState('')
  const { data: openTabs = [], isLoading: openTabsLoading } = useTabs('open')
  const { data: closedTabs = [], isLoading: closedTabsLoading } = useTabs('closed')
  const closeTab = useCloseTab()
  const createTab = useCreateTab()

  const isLoading = openTabsLoading || closedTabsLoading
  const { openCount, closedCount } = getTabsSummary(openTabs as Tab[], closedTabs as Tab[])

  async function handleCloseTab(tab: Tab) {
    const confirmed = window.confirm(buildCloseTabPrompt(tab))

    if (!confirmed) return

    await closeTab.mutateAsync(tab.id)
  }

  async function handleCreateTab() {
    try {
      setFormError('')

      const nextError = getNewTabFormError(newTabLabel)
      if (nextError) {
        setFormError(nextError)
        return
      }

      await createTab.mutateAsync(buildCreateTabPayload(newTabLabel, newTabNotes))

      setNewTabLabel('')
      setNewTabNotes('')
      setNewTabOpen(false)
    } catch (error) {
      setFormError(getCreateTabErrorMessage(error))
    }
  }

  return (
    <FeatureGate feature="tables">
      <div>
        <TabsDashboardHeader
          openCount={openCount}
          closedCount={closedCount}
          onCreate={() => setNewTabOpen(getNewTabOpenState())}
        />

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">Carregando comandas...</div>
        ) : (openTabs as Tab[]).length === 0 ? (
          <TabsDashboardEmptyState onCreate={() => setNewTabOpen(getNewTabOpenState())} />
        ) : (
          <TabsDashboardGrid
            tabs={openTabs as Tab[]}
            closeTabPending={closeTab.isPending}
            onSelect={setSelectedTab}
            onClose={handleCloseTab}
          />
        )}

        <TabDetailsDialog
          selectedTab={selectedTab}
          onOpenChange={(open) => {
            const nextSelectedTab = getTabDetailsDialogState(open)
            if (nextSelectedTab === null) setSelectedTab(nextSelectedTab)
          }}
          onCloseTab={handleCloseTab}
        />

        <NewTabDialog
          open={newTabOpen}
          onOpenChange={(open) => {
            setNewTabOpen(open)
            const dialogState = getNewTabDialogState(open)
            if (dialogState) {
              setNewTabLabel(dialogState.newTabLabel)
              setNewTabNotes(dialogState.newTabNotes)
              setFormError(dialogState.formError)
            }
          }}
          newTabLabel={newTabLabel}
          newTabNotes={newTabNotes}
          formError={formError}
          isCreating={createTab.isPending}
          onLabelChange={setNewTabLabel}
          onNotesChange={setNewTabNotes}
          onSubmit={handleCreateTab}
        />
      </div>
    </FeatureGate>
  )
}
