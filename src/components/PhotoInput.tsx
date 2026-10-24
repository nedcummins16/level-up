import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { db } from '../db/db'
import type { Photo } from '../db/types'
import type { ISODate } from '../lib/dates'
import { compressImage } from '../lib/photos'
import { Btn } from './ui'

export function PhotoThumb({ photo, onClick }: { photo: Photo; onClick?: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(photo.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [photo.blob])
  return url ? <img src={url} alt={`Progress photo ${photo.date}`} className="w-full aspect-[3/4] object-cover border-[3px] border-edge" onClick={onClick} /> : null
}

/** Add optional progress photos for a date (compressed to 1080 px JPEG). */
export function PhotoInput({ date }: { date: ISODate }) {
  const photos = useLiveQuery(() => db.photos.where('date').equals(date).toArray(), [date]) ?? []
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      for (const f of [...files]) {
        const { blob, width, height } = await compressImage(f)
        await db.photos.add({ date, blob, width, height })
      }
    } catch {
      alert('Could not read that photo.')
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }

  return (
    <div>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {photos.map((p) => (
            <div key={p.id} className="relative">
              <PhotoThumb photo={p} />
              <button
                className="absolute top-1 right-1 w-8 h-8 bg-black/70 font-pixel text-[10px]"
                aria-label="Delete photo"
                onClick={() => {
                  if (confirm('Delete this photo?')) void db.photos.delete(p.id!)
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void onFiles(e.target.files)} />
      <Btn variant="ghost" small className="w-full" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? 'Saving…' : `📷 Add photo${photos.length ? ` (${photos.length})` : ''}`}
      </Btn>
      <p className="text-xs text-muted mt-1">Optional. Stored only on this phone (and in backups).</p>
    </div>
  )
}
