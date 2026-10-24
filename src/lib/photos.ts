// Shrink progress photos to max 1080 px JPEG before storing them on the phone.

export async function compressImage(file: File, maxSize = 1080, quality = 0.82): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await loadImage(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, width, height)
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not compress image'))), 'image/jpeg', quality))
  return { blob, width, height }
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      // Respects EXIF orientation on modern Safari/Chrome.
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // fall back below
    }
  }
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = URL.createObjectURL(file)
  })
}
