import { useEffect, useRef, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { basicSetup } from 'codemirror'
import { vim } from '@replit/codemirror-vim'

const SAVE_DEBOUNCE_MS = 500

function describe(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function App(): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let view: EditorView | null = null
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const clearTimer = (): void => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }

    // Resolves to an error message, or null on success. The caller decides what
    // to do with a failure; nothing is discarded here.
    const save = async (): Promise<string | null> => {
      clearTimer()
      if (!view) return null
      try {
        await window.api.writeNote(view.state.doc.toString())
        if (!disposed) setSaveError(null)
        return null
      } catch (error) {
        const message = describe(error)
        if (!disposed) setSaveError(message)
        return message
      }
    }

    // Fire-and-report: the caller does not await, but nothing is discarded.
    const saveNow = (): void => {
      save().catch((error) => setSaveError(describe(error)))
    }

    const scheduleSave = (): void => {
      clearTimer()
      timer = setTimeout(() => {
        timer = null
        saveNow()
      }, SAVE_DEBOUNCE_MS)
    }

    // Main hides the window only if this reports success, so a failed save
    // keeps the window on screen instead of losing the text.
    const offFlush = window.api.onFlushRequest(() => {
      save()
        .then((message) => window.api.reportFlushed(message === null, message ?? undefined))
        .catch((error) => {
          // Main is waiting on this reply; staying silent would strand it until
          // the timeout and hide the window on a stale verdict.
          window.api.reportFlushed(false, describe(error))
        })
    })

    const offFocus = window.api.onFocusRequest(() => {
      view?.focus()
    })

    const onBlur = (): void => saveNow()
    window.addEventListener('blur', onBlur)

    window.api
      .readNote()
      .then((content) => {
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
                if (update.docChanged) scheduleSave()
              }),
              keymap.of([
                {
                  key: 'Mod-s',
                  run: () => {
                    saveNow()
                    return true
                  }
                }
              ])
            ]
          }),
          parent: hostRef.current
        })
        viewRef.current = view
        view.focus()
      })
      .catch((error) => {
        // No editor is created, so autosave can never overwrite a note we
        // failed to read.
        if (!disposed) setLoadError(describe(error))
      })

    return () => {
      disposed = true
      clearTimer()
      offFlush()
      offFocus()
      window.removeEventListener('blur', onBlur)
      view?.destroy()
      viewRef.current = null
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

  return (
    <>
      {saveError && <div className="save-error">Save failed: {saveError}</div>}
      <div className="editor-host" ref={hostRef} />
    </>
  )
}

export default App
