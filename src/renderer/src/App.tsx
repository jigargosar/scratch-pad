import { useEffect, useRef, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { basicSetup } from 'codemirror'
import { vim } from '@replit/codemirror-vim'

function describe(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function App(): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let view: EditorView | null = null
    let disposed = false

    const offFocus = window.api.onFocusRequest(() => view?.focus())

    // useEffect cannot be async, so the work lives in an inner function.
    async function openNote(): Promise<void> {
      try {
        const content = await window.api.readNote()
        if (disposed || !hostRef.current) return

        view = new EditorView({
          state: EditorState.create({
            doc: content,
            // vim() must come first so its keymap outranks basicSetup's.
            extensions: [
              vim(),
              basicSetup,
              markdown(),
              EditorView.lineWrapping,
              EditorView.updateListener.of((update) => {
                // Main owns the debounce and the disk writes.
                if (update.docChanged) window.api.noteChanged(update.state.doc.toString())
              })
            ]
          }),
          parent: hostRef.current
        })
        view.focus()
      } catch (error) {
        // No editor is created, so nothing can overwrite a note we failed
        // to read.
        if (!disposed) setLoadError(describe(error))
      }
    }

    openNote()

    return () => {
      disposed = true
      offFocus()
      view?.destroy()
    }
  }, [])

  if (loadError) {
    return (
      <div className="fatal">
        <h1>Could not open your note</h1>
        <pre>{loadError}</pre>
        <p>Editing is disabled so the existing file is not overwritten.</p>
      </div>
    )
  }

  return <div className="editor-host" ref={hostRef} />
}

export default App
