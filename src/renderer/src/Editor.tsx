import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { basicSetup } from 'codemirror'
import { vim } from '@replit/codemirror-vim'

interface Props {
  readonly tabId: string
  readonly initialContent: string
  readonly onChange: (id: string, content: string) => void
}

function Editor({ tabId, initialContent, onChange }: Props): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  // One EditorState per tab, kept across switches, so leaving a tab and coming
  // back keeps its cursor, scroll position and undo history.
  const statesRef = useRef(new Map<string, EditorState>())

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const states = statesRef.current
    const state =
      states.get(tabId) ??
      EditorState.create({
        doc: initialContent,
        // vim() must come first so its keymap outranks basicSetup's.
        extensions: [
          vim(),
          basicSetup,
          markdown(),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            // Main owns the debounce and the disk writes.
            if (update.docChanged) onChange(tabId, update.state.doc.toString())
          })
        ]
      })

    const view = new EditorView({ state, parent: host })
    view.focus()

    // The window can be re-summoned by the global shortcut while the OS focus
    // sits elsewhere; focusing the window alone does not focus CodeMirror.
    const offFocus = window.api.onFocusRequest(() => view.focus())

    return () => {
      offFocus()
      states.set(tabId, view.state)
      view.destroy()
    }
  }, [tabId, initialContent, onChange])

  return <div className="h-full" ref={hostRef} />
}

export default Editor
