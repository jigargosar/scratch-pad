import { randomUUID } from 'crypto'
import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Tab } from '../shared/tab'

export type { Tab }

const SUFFIX = '.md'

// One file per tab. The id is the file name without the suffix, so the tab
// list is just the directory listing and nothing else has to stay in sync.
function fileOf(dir: string, id: string): string {
  return join(dir, `${id}${SUFFIX}`)
}

// Ids start with the creation time in base 36, so sorting names sorts tabs by
// the order they were made. The random part keeps two tabs made in the same
// millisecond apart.
export function newTabId(): string {
  return `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`
}

export function listTabs(dir: string): Tab[] {
  mkdirSync(dir, { recursive: true })
  return readdirSync(dir)
    .filter((name) => name.endsWith(SUFFIX))
    .sort()
    .map((name) => ({
      id: name.slice(0, -SUFFIX.length),
      content: readFileSync(join(dir, name), 'utf8')
    }))
}

// Write to a temp file and rename, which is atomic on one volume, so a crash
// cannot leave a half written tab. The temp name ends in .tmp, so listTabs
// never picks it up.
export function writeTab(dir: string, id: string, content: string): void {
  mkdirSync(dir, { recursive: true })
  const file = fileOf(dir, id)
  const temp = `${file}.tmp`
  writeFileSync(temp, content, 'utf8')
  renameSync(temp, file)
}
