import { useCallback, useEffect, useState } from 'react'
import Editor from './Editor'
import type { Tab } from '../../shared/tab'

function describe(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function labelOf(content: string): string {
  const line = content.split('\n').find((candidate) => candidate.trim().length > 0)
  if (!line) return 'new tab'
  return line.trim().slice(0, 24)
}

function App(): React.JSX.Element {
  // Tab content here is the content as loaded. CodeMirror owns the live
  // document from then on, so this never changes and the editor is never
  // rebuilt mid-typing.
  const [tabs, setTabs] = useState<readonly Tab[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false

    // useEffect cannot be async, so the work lives in an inner function.
    async function load(): Promise<void> {
      try {
        // Main guarantees at least one tab, so there is always somewhere to
        // type and nothing to create from here.
        const opened = await window.api.listTabs()
        if (disposed) return
        setTabs(opened)
        setLabels(Object.fromEntries(opened.map((tab) => [tab.id, labelOf(tab.content)])))
        setActiveId(opened[0].id)
      } catch (error) {
        // No editor is built, so nothing can overwrite tabs we failed to read.
        if (!disposed) setLoadError(describe(error))
      }
    }

    load()

    return () => {
      disposed = true
    }
  }, [])

  const handleChange = useCallback((id: string, content: string): void => {
    window.api.tabChanged(id, content)
    setLabels((current) => ({ ...current, [id]: labelOf(content) }))
  }, [])

  function addTab(): void {
    async function create(): Promise<void> {
      try {
        const tab = await window.api.createTab()
        setTabs((current) => [...current, tab])
        setLabels((current) => ({ ...current, [tab.id]: labelOf(tab.content) }))
        setActiveId(tab.id)
        setActionError(null)
      } catch (error) {
        // The existing tabs are untouched, so this reports and leaves the app
        // usable rather than tearing the editor down.
        setActionError(describe(error))
      }
    }

    create()
  }

  if (loadError) {
    return (
      <div className="h-full overflow-auto p-6">
        <h1 className="mb-3 text-lg">Could not open your tabs</h1>
        <pre className="border-l-4 border-red-800 bg-neutral-800 p-3 whitespace-pre-wrap">
          {loadError}
        </pre>
        <p className="mt-3">Editing is disabled so the existing files are not overwritten.</p>
      </div>
    )
  }

  const active = tabs.find((tab) => tab.id === activeId)

  return (
    <div className="flex h-full flex-col">
      {actionError && (
        <div className="bg-red-900 px-3 py-1.5 text-sm text-red-100">{actionError}</div>
      )}

      <div className="flex items-center gap-1 overflow-x-auto border-b border-neutral-700 bg-neutral-900 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveId(tab.id)}
            className={`shrink-0 px-3 py-1.5 text-sm ${
              tab.id === activeId
                ? 'border-b-2 border-sky-400 text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {labels[tab.id]}
          </button>
        ))}
        <button
          onClick={addTab}
          title="New tab"
          className="shrink-0 px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-100"
        >
          +
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {active && (
          <Editor tabId={active.id} initialContent={active.content} onChange={handleChange} />
        )}
      </div>
    </div>
  )
}

export default App
