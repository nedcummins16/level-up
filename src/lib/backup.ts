// Backup = one JSON file with every table. Photos are embedded as base64 JPEGs.
// Export uses the Web Share API so on iPhone you can "Save to Files" / iCloud Drive.

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

export async function buildBackup(): Promise<BackupFile> {
  const [settings, sessions, life, daily, checkins, tests, measurements, photos, appointments] = await Promise.all([
    db.settings.toArray(),
    db.sessions.toArray(),
    db.life.toArray(),
    db.daily.toArray(),
    db.checkins.toArray(),
    db.tests.toArray(),
    db.measurements.toArray(),
    db.photos.toArray(),
    db.appointments.toArray(),
  ])
  const photoRows = await Promise.all(photos.map(async (p) => ({ ...p, blob: await blobToDataURL(p.blob) })))
  return {
    app: APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    schema: db.verno,
    tables: { settings, sessions, life, daily, checkins, tests, measurements, photos: photoRows, appointments },
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

/** Replace everything on this device with the backup. */
export async function restoreBackup(data: BackupFile) {
  const t = data.tables
  const photos = await Promise.all(
    ((t.photos ?? []) as (Omit<Photo, 'blob'> & { blob: string })[]).map(async (p) => ({ ...p, blob: await dataURLToBlob(p.blob) })),
  )
  await db.transaction('rw', [db.settings, db.sessions, db.life, db.daily, db.checkins, db.tests, db.measurements, db.photos, db.appointments], async () => {
    await Promise.all([db.settings.clear(), db.sessions.clear(), db.life.clear(), db.daily.clear(), db.checkins.clear(), db.tests.clear(), db.measurements.clear(), db.photos.clear(), db.appointments.clear()])
    await db.settings.bulkPut((t.settings ?? []) as never[])
    await db.sessions.bulkPut((t.sessions ?? []) as never[])
    await db.life.bulkPut((t.life ?? []) as never[])
    await db.daily.bulkPut((t.daily ?? []) as never[])
    await db.checkins.bulkPut((t.checkins ?? []) as never[])
    await db.tests.bulkPut((t.tests ?? []) as never[])
    await db.measurements.bulkPut((t.measurements ?? []) as never[])
    await db.photos.bulkPut(photos as never[])
    await db.appointments.bulkPut((t.appointments ?? []) as never[])
  })
}

export async function resetAll() {
  await db.transaction('rw', [db.settings, db.sessions, db.life, db.daily, db.checkins, db.tests, db.measurements, db.photos, db.appointments], async () => {
    await Promise.all([db.settings.clear(), db.sessions.clear(), db.life.clear(), db.daily.clear(), db.checkins.clear(), db.tests.clear(), db.measurements.clear(), db.photos.clear(), db.appointments.clear()])
  })
  try {
    localStorage.removeItem('levelup.timer')
  } catch {
    // ignore
  }
}
