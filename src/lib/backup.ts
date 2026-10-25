// Backup = one JSON file with every table. Photos are embedded as base64 JPEGs.
// Export uses the Web Share API so on iPhone you can "Save to Files" / iCloud Drive.

import type { Table } from 'dexie'
import { db, updateSettings } from '../db/db'
import type { Photo } from '../db/types'
import { isoInMelbourne } from './dates'

const APP_ID = 'level-up'
export const BACKUP_VERSION = 1

interface BackupFile {
  app: typeof APP_ID
  version: number
  exportedAt: string
  schema: number
  tables: Record<string, unknown[]>
}

function blobToDataURL(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = () => rej(r.error)
    r.readAsDataURL(b)
  })
}

async function dataURLToBlob(url: string): Promise<Blob> {
  const res = await fetch(url)
  return res.blob()
}

/** Every table except photos (handled separately because of the image blobs). */
const TABLES = ['settings', 'sessions', 'life', 'daily', 'checkins', 'tests', 'measurements', 'appointments', 'mealPlans', 'recipes'] as const

const allTables = () => [...TABLES.map((t) => db[t]), db.photos]

export async function buildBackup(): Promise<BackupFile> {
  const rows = await Promise.all(TABLES.map((t) => db[t].toArray() as Promise<unknown[]>))
  const photos = await db.photos.toArray()
  const photoRows = await Promise.all(photos.map(async (p) => ({ ...p, blob: await blobToDataURL(p.blob) })))
  const tables: Record<string, unknown[]> = Object.fromEntries(TABLES.map((t, i) => [t, rows[i]]))
  return {
    app: APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    schema: db.verno,
    tables: { ...tables, photos: photoRows },
  }
}
/** Export: share sheet on iPhone, download elsewhere. Returns how it was saved. */
export async function exportBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const data = await buildBackup()
  const name = `level-up-backup-${isoInMelbourne()}.json`
  const file = new File([JSON.stringify(data)], name, { type: 'application/json' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Level Up backup' })
      await updateSettings({ lastBackupAt: Date.now() })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
      // fall through to download
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  await updateSettings({ lastBackupAt: Date.now() })
  return 'downloaded'
}

export function parseBackup(text: string): BackupFile {
  const data = JSON.parse(text) as BackupFile
  if (data?.app !== APP_ID || typeof data.tables !== 'object') throw new Error("This doesn't look like a Level Up backup file.")
  return data
}

/** Replace everything on this device with the backup. Older backups without the Kitchen tables still restore. */
export async function restoreBackup(data: BackupFile) {
  const t = data.tables
  const photos = await Promise.all(
    ((t.photos ?? []) as (Omit<Photo, 'blob'> & { blob: string })[]).map(async (p) => ({ ...p, blob: await dataURLToBlob(p.blob) })),
  )
  await db.transaction('rw', allTables(), async () => {
    await Promise.all(allTables().map((x) => x.clear()))
    for (const name of TABLES) await (db.table(name) as Table<unknown>).bulkPut(t[name] ?? [])
    await db.photos.bulkPut(photos as never[])
  })
}

export async function resetAll() {
  await db.transaction('rw', allTables(), async () => {
    await Promise.all(allTables().map((x) => x.clear()))
  })
  try {
    localStorage.removeItem('levelup.timer')
  } catch {
    // ignore
  }
}
